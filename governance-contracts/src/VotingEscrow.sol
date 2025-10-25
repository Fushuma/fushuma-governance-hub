// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/**
 * @title VotingEscrow
 * @notice Vote-escrowed NFT system where voting power increases over time
 * @dev Users lock FUMA tokens to receive veNFTs with linearly increasing voting power
 * 
 * Inspired by Aragon ve-governance architecture:
 * - Users lock tokens and receive ERC721 NFTs (veNFTs)
 * - Voting power starts at locked amount and increases linearly to maxMultiplier * amount
 * - Warmup period prevents flash loan attacks
 * - Exit queue with cooldown period ensures commitment
 * - All parameters are configurable by admin
 */
contract VotingEscrow is 
    Initializable,
    ERC721EnumerableUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER");

    /// @notice The FUMA token that users lock
    IERC20 public token;

    /// @notice Minimum amount that can be locked
    uint256 public minDeposit;

    /// @notice Warmup period before veNFT reaches full voting power (prevents flash loan attacks)
    uint256 public warmupPeriod;

    /// @notice Cooldown period in exit queue before withdrawal
    uint256 public cooldownPeriod;

    /// @notice Time it takes to reach maximum voting power multiplier
    uint256 public maxLockDuration;

    /// @notice Maximum voting power multiplier (e.g., 4 = 4x)
    uint256 public maxMultiplier;

    /// @notice Auto-incrementing token ID
    uint256 public lastTokenId;

    /// @notice Total amount of tokens locked across all veNFTs
    uint256 public totalLocked;

    /// @notice Lock data for each veNFT
    struct LockedBalance {
        uint256 amount;          // Amount of FUMA locked
        uint256 startTime;       // When the lock was created
        bool inExitQueue;        // Whether user has initiated exit
        uint256 exitQueueTime;   // When exit was initiated
    }

    /// @notice Mapping of token ID to locked balance
    mapping(uint256 => LockedBalance) public locked;

    event LockCreated(uint256 indexed tokenId, address indexed owner, uint256 amount, uint256 startTime);
    event LockIncreased(uint256 indexed tokenId, uint256 additionalAmount, uint256 newTotal);
    event ExitStarted(uint256 indexed tokenId, uint256 exitTime);
    event ExitCompleted(uint256 indexed tokenId, address indexed owner, uint256 amount);
    event MinDepositUpdated(uint256 oldValue, uint256 newValue);
    event WarmupPeriodUpdated(uint256 oldValue, uint256 newValue);
    event CooldownPeriodUpdated(uint256 oldValue, uint256 newValue);
    event MaxLockDurationUpdated(uint256 oldValue, uint256 newValue);
    event MaxMultiplierUpdated(uint256 oldValue, uint256 newValue);

    error InsufficientAmount();
    error NotOwnerOrApproved();
    error AlreadyInExitQueue();
    error NotInExitQueue();
    error CooldownNotComplete();
    error InvalidParameters();
    error TokenDoesNotExist();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the VotingEscrow contract
     * @param _token Address of the FUMA token
     * @param _admin Address that will have admin role
     * @param _minDeposit Minimum amount to lock (in wei)
     * @param _warmupPeriod Warmup period in seconds
     * @param _cooldownPeriod Cooldown period in seconds
     * @param _maxLockDuration Time to reach max multiplier in seconds
     * @param _maxMultiplier Maximum voting power multiplier (e.g., 4 for 4x)
     */
    function initialize(
        address _token,
        address _admin,
        uint256 _minDeposit,
        uint256 _warmupPeriod,
        uint256 _cooldownPeriod,
        uint256 _maxLockDuration,
        uint256 _maxMultiplier
    ) external initializer {
        if (_token == address(0) || _admin == address(0)) revert InvalidParameters();
        if (_maxMultiplier < 1) revert InvalidParameters();
        if (_maxLockDuration == 0) revert InvalidParameters();

        __ERC721_init("Vote-Escrowed FUMA", "veFUMA");
        __ERC721Enumerable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        token = IERC20(_token);
        minDeposit = _minDeposit;
        warmupPeriod = _warmupPeriod;
        cooldownPeriod = _cooldownPeriod;
        maxLockDuration = _maxLockDuration;
        maxMultiplier = _maxMultiplier;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    /**
     * @notice Create a new lock and mint veNFT
     * @param _amount Amount of FUMA to lock
     * @return tokenId The ID of the minted veNFT
     */
    function createLock(uint256 _amount) external nonReentrant whenNotPaused returns (uint256 tokenId) {
        if (_amount < minDeposit) revert InsufficientAmount();

        tokenId = ++lastTokenId;
        uint256 startTime = block.timestamp;

        locked[tokenId] = LockedBalance({
            amount: _amount,
            startTime: startTime,
            inExitQueue: false,
            exitQueueTime: 0
        });

        totalLocked += _amount;

        _safeMint(msg.sender, tokenId);
        token.safeTransferFrom(msg.sender, address(this), _amount);

        emit LockCreated(tokenId, msg.sender, _amount, startTime);

        return tokenId;
    }

    /**
     * @notice Increase the locked amount of a veNFT
     * @param _tokenId ID of the veNFT
     * @param _amount Additional amount to lock
     */
    function increaseAmount(uint256 _tokenId, uint256 _amount) external nonReentrant whenNotPaused {
        if (!_isAuthorized(_ownerOf(_tokenId), msg.sender, _tokenId)) revert NotOwnerOrApproved();
        
        LockedBalance storage lock = locked[_tokenId];
        if (lock.inExitQueue) revert AlreadyInExitQueue();
        if (_amount == 0) revert InsufficientAmount();

        uint256 oldAmount = lock.amount;
        lock.amount += _amount;
        totalLocked += _amount;

        token.safeTransferFrom(msg.sender, address(this), _amount);

        emit LockIncreased(_tokenId, _amount, lock.amount);
    }

    /**
     * @notice Start the exit process for a veNFT
     * @param _tokenId ID of the veNFT
     */
    function startExit(uint256 _tokenId) external nonReentrant {
        if (!_isAuthorized(_ownerOf(_tokenId), msg.sender, _tokenId)) revert NotOwnerOrApproved();
        
        LockedBalance storage lock = locked[_tokenId];
        if (lock.inExitQueue) revert AlreadyInExitQueue();

        lock.inExitQueue = true;
        lock.exitQueueTime = block.timestamp;

        emit ExitStarted(_tokenId, lock.exitQueueTime);
    }

    /**
     * @notice Complete exit and burn veNFT to receive tokens
     * @param _tokenId ID of the veNFT
     */
    function completeExit(uint256 _tokenId) external nonReentrant {
        address owner = _ownerOf(_tokenId);
        if (!_isAuthorized(owner, msg.sender, _tokenId)) revert NotOwnerOrApproved();
        
        LockedBalance storage lock = locked[_tokenId];
        if (!lock.inExitQueue) revert NotInExitQueue();
        if (block.timestamp < lock.exitQueueTime + cooldownPeriod) revert CooldownNotComplete();

        uint256 amount = lock.amount;
        totalLocked -= amount;

        _burn(_tokenId);
        delete locked[_tokenId];

        token.safeTransfer(msg.sender, amount);

        emit ExitCompleted(_tokenId, owner, amount);
    }

    /**
     * @notice Calculate voting power for a veNFT
     * @dev Voting power increases linearly from amount to (amount * maxMultiplier) over maxLockDuration
     * @param _tokenId ID of the veNFT
     * @return Voting power
     * 
     * Formula: votingPower = amount * (1 + (timeElapsed / maxLockDuration) * (maxMultiplier - 1))
     * 
     * Examples (with maxMultiplier = 4, maxLockDuration = 1 year):
     * - At lock creation: votingPower = 1000 * 1 = 1000
     * - After 3 months: votingPower = 1000 * 1.75 = 1750
     * - After 6 months: votingPower = 1000 * 2.5 = 2500
     * - After 1 year: votingPower = 1000 * 4 = 4000
     */
    function votingPower(uint256 _tokenId) public view returns (uint256) {
        LockedBalance storage lock = locked[_tokenId];
        
        // No voting power if doesn't exist
        if (lock.amount == 0) return 0;
        
        // No voting power if in exit queue
        if (lock.inExitQueue) return 0;
        
        // No voting power during warmup period
        if (block.timestamp < lock.startTime + warmupPeriod) return 0;

        uint256 timeElapsed = block.timestamp - lock.startTime;

        // If past max lock duration, return max voting power
        if (timeElapsed >= maxLockDuration) {
            return lock.amount * maxMultiplier;
        }

        // Linear increase: votingPower = amount * (1 + (timeElapsed / maxLockDuration) * (maxMultiplier - 1))
        // Using fixed point math with 1e18 precision
        uint256 progressBps = (timeElapsed * 10000) / maxLockDuration; // Progress in basis points (0-10000)
        uint256 multiplierIncrease = ((maxMultiplier - 1) * progressBps) / 10000;
        uint256 currentMultiplier = 1 + multiplierIncrease;
        
        return lock.amount * currentMultiplier;
    }

    /**
     * @notice Get total voting power across all veNFTs
     * @return Total voting power
     */
    function totalVotingPower() external view returns (uint256) {
        uint256 total = 0;
        uint256 supply = totalSupply();
        
        for (uint256 i = 0; i < supply; i++) {
            uint256 tokenId = tokenByIndex(i);
            total += votingPower(tokenId);
        }
        
        return total;
    }

    /**
     * @notice Check if an address is owner or approved for a token
     * @param _spender Address to check
     * @param _tokenId Token ID
     * @return True if approved or owner
     */
    function isApprovedOrOwner(address _spender, uint256 _tokenId) external view returns (bool) {
        address owner = _ownerOf(_tokenId);
        return _isAuthorized(owner, _spender, _tokenId);
    }

    /**
     * @notice Get locked balance info for a veNFT
     * @param _tokenId Token ID
     * @return amount Locked amount
     * @return startTime Lock start time
     * @return inExitQueue Whether in exit queue
     * @return exitQueueTime Exit queue entry time
     * @return currentVotingPower Current voting power
     */
    function getLockedBalance(uint256 _tokenId) external view returns (
        uint256 amount,
        uint256 startTime,
        bool inExitQueue,
        uint256 exitQueueTime,
        uint256 currentVotingPower
    ) {
        LockedBalance storage lock = locked[_tokenId];
        return (
            lock.amount,
            lock.startTime,
            lock.inExitQueue,
            lock.exitQueueTime,
            votingPower(_tokenId)
        );
    }

    /**
     * @notice Get all veNFT IDs owned by an address
     * @param _owner Address to check
     * @return tokenIds Array of token IDs
     */
    function tokensOfOwner(address _owner) external view returns (uint256[] memory tokenIds) {
        uint256 balance = balanceOf(_owner);
        tokenIds = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }
        
        return tokenIds;
    }

    // Admin functions

    function setMinDeposit(uint256 _newMinDeposit) external onlyRole(ADMIN_ROLE) {
        uint256 oldValue = minDeposit;
        minDeposit = _newMinDeposit;
        emit MinDepositUpdated(oldValue, _newMinDeposit);
    }

    function setWarmupPeriod(uint256 _newWarmupPeriod) external onlyRole(ADMIN_ROLE) {
        uint256 oldValue = warmupPeriod;
        warmupPeriod = _newWarmupPeriod;
        emit WarmupPeriodUpdated(oldValue, _newWarmupPeriod);
    }

    function setCooldownPeriod(uint256 _newCooldownPeriod) external onlyRole(ADMIN_ROLE) {
        uint256 oldValue = cooldownPeriod;
        cooldownPeriod = _newCooldownPeriod;
        emit CooldownPeriodUpdated(oldValue, _newCooldownPeriod);
    }

    function setMaxLockDuration(uint256 _newMaxLockDuration) external onlyRole(ADMIN_ROLE) {
        if (_newMaxLockDuration == 0) revert InvalidParameters();
        uint256 oldValue = maxLockDuration;
        maxLockDuration = _newMaxLockDuration;
        emit MaxLockDurationUpdated(oldValue, _newMaxLockDuration);
    }

    function setMaxMultiplier(uint256 _newMaxMultiplier) external onlyRole(ADMIN_ROLE) {
        if (_newMaxMultiplier < 1) revert InvalidParameters();
        uint256 oldValue = maxMultiplier;
        maxMultiplier = _newMaxMultiplier;
        emit MaxMultiplierUpdated(oldValue, _newMaxMultiplier);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Required for UUPS upgrades
    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    // Override required by Solidity
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721EnumerableUpgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

