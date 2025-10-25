// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VotingEscrow.sol";

/**
 * @title VotingEscrowV2
 * @notice Enhanced version of VotingEscrow with exit fees and minimum lock duration
 * @dev Extends the base VotingEscrow contract with additional governance mechanisms
 */
contract VotingEscrowV2 is VotingEscrow {
    /// @notice Exit fee in basis points (e.g., 100 = 1%)
    uint256 public exitFee;
    
    /// @notice Minimum lock duration in seconds
    uint256 public minLockDuration;
    
    /// @notice Maximum exit fee (10%)
    uint256 public constant MAX_EXIT_FEE = 1000;
    
    /// @notice Treasury address to receive exit fees
    address public treasury;
    
    /// @notice Mapping to track if a lock has met minimum duration
    mapping(uint256 => bool) public hasMetMinLockDuration;
    
    event ExitFeeUpdated(uint256 oldFee, uint256 newFee);
    event MinLockDurationUpdated(uint256 oldDuration, uint256 newDuration);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event ExitFeeCollected(uint256 tokenId, uint256 amount, address treasury);
    
    /**
     * @notice Initialize VotingEscrowV2
     * @param _token Address of the ERC20 token to be locked
     * @param _warmupPeriod Warmup period before voting power is active
     * @param _cooldownPeriod Cooldown period before tokens can be withdrawn
     * @param _maxMultiplier Maximum voting power multiplier
     * @param _maxDuration Duration to reach maximum multiplier
     * @param _exitFee Initial exit fee in basis points
     * @param _minLockDuration Initial minimum lock duration in seconds
     * @param _treasury Treasury address for exit fees
     */
    function initialize(
        address _token,
        uint256 _warmupPeriod,
        uint256 _cooldownPeriod,
        uint256 _maxMultiplier,
        uint256 _maxDuration,
        uint256 _exitFee,
        uint256 _minLockDuration,
        address _treasury
    ) public initializer {
        require(_exitFee <= MAX_EXIT_FEE, "Exit fee too high");
        require(_treasury != address(0), "Invalid treasury address");
        
        // Call parent initialize
        __VotingEscrow_init(
            _token,
            _warmupPeriod,
            _cooldownPeriod,
            _maxMultiplier,
            _maxDuration
        );
        
        exitFee = _exitFee;
        minLockDuration = _minLockDuration;
        treasury = _treasury;
    }
    
    /**
     * @notice Set exit fee
     * @param _exitFee New exit fee in basis points
     */
    function setExitFee(uint256 _exitFee) external onlyRole(ADMIN_ROLE) {
        require(_exitFee <= MAX_EXIT_FEE, "Exit fee too high");
        uint256 oldFee = exitFee;
        exitFee = _exitFee;
        emit ExitFeeUpdated(oldFee, _exitFee);
    }
    
    /**
     * @notice Set minimum lock duration
     * @param _minLockDuration New minimum lock duration in seconds
     */
    function setMinLockDuration(uint256 _minLockDuration) external onlyRole(ADMIN_ROLE) {
        uint256 oldDuration = minLockDuration;
        minLockDuration = _minLockDuration;
        emit MinLockDurationUpdated(oldDuration, _minLockDuration);
    }
    
    /**
     * @notice Set treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyRole(ADMIN_ROLE) {
        require(_treasury != address(0), "Invalid treasury address");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }
    
    /**
     * @notice Complete exit from the exit queue with fee deduction
     * @param _tokenId ID of the veNFT to exit
     * @dev Overrides parent completeExit to add exit fee logic
     */
    function completeExit(uint256 _tokenId) public override nonReentrant {
        ExitQueue memory exit = exitQueue[_tokenId];
        require(exit.amount > 0, "No exit in progress");
        require(block.timestamp >= exit.exitTime, "Cooldown period not over");
        require(ownerOf(_tokenId) == msg.sender, "Not the owner");
        
        Lock memory lock = locks[_tokenId];
        
        // Check if minimum lock duration has been met
        uint256 lockDuration = block.timestamp - lock.startTime;
        require(lockDuration >= minLockDuration, "Minimum lock duration not met");
        
        // Calculate exit fee
        uint256 fee = 0;
        uint256 amountToReturn = exit.amount;
        
        // Apply exit fee if configured
        if (exitFee > 0) {
            fee = (exit.amount * exitFee) / 10000;
            amountToReturn = exit.amount - fee;
            
            // Transfer fee to treasury
            if (fee > 0) {
                IERC20(token).transfer(treasury, fee);
                emit ExitFeeCollected(_tokenId, fee, treasury);
            }
        }
        
        // Clear exit queue
        delete exitQueue[_tokenId];
        
        // Burn the veNFT
        _burn(_tokenId);
        
        // Clear lock data
        delete locks[_tokenId];
        
        // Transfer tokens back to user (minus fee)
        IERC20(token).transfer(msg.sender, amountToReturn);
        
        emit ExitCompleted(_tokenId, msg.sender, amountToReturn, fee);
    }
    
    /**
     * @notice Override _createLock to track minimum lock duration compliance
     */
    function _createLock(
        address _to,
        uint256 _amount
    ) internal override returns (uint256) {
        uint256 tokenId = super._createLock(_to, _amount);
        
        // Mark that this lock needs to meet minimum duration
        hasMetMinLockDuration[tokenId] = false;
        
        return tokenId;
    }
    
    /**
     * @notice Check if a lock has met the minimum duration requirement
     * @param _tokenId ID of the veNFT
     * @return bool True if minimum duration has been met
     */
    function hasMetMinimumLockDuration(uint256 _tokenId) public view returns (bool) {
        Lock memory lock = locks[_tokenId];
        if (lock.amount == 0) return false;
        
        uint256 lockDuration = block.timestamp - lock.startTime;
        return lockDuration >= minLockDuration;
    }
    
    /**
     * @notice Get exit fee amount for a given token amount
     * @param _amount Amount of tokens
     * @return fee Exit fee amount
     */
    function calculateExitFee(uint256 _amount) public view returns (uint256) {
        return (_amount * exitFee) / 10000;
    }
    
    /**
     * @notice Get net amount after exit fee
     * @param _amount Amount of tokens
     * @return netAmount Amount after fee deduction
     */
    function getNetExitAmount(uint256 _amount) public view returns (uint256) {
        uint256 fee = calculateExitFee(_amount);
        return _amount - fee;
    }
}

