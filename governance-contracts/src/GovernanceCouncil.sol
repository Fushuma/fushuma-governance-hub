// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title GovernanceCouncil
 * @notice Multi-signature council with veto and speedup powers for governance oversight
 * @dev Council members can veto harmful proposals or fast-track critical ones
 */
contract GovernanceCouncil is Initializable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    /// @notice Role for council members who can vote on council actions
    bytes32 public constant COUNCIL_MEMBER_ROLE = keccak256("COUNCIL_MEMBER");

    /// @notice Role for managing council membership
    bytes32 public constant COUNCIL_ADMIN_ROLE = keccak256("COUNCIL_ADMIN");

    /// @notice Minimum number of approvals required for council actions
    uint256 public requiredApprovals;

    /// @notice Duration in seconds that a proposal can be vetoed after passing
    uint256 public vetoPeriod;

    /// @notice Duration in seconds that a veto action is valid for voting
    uint256 public vetoVotingPeriod;

    /// @notice Duration in seconds that a speedup action is valid for voting
    uint256 public speedupVotingPeriod;

    /// @notice Mapping of proposal ID to veto action
    mapping(uint256 => VetoAction) public vetoActions;

    /// @notice Mapping of proposal ID to speedup action
    mapping(uint256 => SpeedupAction) public speedupActions;

    /// @notice Counter for veto action IDs
    uint256 public vetoActionCount;

    /// @notice Counter for speedup action IDs
    uint256 public speedupActionCount;

    struct VetoAction {
        uint256 proposalId;
        address initiator;
        uint256 approvals;
        uint256 createdAt;
        uint256 expiresAt;
        bool executed;
        mapping(address => bool) hasApproved;
    }

    struct SpeedupAction {
        uint256 proposalId;
        address initiator;
        uint256 approvals;
        uint256 createdAt;
        uint256 expiresAt;
        uint256 newVotingPeriod; // Reduced voting period in seconds
        uint256 newTimelockDelay; // Reduced timelock delay in seconds
        bool executed;
        mapping(address => bool) hasApproved;
    }

    event VetoInitiated(uint256 indexed proposalId, address indexed initiator, uint256 expiresAt);
    event VetoApproved(uint256 indexed proposalId, address indexed approver, uint256 approvals);
    event VetoExecuted(uint256 indexed proposalId, uint256 approvals);
    event SpeedupInitiated(
        uint256 indexed proposalId,
        address indexed initiator,
        uint256 newVotingPeriod,
        uint256 newTimelockDelay,
        uint256 expiresAt
    );
    event SpeedupApproved(uint256 indexed proposalId, address indexed approver, uint256 approvals);
    event SpeedupExecuted(uint256 indexed proposalId, uint256 newVotingPeriod, uint256 newTimelockDelay);

    event RequiredApprovalsUpdated(uint256 oldValue, uint256 newValue);
    event VetoPeriodUpdated(uint256 oldValue, uint256 newValue);
    event VetoVotingPeriodUpdated(uint256 oldValue, uint256 newValue);
    event SpeedupVotingPeriodUpdated(uint256 oldValue, uint256 newValue);

    error NotCouncilMember();
    error AlreadyVetoed();
    error AlreadySpedup();
    error VetoActionExpired();
    error SpeedupActionExpired();
    error AlreadyApproved();
    error AlreadyExecuted();
    error InsufficientApprovals();
    error VetoPeriodPassed();
    error InvalidParameters();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the council contract
     * @param _admin Address that will have admin role
     * @param _requiredApprovals Number of approvals needed for council actions
     * @param _vetoPeriod Duration proposals can be vetoed after passing
     * @param _vetoVotingPeriod Duration council has to vote on veto
     * @param _speedupVotingPeriod Duration council has to vote on speedup
     */
    function initialize(
        address _admin,
        uint256 _requiredApprovals,
        uint256 _vetoPeriod,
        uint256 _vetoVotingPeriod,
        uint256 _speedupVotingPeriod
    ) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        if (_requiredApprovals == 0) revert InvalidParameters();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(COUNCIL_ADMIN_ROLE, _admin);

        requiredApprovals = _requiredApprovals;
        vetoPeriod = _vetoPeriod;
        vetoVotingPeriod = _vetoVotingPeriod;
        speedupVotingPeriod = _speedupVotingPeriod;
    }

    /**
     * @notice Initiate a veto action for a proposal
     * @param _proposalId ID of the proposal to veto
     */
    function initiateVeto(uint256 _proposalId) external onlyRole(COUNCIL_MEMBER_ROLE) nonReentrant {
        if (vetoActions[_proposalId].createdAt != 0) revert AlreadyVetoed();

        VetoAction storage action = vetoActions[_proposalId];
        action.proposalId = _proposalId;
        action.initiator = msg.sender;
        action.createdAt = block.timestamp;
        action.expiresAt = block.timestamp + vetoVotingPeriod;
        action.approvals = 1;
        action.hasApproved[msg.sender] = true;

        vetoActionCount++;

        emit VetoInitiated(_proposalId, msg.sender, action.expiresAt);
        emit VetoApproved(_proposalId, msg.sender, 1);
    }

    /**
     * @notice Approve a veto action
     * @param _proposalId ID of the proposal being vetoed
     */
    function approveVeto(uint256 _proposalId) external onlyRole(COUNCIL_MEMBER_ROLE) nonReentrant {
        VetoAction storage action = vetoActions[_proposalId];

        if (action.createdAt == 0) revert AlreadyVetoed();
        if (block.timestamp > action.expiresAt) revert VetoActionExpired();
        if (action.executed) revert AlreadyExecuted();
        if (action.hasApproved[msg.sender]) revert AlreadyApproved();

        action.hasApproved[msg.sender] = true;
        action.approvals++;

        emit VetoApproved(_proposalId, msg.sender, action.approvals);

        // Auto-execute if threshold reached
        if (action.approvals >= requiredApprovals) {
            _executeVeto(_proposalId);
        }
    }

    /**
     * @notice Execute a veto action once threshold is reached
     * @param _proposalId ID of the proposal being vetoed
     */
    function executeVeto(uint256 _proposalId) external nonReentrant {
        VetoAction storage action = vetoActions[_proposalId];

        if (action.executed) revert AlreadyExecuted();
        if (action.approvals < requiredApprovals) revert InsufficientApprovals();
        if (block.timestamp > action.expiresAt) revert VetoActionExpired();

        _executeVeto(_proposalId);
    }

    function _executeVeto(uint256 _proposalId) internal {
        VetoAction storage action = vetoActions[_proposalId];
        action.executed = true;

        emit VetoExecuted(_proposalId, action.approvals);
    }

    /**
     * @notice Initiate a speedup action for a proposal
     * @param _proposalId ID of the proposal to speedup
     * @param _newVotingPeriod Reduced voting period in seconds
     * @param _newTimelockDelay Reduced timelock delay in seconds
     */
    function initiateSpeedup(
        uint256 _proposalId,
        uint256 _newVotingPeriod,
        uint256 _newTimelockDelay
    ) external onlyRole(COUNCIL_MEMBER_ROLE) nonReentrant {
        if (speedupActions[_proposalId].createdAt != 0) revert AlreadySpedup();

        SpeedupAction storage action = speedupActions[_proposalId];
        action.proposalId = _proposalId;
        action.initiator = msg.sender;
        action.createdAt = block.timestamp;
        action.expiresAt = block.timestamp + speedupVotingPeriod;
        action.newVotingPeriod = _newVotingPeriod;
        action.newTimelockDelay = _newTimelockDelay;
        action.approvals = 1;
        action.hasApproved[msg.sender] = true;

        speedupActionCount++;

        emit SpeedupInitiated(_proposalId, msg.sender, _newVotingPeriod, _newTimelockDelay, action.expiresAt);
        emit SpeedupApproved(_proposalId, msg.sender, 1);
    }

    /**
     * @notice Approve a speedup action
     * @param _proposalId ID of the proposal being sped up
     */
    function approveSpeedup(uint256 _proposalId) external onlyRole(COUNCIL_MEMBER_ROLE) nonReentrant {
        SpeedupAction storage action = speedupActions[_proposalId];

        if (action.createdAt == 0) revert AlreadySpedup();
        if (block.timestamp > action.expiresAt) revert SpeedupActionExpired();
        if (action.executed) revert AlreadyExecuted();
        if (action.hasApproved[msg.sender]) revert AlreadyApproved();

        action.hasApproved[msg.sender] = true;
        action.approvals++;

        emit SpeedupApproved(_proposalId, msg.sender, action.approvals);

        // Auto-execute if threshold reached
        if (action.approvals >= requiredApprovals) {
            _executeSpeedup(_proposalId);
        }
    }

    /**
     * @notice Execute a speedup action once threshold is reached
     * @param _proposalId ID of the proposal being sped up
     */
    function executeSpeedup(uint256 _proposalId) external nonReentrant {
        SpeedupAction storage action = speedupActions[_proposalId];

        if (action.executed) revert AlreadyExecuted();
        if (action.approvals < requiredApprovals) revert InsufficientApprovals();
        if (block.timestamp > action.expiresAt) revert SpeedupActionExpired();

        _executeSpeedup(_proposalId);
    }

    function _executeSpeedup(uint256 _proposalId) internal {
        SpeedupAction storage action = speedupActions[_proposalId];
        action.executed = true;

        emit SpeedupExecuted(_proposalId, action.newVotingPeriod, action.newTimelockDelay);
    }

    /**
     * @notice Check if a proposal has been vetoed
     * @param _proposalId ID of the proposal
     * @return bool True if vetoed and executed
     */
    function isVetoed(uint256 _proposalId) external view returns (bool) {
        return vetoActions[_proposalId].executed;
    }

    /**
     * @notice Check if a proposal has been sped up
     * @param _proposalId ID of the proposal
     * @return bool True if speedup executed
     */
    function isSpedup(uint256 _proposalId) external view returns (bool) {
        return speedupActions[_proposalId].executed;
    }

    /**
     * @notice Get speedup parameters for a proposal
     * @param _proposalId ID of the proposal
     * @return newVotingPeriod Reduced voting period
     * @return newTimelockDelay Reduced timelock delay
     */
    function getSpeedupParams(uint256 _proposalId) external view returns (uint256 newVotingPeriod, uint256 newTimelockDelay) {
        SpeedupAction storage action = speedupActions[_proposalId];
        return (action.newVotingPeriod, action.newTimelockDelay);
    }

    /**
     * @notice Update required approvals
     * @param _newRequiredApprovals New threshold
     */
    function setRequiredApprovals(uint256 _newRequiredApprovals) external onlyRole(COUNCIL_ADMIN_ROLE) {
        if (_newRequiredApprovals == 0) revert InvalidParameters();
        uint256 oldValue = requiredApprovals;
        requiredApprovals = _newRequiredApprovals;
        emit RequiredApprovalsUpdated(oldValue, _newRequiredApprovals);
    }

    /**
     * @notice Update veto period
     * @param _newVetoPeriod New veto period in seconds
     */
    function setVetoPeriod(uint256 _newVetoPeriod) external onlyRole(COUNCIL_ADMIN_ROLE) {
        uint256 oldValue = vetoPeriod;
        vetoPeriod = _newVetoPeriod;
        emit VetoPeriodUpdated(oldValue, _newVetoPeriod);
    }

    /**
     * @notice Update veto voting period
     * @param _newVetoVotingPeriod New veto voting period in seconds
     */
    function setVetoVotingPeriod(uint256 _newVetoVotingPeriod) external onlyRole(COUNCIL_ADMIN_ROLE) {
        uint256 oldValue = vetoVotingPeriod;
        vetoVotingPeriod = _newVetoVotingPeriod;
        emit VetoVotingPeriodUpdated(oldValue, _newVetoVotingPeriod);
    }

    /**
     * @notice Update speedup voting period
     * @param _newSpeedupVotingPeriod New speedup voting period in seconds
     */
    function setSpeedupVotingPeriod(uint256 _newSpeedupVotingPeriod) external onlyRole(COUNCIL_ADMIN_ROLE) {
        uint256 oldValue = speedupVotingPeriod;
        speedupVotingPeriod = _newSpeedupVotingPeriod;
        emit SpeedupVotingPeriodUpdated(oldValue, _newSpeedupVotingPeriod);
    }

    /**
     * @notice Check if an address has approved a veto
     * @param _proposalId Proposal ID
     * @param _member Council member address
     * @return bool True if approved
     */
    function hasApprovedVeto(uint256 _proposalId, address _member) external view returns (bool) {
        return vetoActions[_proposalId].hasApproved[_member];
    }

    /**
     * @notice Check if an address has approved a speedup
     * @param _proposalId Proposal ID
     * @param _member Council member address
     * @return bool True if approved
     */
    function hasApprovedSpeedup(uint256 _proposalId, address _member) external view returns (bool) {
        return speedupActions[_proposalId].hasApproved[_member];
    }

    /// @notice Required for UUPS upgrades
    function _authorizeUpgrade(address) internal override onlyRole(COUNCIL_ADMIN_ROLE) {}
}

