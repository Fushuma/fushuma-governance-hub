// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./interfaces/IVotingEscrow.sol";
import "./interfaces/IEpochManager.sol";

/**
 * @title GaugeController
 * @notice Manages gauge voting and weight distribution
 * @dev Allows veNFT holders to vote on resource allocation across gauges
 */
contract GaugeController is 
    Initializable, 
    AccessControlUpgradeable, 
    PausableUpgradeable,
    ReentrancyGuardUpgradeable 
{
    bytes32 public constant GAUGE_ADMIN_ROLE = keccak256("GAUGE_ADMIN_ROLE");
    
    /// @notice Maximum basis points (100%)
    uint256 public constant MAX_BPS = 10000;
    
    /// @notice Voting Escrow contract
    IVotingEscrow public votingEscrow;
    
    /// @notice Epoch Manager contract
    IEpochManager public epochManager;
    
    /// @notice Gauge information
    struct GaugeInfo {
        address gaugeAddress;
        string name;
        string gaugeType; // "grant", "treasury", "parameter"
        bool isActive;
        uint256 addedAtEpoch;
    }
    
    /// @notice Vote information
    struct VoteInfo {
        uint256 weight; // Weight in basis points (0-10000)
        uint256 votingPower; // Actual voting power at time of vote
        uint256 epoch;
        uint256 timestamp;
    }
    
    /// @notice Gauge weight for an epoch
    struct GaugeWeight {
        uint256 totalVotingPower;
        uint256 relativeWeight; // Relative weight in basis points
    }
    
    /// @notice Array of all gauge IDs
    uint256[] public gaugeIds;
    
    /// @notice Mapping of gauge ID to gauge info
    mapping(uint256 => GaugeInfo) public gauges;
    
    /// @notice Mapping of gauge address to gauge ID
    mapping(address => uint256) public gaugeAddressToId;
    
    /// @notice Counter for gauge IDs
    uint256 public gaugeCount;
    
    /// @notice Mapping of veNFT ID => gauge ID => vote info
    mapping(uint256 => mapping(uint256 => VoteInfo)) public votes;
    
    /// @notice Mapping of veNFT ID => epoch => total weight allocated
    mapping(uint256 => mapping(uint256 => uint256)) public userTotalWeight;
    
    /// @notice Mapping of gauge ID => epoch => gauge weight
    mapping(uint256 => mapping(uint256 => GaugeWeight)) public gaugeWeights;
    
    /// @notice Mapping of epoch => total voting power
    mapping(uint256 => uint256) public epochTotalVotingPower;
    
    /// @notice Mapping of epoch => finalized status
    mapping(uint256 => bool) public epochFinalized;
    
    event GaugeAdded(uint256 indexed gaugeId, address indexed gaugeAddress, string name, string gaugeType);
    event GaugeDeactivated(uint256 indexed gaugeId);
    event GaugeActivated(uint256 indexed gaugeId);
    event VoteCast(uint256 indexed veNftId, uint256 indexed gaugeId, uint256 weight, uint256 votingPower, uint256 epoch);
    event VoteChanged(uint256 indexed veNftId, uint256 indexed gaugeId, uint256 oldWeight, uint256 newWeight, uint256 epoch);
    event WeightsFinalized(uint256 indexed epoch, uint256 totalVotingPower);
    event GaugeWeightCalculated(uint256 indexed gaugeId, uint256 indexed epoch, uint256 votingPower, uint256 relativeWeight);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the gauge controller
     * @param _votingEscrow Address of VotingEscrow contract
     * @param _epochManager Address of EpochManager contract
     */
    function initialize(
        address _votingEscrow,
        address _epochManager
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        
        require(_votingEscrow != address(0), "Invalid voting escrow");
        require(_epochManager != address(0), "Invalid epoch manager");
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GAUGE_ADMIN_ROLE, msg.sender);
        
        votingEscrow = IVotingEscrow(_votingEscrow);
        epochManager = IEpochManager(_epochManager);
        gaugeCount = 0;
    }
    
    /**
     * @notice Add a new gauge
     * @param _gaugeAddress Address of the gauge contract
     * @param _name Name of the gauge
     * @param _gaugeType Type of gauge
     */
    function addGauge(
        address _gaugeAddress,
        string memory _name,
        string memory _gaugeType
    ) external onlyRole(GAUGE_ADMIN_ROLE) returns (uint256) {
        require(_gaugeAddress != address(0), "Invalid gauge address");
        require(gaugeAddressToId[_gaugeAddress] == 0, "Gauge already exists");
        require(bytes(_name).length > 0, "Name required");
        
        gaugeCount++;
        uint256 gaugeId = gaugeCount;
        
        gauges[gaugeId] = GaugeInfo({
            gaugeAddress: _gaugeAddress,
            name: _name,
            gaugeType: _gaugeType,
            isActive: true,
            addedAtEpoch: epochManager.getCurrentEpoch()
        });
        
        gaugeIds.push(gaugeId);
        gaugeAddressToId[_gaugeAddress] = gaugeId;
        
        emit GaugeAdded(gaugeId, _gaugeAddress, _name, _gaugeType);
        
        return gaugeId;
    }
    
    /**
     * @notice Deactivate a gauge
     * @param _gaugeId ID of the gauge
     */
    function deactivateGauge(uint256 _gaugeId) external onlyRole(GAUGE_ADMIN_ROLE) {
        require(gauges[_gaugeId].gaugeAddress != address(0), "Gauge does not exist");
        require(gauges[_gaugeId].isActive, "Gauge already inactive");
        
        gauges[_gaugeId].isActive = false;
        emit GaugeDeactivated(_gaugeId);
    }
    
    /**
     * @notice Activate a gauge
     * @param _gaugeId ID of the gauge
     */
    function activateGauge(uint256 _gaugeId) external onlyRole(GAUGE_ADMIN_ROLE) {
        require(gauges[_gaugeId].gaugeAddress != address(0), "Gauge does not exist");
        require(!gauges[_gaugeId].isActive, "Gauge already active");
        
        gauges[_gaugeId].isActive = true;
        emit GaugeActivated(_gaugeId);
    }
    
    /**
     * @notice Vote for gauges with veNFT
     * @param _veNftId ID of the veNFT
     * @param _gaugeIds Array of gauge IDs to vote for
     * @param _weights Array of weights (in basis points, must sum to 10000)
     */
    function vote(
        uint256 _veNftId,
        uint256[] memory _gaugeIds,
        uint256[] memory _weights
    ) external nonReentrant whenNotPaused {
        require(_gaugeIds.length == _weights.length, "Array length mismatch");
        require(_gaugeIds.length > 0, "Must vote for at least one gauge");
        require(votingEscrow.ownerOf(_veNftId) == msg.sender, "Not veNFT owner");
        require(epochManager.isVotingPeriod(), "Not in voting period");
        
        uint256 currentEpoch = epochManager.getCurrentEpoch();
        uint256 votingPower = votingEscrow.getVotingPower(_veNftId);
        require(votingPower > 0, "No voting power");
        
        // Validate total weight
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < _weights.length; i++) {
            totalWeight += _weights[i];
        }
        require(totalWeight == MAX_BPS, "Weights must sum to 10000");
        
        // Clear old votes for this epoch
        _clearVotes(_veNftId, currentEpoch);
        
        // Cast new votes
        for (uint256 i = 0; i < _gaugeIds.length; i++) {
            uint256 gaugeId = _gaugeIds[i];
            uint256 weight = _weights[i];
            
            require(gauges[gaugeId].gaugeAddress != address(0), "Gauge does not exist");
            require(gauges[gaugeId].isActive, "Gauge is not active");
            require(weight > 0, "Weight must be positive");
            
            // Record vote
            votes[_veNftId][gaugeId] = VoteInfo({
                weight: weight,
                votingPower: votingPower,
                epoch: currentEpoch,
                timestamp: block.timestamp
            });
            
            // Update gauge weight
            uint256 weightedPower = (votingPower * weight) / MAX_BPS;
            gaugeWeights[gaugeId][currentEpoch].totalVotingPower += weightedPower;
            
            emit VoteCast(_veNftId, gaugeId, weight, votingPower, currentEpoch);
        }
        
        // Record user's total weight
        userTotalWeight[_veNftId][currentEpoch] = MAX_BPS;
        
        // Update epoch total
        epochTotalVotingPower[currentEpoch] += votingPower;
    }
    
    /**
     * @notice Clear votes for a veNFT in an epoch
     * @param _veNftId ID of the veNFT
     * @param _epoch Epoch number
     */
    function _clearVotes(uint256 _veNftId, uint256 _epoch) internal {
        // Only clear if user has voted in this epoch
        if (userTotalWeight[_veNftId][_epoch] == 0) {
            return;
        }
        
        uint256 oldVotingPower = 0;
        
        // Iterate through all gauges and clear votes
        for (uint256 i = 0; i < gaugeIds.length; i++) {
            uint256 gaugeId = gaugeIds[i];
            VoteInfo memory voteInfo = votes[_veNftId][gaugeId];
            
            if (voteInfo.epoch == _epoch && voteInfo.weight > 0) {
                // Subtract from gauge weight
                uint256 weightedPower = (voteInfo.votingPower * voteInfo.weight) / MAX_BPS;
                gaugeWeights[gaugeId][_epoch].totalVotingPower -= weightedPower;
                
                oldVotingPower = voteInfo.votingPower;
                
                // Clear vote
                delete votes[_veNftId][gaugeId];
            }
        }
        
        // Subtract from epoch total
        if (oldVotingPower > 0) {
            epochTotalVotingPower[_epoch] -= oldVotingPower;
        }
        
        // Clear user total weight
        userTotalWeight[_veNftId][_epoch] = 0;
    }
    
    /**
     * @notice Finalize weights for an epoch
     * @param _epoch Epoch to finalize
     */
    function finalizeEpochWeights(uint256 _epoch) external onlyRole(GAUGE_ADMIN_ROLE) {
        require(_epoch <= epochManager.getCurrentEpoch(), "Cannot finalize future epoch");
        require(!epochFinalized[_epoch], "Epoch already finalized");
        require(!epochManager.isVotingPeriod() || _epoch < epochManager.getCurrentEpoch(), "Voting still active");
        
        uint256 totalPower = epochTotalVotingPower[_epoch];
        
        // Calculate relative weights
        for (uint256 i = 0; i < gaugeIds.length; i++) {
            uint256 gaugeId = gaugeIds[i];
            uint256 gaugePower = gaugeWeights[gaugeId][_epoch].totalVotingPower;
            
            uint256 relativeWeight = 0;
            if (totalPower > 0) {
                relativeWeight = (gaugePower * MAX_BPS) / totalPower;
            }
            
            gaugeWeights[gaugeId][_epoch].relativeWeight = relativeWeight;
            
            emit GaugeWeightCalculated(gaugeId, _epoch, gaugePower, relativeWeight);
        }
        
        epochFinalized[_epoch] = true;
        emit WeightsFinalized(_epoch, totalPower);
    }
    
    /**
     * @notice Get gauge weight for an epoch
     * @param _gaugeId Gauge ID
     * @param _epoch Epoch number
     * @return Gauge weight info
     */
    function getGaugeWeight(uint256 _gaugeId, uint256 _epoch) external view returns (GaugeWeight memory) {
        return gaugeWeights[_gaugeId][_epoch];
    }
    
    /**
     * @notice Get user's vote for a gauge
     * @param _veNftId veNFT ID
     * @param _gaugeId Gauge ID
     * @return Vote info
     */
    function getUserVote(uint256 _veNftId, uint256 _gaugeId) external view returns (VoteInfo memory) {
        return votes[_veNftId][_gaugeId];
    }
    
    /**
     * @notice Get all active gauges
     * @return Array of gauge IDs
     */
    function getActiveGauges() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // Count active gauges
        for (uint256 i = 0; i < gaugeIds.length; i++) {
            if (gauges[gaugeIds[i]].isActive) {
                activeCount++;
            }
        }
        
        // Build array
        uint256[] memory activeGauges = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < gaugeIds.length; i++) {
            if (gauges[gaugeIds[i]].isActive) {
                activeGauges[index] = gaugeIds[i];
                index++;
            }
        }
        
        return activeGauges;
    }
    
    /**
     * @notice Get gauge info
     * @param _gaugeId Gauge ID
     * @return Gauge info
     */
    function getGaugeInfo(uint256 _gaugeId) external view returns (GaugeInfo memory) {
        return gauges[_gaugeId];
    }
    
    /**
     * @notice Check if user has voted in current epoch
     * @param _veNftId veNFT ID
     * @return True if user has voted
     */
    function hasVoted(uint256 _veNftId) external view returns (bool) {
        uint256 currentEpoch = epochManager.getCurrentEpoch();
        return userTotalWeight[_veNftId][currentEpoch] > 0;
    }
    
    /**
     * @notice Pause the contract
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}

