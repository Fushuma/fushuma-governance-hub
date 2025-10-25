// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Gauge.sol";

/**
 * @title GrantGauge
 * @notice Gauge for distributing funds to development grants
 * @dev Extends base Gauge with grant-specific functionality
 */
contract GrantGauge is Gauge {
    /// @notice Grant information
    struct Grant {
        address recipient;
        uint256 totalAmount;
        uint256 claimedAmount;
        uint256 startEpoch;
        uint256 vestingEpochs;
        bool isActive;
        string metadata; // IPFS hash or JSON
    }
    
    /// @notice Mapping of grant ID to grant info
    mapping(uint256 => Grant) public grants;
    
    /// @notice Counter for grant IDs
    uint256 public grantCount;
    
    /// @notice Mapping of grant ID to epoch => claimable amount
    mapping(uint256 => mapping(uint256 => uint256)) public grantEpochAllocation;
    
    event GrantCreated(uint256 indexed grantId, address indexed recipient, uint256 totalAmount, uint256 vestingEpochs);
    event GrantClaimed(uint256 indexed grantId, uint256 indexed epoch, address indexed recipient, uint256 amount);
    event GrantCancelled(uint256 indexed grantId);
    event GrantUpdated(uint256 indexed grantId, string metadata);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the grant gauge
     * @param _gaugeController Address of GaugeController
     * @param _epochManager Address of EpochManager
     * @param _token Address of distribution token
     * @param _gaugeId Gauge ID in controller
     * @param _name Gauge name
     */
    function initialize(
        address _gaugeController,
        address _epochManager,
        address _token,
        uint256 _gaugeId,
        string memory _name
    ) public initializer {
        __Gauge_init(
            _gaugeController,
            _epochManager,
            _token,
            _gaugeId,
            _name,
            "grant"
        );
        
        grantCount = 0;
    }
    
    /**
     * @notice Create a new grant
     * @param _recipient Recipient address
     * @param _totalAmount Total grant amount
     * @param _vestingEpochs Number of epochs for vesting
     * @param _metadata Grant metadata (IPFS hash or JSON)
     * @return Grant ID
     */
    function createGrant(
        address _recipient,
        uint256 _totalAmount,
        uint256 _vestingEpochs,
        string memory _metadata
    ) external onlyRole(GAUGE_ADMIN_ROLE) returns (uint256) {
        require(_recipient != address(0), "Invalid recipient");
        require(_totalAmount > 0, "Amount must be positive");
        require(_vestingEpochs > 0, "Vesting epochs must be positive");
        
        grantCount++;
        uint256 grantId = grantCount;
        uint256 currentEpoch = epochManager.getCurrentEpoch();
        
        grants[grantId] = Grant({
            recipient: _recipient,
            totalAmount: _totalAmount,
            claimedAmount: 0,
            startEpoch: currentEpoch + 1, // Start next epoch
            vestingEpochs: _vestingEpochs,
            isActive: true,
            metadata: _metadata
        });
        
        emit GrantCreated(grantId, _recipient, _totalAmount, _vestingEpochs);
        
        return grantId;
    }
    
    /**
     * @notice Calculate claimable amount for a grant in an epoch
     * @param _grantId Grant ID
     * @param _epoch Epoch number
     * @return Claimable amount
     */
    function getClaimableAmount(uint256 _grantId, uint256 _epoch) public view returns (uint256) {
        Grant memory grant = grants[_grantId];
        
        if (!grant.isActive) {
            return 0;
        }
        
        if (_epoch < grant.startEpoch) {
            return 0;
        }
        
        uint256 epochsSinceStart = _epoch - grant.startEpoch;
        if (epochsSinceStart >= grant.vestingEpochs) {
            // All vested
            return grant.totalAmount - grant.claimedAmount;
        }
        
        // Calculate vested amount
        uint256 vestedAmount = (grant.totalAmount * (epochsSinceStart + 1)) / grant.vestingEpochs;
        uint256 claimable = vestedAmount - grant.claimedAmount;
        
        // Check if gauge has received distribution for this epoch
        Distribution memory dist = distributions[_epoch];
        if (dist.amount == 0) {
            return 0;
        }
        
        // Limit to available gauge balance
        uint256 available = getAvailableBalance();
        if (claimable > available) {
            claimable = available;
        }
        
        return claimable;
    }
    
    /**
     * @notice Claim grant funds for an epoch
     * @param _grantId Grant ID
     * @param _epoch Epoch to claim for
     */
    function claimGrant(uint256 _grantId, uint256 _epoch) external nonReentrant {
        Grant storage grant = grants[_grantId];
        
        require(grant.isActive, "Grant not active");
        require(grant.recipient == msg.sender, "Not grant recipient");
        require(_epoch <= epochManager.getCurrentEpoch(), "Cannot claim future epoch");
        require(grantEpochAllocation[_grantId][_epoch] == 0, "Already claimed for this epoch");
        
        uint256 claimable = getClaimableAmount(_grantId, _epoch);
        require(claimable > 0, "Nothing to claim");
        
        // Record claim
        grant.claimedAmount += claimable;
        grantEpochAllocation[_grantId][_epoch] = claimable;
        totalClaimed += claimable;
        
        // Mark distribution as claimed if fully claimed
        if (distributions[_epoch].amount > 0 && !distributions[_epoch].claimed) {
            distributions[_epoch].claimed = true;
        }
        
        // Transfer tokens
        _beforeClaim(_epoch, msg.sender, claimable);
        token.safeTransfer(msg.sender, claimable);
        _afterClaim(_epoch, msg.sender, claimable);
        
        emit GrantClaimed(_grantId, _epoch, msg.sender, claimable);
        emit DistributionClaimed(_epoch, msg.sender, claimable);
    }
    
    /**
     * @notice Cancel a grant
     * @param _grantId Grant ID
     */
    function cancelGrant(uint256 _grantId) external onlyRole(GAUGE_ADMIN_ROLE) {
        require(grants[_grantId].isActive, "Grant not active");
        
        grants[_grantId].isActive = false;
        
        emit GrantCancelled(_grantId);
    }
    
    /**
     * @notice Update grant metadata
     * @param _grantId Grant ID
     * @param _metadata New metadata
     */
    function updateGrantMetadata(uint256 _grantId, string memory _metadata) external onlyRole(GAUGE_ADMIN_ROLE) {
        require(grants[_grantId].totalAmount > 0, "Grant does not exist");
        
        grants[_grantId].metadata = _metadata;
        
        emit GrantUpdated(_grantId, _metadata);
    }
    
    /**
     * @notice Get grant info
     * @param _grantId Grant ID
     * @return Grant info
     */
    function getGrant(uint256 _grantId) external view returns (Grant memory) {
        return grants[_grantId];
    }
    
    /**
     * @notice Get all active grants
     * @return Array of grant IDs
     */
    function getActiveGrants() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // Count active grants
        for (uint256 i = 1; i <= grantCount; i++) {
            if (grants[i].isActive) {
                activeCount++;
            }
        }
        
        // Build array
        uint256[] memory activeGrants = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= grantCount; i++) {
            if (grants[i].isActive) {
                activeGrants[index] = i;
                index++;
            }
        }
        
        return activeGrants;
    }
    
    /**
     * @notice Get total unclaimed amount for a grant
     * @param _grantId Grant ID
     * @return Unclaimed amount
     */
    function getGrantUnclaimedAmount(uint256 _grantId) external view returns (uint256) {
        Grant memory grant = grants[_grantId];
        return grant.totalAmount - grant.claimedAmount;
    }
    
    /**
     * @notice Override distribution received hook
     * @param _epoch Epoch number
     * @param _amount Amount received
     * @param _weight Gauge weight
     */
    function _onDistributionReceived(
        uint256 _epoch,
        uint256 _amount,
        uint256 _weight
    ) internal override {
        // Custom logic for grant distribution
        // Could allocate to specific grants based on priority
    }
}

