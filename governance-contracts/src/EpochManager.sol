// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/**
 * @title EpochManager
 * @notice Manages governance epochs with fixed durations and phases
 * @dev Implements a 14-day epoch cycle with voting, distribution, and preparation phases
 */
contract EpochManager is Initializable, AccessControlUpgradeable, PausableUpgradeable {
    /// @notice Duration of each epoch (14 days)
    uint256 public constant EPOCH_DURATION = 14 days;
    
    /// @notice Duration of voting period within epoch (7 days)
    uint256 public constant VOTING_DURATION = 7 days;
    
    /// @notice Duration of distribution period (1 day)
    uint256 public constant DISTRIBUTION_DURATION = 1 day;
    
    /// @notice Admin role for epoch management
    bytes32 public constant EPOCH_ADMIN_ROLE = keccak256("EPOCH_ADMIN_ROLE");
    
    /// @notice Timestamp when epoch system started
    uint256 public startTime;
    
    /// @notice Current epoch number
    uint256 public currentEpoch;
    
    /// @notice Mapping of epoch number to epoch data
    mapping(uint256 => EpochData) public epochs;
    
    /// @notice Epoch data structure
    struct EpochData {
        uint256 startTime;
        uint256 endTime;
        uint256 votingStartTime;
        uint256 votingEndTime;
        uint256 distributionTime;
        uint256 totalVotingPower;
        uint256 totalDistributed;
        bool finalized;
    }
    
    /// @notice Phase enum
    enum Phase {
        Preparation,  // New proposals can be created
        Voting,       // Active voting period
        Distribution  // Distribution and execution
    }
    
    event EpochStarted(uint256 indexed epoch, uint256 startTime, uint256 endTime);
    event EpochFinalized(uint256 indexed epoch, uint256 totalVotingPower, uint256 totalDistributed);
    event PhaseChanged(uint256 indexed epoch, Phase phase, uint256 timestamp);
    event VotingPowerRecorded(uint256 indexed epoch, uint256 votingPower);
    event DistributionRecorded(uint256 indexed epoch, uint256 amount);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the epoch manager
     * @param _startTime Timestamp when first epoch starts
     */
    function initialize(uint256 _startTime) public initializer {
        __AccessControl_init();
        __Pausable_init();
        
        require(_startTime >= block.timestamp, "Start time must be in future");
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EPOCH_ADMIN_ROLE, msg.sender);
        
        startTime = _startTime;
        currentEpoch = 0;
        
        // Initialize first epoch
        _initializeEpoch(0);
    }
    
    /**
     * @notice Get the current epoch number
     * @return Current epoch number
     */
    function getCurrentEpoch() public view returns (uint256) {
        if (block.timestamp < startTime) {
            return 0;
        }
        return (block.timestamp - startTime) / EPOCH_DURATION;
    }
    
    /**
     * @notice Get epoch start time
     * @param _epoch Epoch number
     * @return Start timestamp
     */
    function getEpochStartTime(uint256 _epoch) public view returns (uint256) {
        return startTime + (_epoch * EPOCH_DURATION);
    }
    
    /**
     * @notice Get epoch end time
     * @param _epoch Epoch number
     * @return End timestamp
     */
    function getEpochEndTime(uint256 _epoch) public view returns (uint256) {
        return getEpochStartTime(_epoch) + EPOCH_DURATION;
    }
    
    /**
     * @notice Get voting start time for epoch
     * @param _epoch Epoch number
     * @return Voting start timestamp
     */
    function getVotingStartTime(uint256 _epoch) public view returns (uint256) {
        return getEpochStartTime(_epoch);
    }
    
    /**
     * @notice Get voting end time for epoch
     * @param _epoch Epoch number
     * @return Voting end timestamp
     */
    function getVotingEndTime(uint256 _epoch) public view returns (uint256) {
        return getVotingStartTime(_epoch) + VOTING_DURATION;
    }
    
    /**
     * @notice Get distribution time for epoch
     * @param _epoch Epoch number
     * @return Distribution timestamp
     */
    function getDistributionTime(uint256 _epoch) public view returns (uint256) {
        return getVotingEndTime(_epoch);
    }
    
    /**
     * @notice Check if currently in voting period
     * @return True if in voting period
     */
    function isVotingPeriod() public view returns (bool) {
        uint256 epoch = getCurrentEpoch();
        uint256 votingStart = getVotingStartTime(epoch);
        uint256 votingEnd = getVotingEndTime(epoch);
        return block.timestamp >= votingStart && block.timestamp < votingEnd;
    }
    
    /**
     * @notice Check if currently in distribution period
     * @return True if in distribution period
     */
    function isDistributionPeriod() public view returns (bool) {
        uint256 epoch = getCurrentEpoch();
        uint256 distributionStart = getDistributionTime(epoch);
        uint256 distributionEnd = distributionStart + DISTRIBUTION_DURATION;
        return block.timestamp >= distributionStart && block.timestamp < distributionEnd;
    }
    
    /**
     * @notice Check if currently in preparation period
     * @return True if in preparation period
     */
    function isPreparationPeriod() public view returns (bool) {
        return !isVotingPeriod() && !isDistributionPeriod();
    }
    
    /**
     * @notice Get current phase
     * @return Current phase
     */
    function getCurrentPhase() public view returns (Phase) {
        if (isVotingPeriod()) {
            return Phase.Voting;
        } else if (isDistributionPeriod()) {
            return Phase.Distribution;
        } else {
            return Phase.Preparation;
        }
    }
    
    /**
     * @notice Get epoch data
     * @param _epoch Epoch number
     * @return Epoch data
     */
    function getEpochData(uint256 _epoch) public view returns (EpochData memory) {
        if (epochs[_epoch].startTime == 0) {
            // Return computed data for uninitialized epochs
            return EpochData({
                startTime: getEpochStartTime(_epoch),
                endTime: getEpochEndTime(_epoch),
                votingStartTime: getVotingStartTime(_epoch),
                votingEndTime: getVotingEndTime(_epoch),
                distributionTime: getDistributionTime(_epoch),
                totalVotingPower: 0,
                totalDistributed: 0,
                finalized: false
            });
        }
        return epochs[_epoch];
    }
    
    /**
     * @notice Advance to next epoch if current epoch has ended
     * @dev Can be called by anyone, but only advances if time has passed
     */
    function advanceEpoch() external whenNotPaused {
        uint256 calculatedEpoch = getCurrentEpoch();
        require(calculatedEpoch > currentEpoch, "Current epoch not ended");
        
        // Finalize current epoch if not already done
        if (!epochs[currentEpoch].finalized) {
            _finalizeEpoch(currentEpoch);
        }
        
        // Move to next epoch
        currentEpoch = calculatedEpoch;
        
        // Initialize new epoch if needed
        if (epochs[currentEpoch].startTime == 0) {
            _initializeEpoch(currentEpoch);
        }
        
        emit EpochStarted(currentEpoch, getEpochStartTime(currentEpoch), getEpochEndTime(currentEpoch));
        emit PhaseChanged(currentEpoch, getCurrentPhase(), block.timestamp);
    }
    
    /**
     * @notice Record voting power for current epoch
     * @param _votingPower Voting power to add
     */
    function recordVotingPower(uint256 _votingPower) external onlyRole(EPOCH_ADMIN_ROLE) {
        uint256 epoch = getCurrentEpoch();
        epochs[epoch].totalVotingPower += _votingPower;
        emit VotingPowerRecorded(epoch, _votingPower);
    }
    
    /**
     * @notice Record distribution for current epoch
     * @param _amount Amount distributed
     */
    function recordDistribution(uint256 _amount) external onlyRole(EPOCH_ADMIN_ROLE) {
        uint256 epoch = getCurrentEpoch();
        require(isDistributionPeriod(), "Not in distribution period");
        epochs[epoch].totalDistributed += _amount;
        emit DistributionRecorded(epoch, _amount);
    }
    
    /**
     * @notice Finalize an epoch
     * @param _epoch Epoch to finalize
     */
    function finalizeEpoch(uint256 _epoch) external onlyRole(EPOCH_ADMIN_ROLE) {
        require(_epoch < getCurrentEpoch(), "Cannot finalize current or future epoch");
        require(!epochs[_epoch].finalized, "Epoch already finalized");
        _finalizeEpoch(_epoch);
    }
    
    /**
     * @notice Internal function to initialize an epoch
     * @param _epoch Epoch number
     */
    function _initializeEpoch(uint256 _epoch) internal {
        epochs[_epoch] = EpochData({
            startTime: getEpochStartTime(_epoch),
            endTime: getEpochEndTime(_epoch),
            votingStartTime: getVotingStartTime(_epoch),
            votingEndTime: getVotingEndTime(_epoch),
            distributionTime: getDistributionTime(_epoch),
            totalVotingPower: 0,
            totalDistributed: 0,
            finalized: false
        });
    }
    
    /**
     * @notice Internal function to finalize an epoch
     * @param _epoch Epoch number
     */
    function _finalizeEpoch(uint256 _epoch) internal {
        epochs[_epoch].finalized = true;
        emit EpochFinalized(_epoch, epochs[_epoch].totalVotingPower, epochs[_epoch].totalDistributed);
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
    
    /**
     * @notice Get time remaining in current phase
     * @return Seconds remaining
     */
    function getTimeRemainingInPhase() public view returns (uint256) {
        Phase phase = getCurrentPhase();
        uint256 epoch = getCurrentEpoch();
        
        if (phase == Phase.Voting) {
            return getVotingEndTime(epoch) - block.timestamp;
        } else if (phase == Phase.Distribution) {
            return (getDistributionTime(epoch) + DISTRIBUTION_DURATION) - block.timestamp;
        } else {
            return getEpochEndTime(epoch) - block.timestamp;
        }
    }
    
    /**
     * @notice Check if a specific epoch is active
     * @param _epoch Epoch number
     * @return True if epoch is active
     */
    function isEpochActive(uint256 _epoch) public view returns (bool) {
        return _epoch == getCurrentEpoch();
    }
}

