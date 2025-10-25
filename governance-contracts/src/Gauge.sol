// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "./interfaces/IGaugeController.sol";
import "./interfaces/IEpochManager.sol";

/**
 * @title Gauge
 * @notice Base contract for resource allocation gauges
 * @dev Receives allocated resources based on gauge weight from controller
 */
abstract contract Gauge is 
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    
    bytes32 public constant GAUGE_ADMIN_ROLE = keccak256("GAUGE_ADMIN_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    
    /// @notice Gauge Controller contract
    IGaugeController public gaugeController;
    
    /// @notice Epoch Manager contract
    IEpochManager public epochManager;
    
    /// @notice Token used for distributions
    IERC20Upgradeable public token;
    
    /// @notice Gauge ID in the controller
    uint256 public gaugeId;
    
    /// @notice Gauge name
    string public name;
    
    /// @notice Gauge type
    string public gaugeType;
    
    /// @notice Distribution record
    struct Distribution {
        uint256 epoch;
        uint256 amount;
        uint256 weight;
        uint256 timestamp;
        bool claimed;
    }
    
    /// @notice Mapping of epoch => distribution
    mapping(uint256 => Distribution) public distributions;
    
    /// @notice Total distributed amount
    uint256 public totalDistributed;
    
    /// @notice Total claimed amount
    uint256 public totalClaimed;
    
    event DistributionReceived(uint256 indexed epoch, uint256 amount, uint256 weight);
    event DistributionClaimed(uint256 indexed epoch, address indexed recipient, uint256 amount);
    event GaugeInitialized(uint256 indexed gaugeId, string name, string gaugeType);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the gauge
     * @param _gaugeController Address of GaugeController
     * @param _epochManager Address of EpochManager
     * @param _token Address of distribution token
     * @param _gaugeId Gauge ID in controller
     * @param _name Gauge name
     * @param _gaugeType Gauge type
     */
    function __Gauge_init(
        address _gaugeController,
        address _epochManager,
        address _token,
        uint256 _gaugeId,
        string memory _name,
        string memory _gaugeType
    ) internal onlyInitializing {
        __AccessControl_init();
        __ReentrancyGuard_init();
        
        require(_gaugeController != address(0), "Invalid controller");
        require(_epochManager != address(0), "Invalid epoch manager");
        require(_token != address(0), "Invalid token");
        require(bytes(_name).length > 0, "Name required");
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GAUGE_ADMIN_ROLE, msg.sender);
        _grantRole(DISTRIBUTOR_ROLE, _gaugeController);
        
        gaugeController = IGaugeController(_gaugeController);
        epochManager = IEpochManager(_epochManager);
        token = IERC20Upgradeable(_token);
        gaugeId = _gaugeId;
        name = _name;
        gaugeType = _gaugeType;
        
        emit GaugeInitialized(_gaugeId, _name, _gaugeType);
    }
    
    /**
     * @notice Receive distribution for an epoch
     * @param _epoch Epoch number
     * @param _amount Amount to distribute
     * @param _weight Gauge weight for the epoch
     */
    function receiveDistribution(
        uint256 _epoch,
        uint256 _amount,
        uint256 _weight
    ) external onlyRole(DISTRIBUTOR_ROLE) nonReentrant {
        require(_amount > 0, "Amount must be positive");
        require(distributions[_epoch].amount == 0, "Distribution already received");
        
        distributions[_epoch] = Distribution({
            epoch: _epoch,
            amount: _amount,
            weight: _weight,
            timestamp: block.timestamp,
            claimed: false
        });
        
        totalDistributed += _amount;
        
        // Transfer tokens to gauge
        token.safeTransferFrom(msg.sender, address(this), _amount);
        
        emit DistributionReceived(_epoch, _amount, _weight);
        
        // Call hook for custom logic
        _onDistributionReceived(_epoch, _amount, _weight);
    }
    
    /**
     * @notice Get distribution for an epoch
     * @param _epoch Epoch number
     * @return Distribution info
     */
    function getDistribution(uint256 _epoch) external view returns (Distribution memory) {
        return distributions[_epoch];
    }
    
    /**
     * @notice Get available balance
     * @return Available token balance
     */
    function getAvailableBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }
    
    /**
     * @notice Get unclaimed amount
     * @return Unclaimed amount
     */
    function getUnclaimedAmount() public view returns (uint256) {
        return totalDistributed - totalClaimed;
    }
    
    /**
     * @notice Hook called when distribution is received
     * @param _epoch Epoch number
     * @param _amount Amount received
     * @param _weight Gauge weight
     */
    function _onDistributionReceived(
        uint256 _epoch,
        uint256 _amount,
        uint256 _weight
    ) internal virtual {
        // Override in derived contracts for custom logic
    }
    
    /**
     * @notice Hook called before claiming
     * @param _epoch Epoch number
     * @param _recipient Recipient address
     * @param _amount Amount to claim
     */
    function _beforeClaim(
        uint256 _epoch,
        address _recipient,
        uint256 _amount
    ) internal virtual {
        // Override in derived contracts for custom logic
    }
    
    /**
     * @notice Hook called after claiming
     * @param _epoch Epoch number
     * @param _recipient Recipient address
     * @param _amount Amount claimed
     */
    function _afterClaim(
        uint256 _epoch,
        address _recipient,
        uint256 _amount
    ) internal virtual {
        // Override in derived contracts for custom logic
    }
    
    /**
     * @notice Emergency withdraw tokens
     * @param _token Token to withdraw
     * @param _to Recipient address
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(
        address _token,
        address _to,
        uint256 _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_to != address(0), "Invalid recipient");
        IERC20Upgradeable(_token).safeTransfer(_to, _amount);
    }
}

