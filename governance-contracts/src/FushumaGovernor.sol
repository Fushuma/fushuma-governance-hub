// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IVotingEscrow} from "./interfaces/IVotingEscrow.sol";
import {GovernanceCouncil} from "./GovernanceCouncil.sol";

/**
 * @title FushumaGovernor
 * @notice Governance contract for Fushuma with veNFT voting and council oversight
 * @dev Integrates vote-escrowed NFTs with council veto and speedup mechanisms
 */
contract FushumaGovernor is Initializable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    /// @notice Role for executing proposals
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR");

    /// @notice Role for governance administration
    bytes32 public constant GOVERNANCE_ADMIN_ROLE = keccak256("GOVERNANCE_ADMIN");

    /// @notice Address of the voting escrow contract
    address public escrow;

    /// @notice Address of the governance council
    address public council;

    /// @notice Minimum voting power required to create a proposal
    uint256 public proposalThreshold;

    /// @notice Minimum percentage of total voting power required for quorum (in basis points, e.g., 1000 = 10%)
    uint256 public quorumBps;

    /// @notice Default voting period in seconds
    uint256 public votingPeriod;

    /// @notice Delay before voting starts after proposal creation
    uint256 public votingDelay;

    /// @notice Delay before execution after proposal passes
    uint256 public timelockDelay;

    /// @notice Counter for proposal IDs
    uint256 public proposalCount;

    /// @notice Mapping of proposal ID to proposal data
    mapping(uint256 => Proposal) public proposals;

    /// @notice Mapping of proposal ID to vote data
    mapping(uint256 => mapping(uint256 => bool)) public hasVoted; // proposalId => tokenId => hasVoted

    /// @notice Mapping of proposal ID to vote tallies
    mapping(uint256 => VoteTally) public voteTallies;

    enum ProposalState {
        Pending,
        Active,
        Defeated,
        Succeeded,
        Queued,
        Executed,
        Cancelled,
        Vetoed
    }

    enum VoteType {
        Against,
        For,
        Abstain
    }

    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        bytes32 metadataHash;
        uint256 createdAt;
        uint256 startTime;
        uint256 endTime;
        uint256 executionTime;
        ProposalState state;
        bool isSpeedup;
    }

    struct VoteTally {
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
    }

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        uint256 startTime,
        uint256 endTime
    );

    event VoteCast(
        uint256 indexed proposalId,
        uint256 indexed tokenId,
        address indexed voter,
        VoteType voteType,
        uint256 votingPower
    );

    event ProposalQueued(uint256 indexed proposalId, uint256 executionTime);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event ProposalVetoed(uint256 indexed proposalId);
    event ProposalSpeedup(uint256 indexed proposalId, uint256 newEndTime, uint256 newExecutionTime);

    event ProposalThresholdUpdated(uint256 oldValue, uint256 newValue);
    event QuorumUpdated(uint256 oldValue, uint256 newValue);
    event VotingPeriodUpdated(uint256 oldValue, uint256 newValue);
    event VotingDelayUpdated(uint256 oldValue, uint256 newValue);
    event TimelockDelayUpdated(uint256 oldValue, uint256 newValue);

    error InsufficientVotingPower();
    error ProposalNotActive();
    error AlreadyVoted();
    error ProposalNotSucceeded();
    error ProposalNotQueued();
    error TimelockNotExpired();
    error ProposalIsVetoed();
    error InvalidParameters();
    error QuorumNotReached();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the governor contract
     * @param _admin Address that will have admin role
     * @param _escrow Address of the voting escrow contract
     * @param _council Address of the governance council
     * @param _proposalThreshold Minimum voting power to create proposals
     * @param _quorumBps Quorum in basis points (e.g., 1000 = 10%)
     * @param _votingPeriod Default voting period in seconds
     * @param _votingDelay Delay before voting starts
     * @param _timelockDelay Delay before execution
     */
    function initialize(
        address _admin,
        address _escrow,
        address _council,
        uint256 _proposalThreshold,
        uint256 _quorumBps,
        uint256 _votingPeriod,
        uint256 _votingDelay,
        uint256 _timelockDelay
    ) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        if (_escrow == address(0) || _council == address(0)) {
            revert InvalidParameters();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GOVERNANCE_ADMIN_ROLE, _admin);
        _grantRole(EXECUTOR_ROLE, _admin);

        escrow = _escrow;
        council = _council;
        proposalThreshold = _proposalThreshold;
        quorumBps = _quorumBps;
        votingPeriod = _votingPeriod;
        votingDelay = _votingDelay;
        timelockDelay = _timelockDelay;
    }

    /**
     * @notice Create a new governance proposal
     * @param _title Title of the proposal
     * @param _description Detailed description
     * @param _metadataHash IPFS hash of additional metadata
     * @return proposalId The ID of the created proposal
     */
    function propose(
        string calldata _title,
        string calldata _description,
        bytes32 _metadataHash
    ) external whenNotPaused nonReentrant returns (uint256 proposalId) {
        // Check if proposer has sufficient voting power across all their veNFTs
        uint256 proposerVotingPower = _getTotalVotingPower(msg.sender);
        if (proposerVotingPower < proposalThreshold) revert InsufficientVotingPower();

        proposalId = ++proposalCount;
        uint256 startTime = block.timestamp + votingDelay;
        uint256 endTime = startTime + votingPeriod;

        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.title = _title;
        proposal.description = _description;
        proposal.metadataHash = _metadataHash;
        proposal.createdAt = block.timestamp;
        proposal.startTime = startTime;
        proposal.endTime = endTime;
        proposal.state = ProposalState.Pending;

        emit ProposalCreated(proposalId, msg.sender, _title, startTime, endTime);

        return proposalId;
    }

    /**
     * @notice Cast a vote on a proposal using a veNFT
     * @param _proposalId ID of the proposal
     * @param _tokenId ID of the veNFT to vote with
     * @param _voteType Type of vote (Against, For, Abstain)
     */
    function castVote(
        uint256 _proposalId,
        uint256 _tokenId,
        VoteType _voteType
    ) external whenNotPaused nonReentrant {
        Proposal storage proposal = proposals[_proposalId];

        // Update state if needed
        _updateProposalState(_proposalId);

        if (proposal.state != ProposalState.Active) revert ProposalNotActive();
        if (hasVoted[_proposalId][_tokenId]) revert AlreadyVoted();

        // Verify ownership or approval
        if (!IVotingEscrow(escrow).isApprovedOrOwner(msg.sender, _tokenId)) {
            revert InsufficientVotingPower();
        }

        // Get voting power
        uint256 votingPower = IVotingEscrow(escrow).votingPower(_tokenId);
        if (votingPower == 0) revert InsufficientVotingPower();

        hasVoted[_proposalId][_tokenId] = true;
        VoteTally storage tally = voteTallies[_proposalId];

        if (_voteType == VoteType.For) {
            tally.forVotes += votingPower;
        } else if (_voteType == VoteType.Against) {
            tally.againstVotes += votingPower;
        } else {
            tally.abstainVotes += votingPower;
        }

        emit VoteCast(_proposalId, _tokenId, msg.sender, _voteType, votingPower);
    }

    /**
     * @notice Cast votes with multiple veNFTs
     * @param _proposalId ID of the proposal
     * @param _tokenIds Array of veNFT IDs
     * @param _voteType Type of vote
     */
    function castVoteMultiple(
        uint256 _proposalId,
        uint256[] calldata _tokenIds,
        VoteType _voteType
    ) external whenNotPaused nonReentrant {
        Proposal storage proposal = proposals[_proposalId];
        _updateProposalState(_proposalId);

        if (proposal.state != ProposalState.Active) revert ProposalNotActive();

        VoteTally storage tally = voteTallies[_proposalId];

        for (uint256 i = 0; i < _tokenIds.length; i++) {
            uint256 tokenId = _tokenIds[i];
            
            if (hasVoted[_proposalId][tokenId]) revert AlreadyVoted();
            if (!IVotingEscrow(escrow).isApprovedOrOwner(msg.sender, tokenId)) {
                revert InsufficientVotingPower();
            }

            uint256 votingPower = IVotingEscrow(escrow).votingPower(tokenId);
            if (votingPower == 0) revert InsufficientVotingPower();

            hasVoted[_proposalId][tokenId] = true;

            if (_voteType == VoteType.For) {
                tally.forVotes += votingPower;
            } else if (_voteType == VoteType.Against) {
                tally.againstVotes += votingPower;
            } else {
                tally.abstainVotes += votingPower;
            }

            emit VoteCast(_proposalId, tokenId, msg.sender, _voteType, votingPower);
        }
    }

    /**
     * @notice Queue a successful proposal for execution
     * @param _proposalId ID of the proposal
     */
    function queue(uint256 _proposalId) external nonReentrant {
        _updateProposalState(_proposalId);
        Proposal storage proposal = proposals[_proposalId];

        if (proposal.state != ProposalState.Succeeded) revert ProposalNotSucceeded();

        // Check if council has vetoed
        if (GovernanceCouncil(council).isVetoed(_proposalId)) {
            proposal.state = ProposalState.Vetoed;
            emit ProposalVetoed(_proposalId);
            revert ProposalIsVetoed();
        }

        uint256 executionTime = block.timestamp + timelockDelay;

        // Check if council has sped up the proposal
        if (GovernanceCouncil(council).isSpedup(_proposalId)) {
            (, uint256 newTimelockDelay) = GovernanceCouncil(council).getSpeedupParams(_proposalId);
            executionTime = block.timestamp + newTimelockDelay;
        }

        proposal.executionTime = executionTime;
        proposal.state = ProposalState.Queued;

        emit ProposalQueued(_proposalId, executionTime);
    }

    /**
     * @notice Execute a queued proposal
     * @param _proposalId ID of the proposal
     */
    function execute(uint256 _proposalId) external onlyRole(EXECUTOR_ROLE) nonReentrant {
        Proposal storage proposal = proposals[_proposalId];

        if (proposal.state != ProposalState.Queued) revert ProposalNotQueued();
        if (block.timestamp < proposal.executionTime) revert TimelockNotExpired();

        // Final veto check
        if (GovernanceCouncil(council).isVetoed(_proposalId)) {
            proposal.state = ProposalState.Vetoed;
            emit ProposalVetoed(_proposalId);
            revert ProposalIsVetoed();
        }

        proposal.state = ProposalState.Executed;

        emit ProposalExecuted(_proposalId);

        // Actual execution logic would go here
        // This could call external contracts or perform on-chain actions
    }

    /**
     * @notice Cancel a proposal
     * @param _proposalId ID of the proposal
     */
    function cancel(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];

        // Only proposer or admin can cancel
        if (msg.sender != proposal.proposer && !hasRole(GOVERNANCE_ADMIN_ROLE, msg.sender)) {
            revert InsufficientVotingPower();
        }

        if (proposal.state == ProposalState.Executed) revert InvalidParameters();

        proposal.state = ProposalState.Cancelled;
        emit ProposalCancelled(_proposalId);
    }

    /**
     * @notice Get the current state of a proposal
     * @param _proposalId ID of the proposal
     * @return ProposalState Current state
     */
    function state(uint256 _proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[_proposalId];

        if (proposal.state == ProposalState.Executed ||
            proposal.state == ProposalState.Cancelled ||
            proposal.state == ProposalState.Vetoed) {
            return proposal.state;
        }

        if (block.timestamp < proposal.startTime) {
            return ProposalState.Pending;
        }

        if (block.timestamp <= proposal.endTime) {
            return ProposalState.Active;
        }

        // Voting ended, check results
        VoteTally storage tally = voteTallies[_proposalId];
        uint256 totalVotes = tally.forVotes + tally.againstVotes + tally.abstainVotes;
        uint256 totalVotingPower = IVotingEscrow(escrow).totalVotingPower();
        uint256 quorumRequired = (totalVotingPower * quorumBps) / 10000;

        if (totalVotes < quorumRequired || tally.forVotes <= tally.againstVotes) {
            return ProposalState.Defeated;
        }

        if (proposal.state == ProposalState.Queued) {
            return ProposalState.Queued;
        }

        return ProposalState.Succeeded;
    }

    /**
     * @notice Update proposal state based on current time
     * @param _proposalId ID of the proposal
     */
    function _updateProposalState(uint256 _proposalId) internal {
        Proposal storage proposal = proposals[_proposalId];
        proposal.state = state(_proposalId);
    }

    /**
     * @notice Get total voting power for an address across all veNFTs
     * @param _account Address to check
     * @return totalPower Total voting power
     */
    function _getTotalVotingPower(address _account) internal view returns (uint256 totalPower) {
        uint256 balance = IVotingEscrow(escrow).balanceOf(_account);
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = IVotingEscrow(escrow).tokenOfOwnerByIndex(_account, i);
            totalPower += IVotingEscrow(escrow).votingPower(tokenId);
        }
        return totalPower;
    }

    /**
     * @notice Get vote tally for a proposal
     * @param _proposalId ID of the proposal
     * @return forVotes Votes in favor
     * @return againstVotes Votes against
     * @return abstainVotes Abstain votes
     */
    function getVotes(uint256 _proposalId) external view returns (uint256 forVotes, uint256 againstVotes, uint256 abstainVotes) {
        VoteTally storage tally = voteTallies[_proposalId];
        return (tally.forVotes, tally.againstVotes, tally.abstainVotes);
    }

    // Admin functions

    function setProposalThreshold(uint256 _newThreshold) external onlyRole(GOVERNANCE_ADMIN_ROLE) {
        uint256 oldValue = proposalThreshold;
        proposalThreshold = _newThreshold;
        emit ProposalThresholdUpdated(oldValue, _newThreshold);
    }

    function setQuorum(uint256 _newQuorumBps) external onlyRole(GOVERNANCE_ADMIN_ROLE) {
        if (_newQuorumBps > 10000) revert InvalidParameters();
        uint256 oldValue = quorumBps;
        quorumBps = _newQuorumBps;
        emit QuorumUpdated(oldValue, _newQuorumBps);
    }

    function setVotingPeriod(uint256 _newPeriod) external onlyRole(GOVERNANCE_ADMIN_ROLE) {
        uint256 oldValue = votingPeriod;
        votingPeriod = _newPeriod;
        emit VotingPeriodUpdated(oldValue, _newPeriod);
    }

    function setVotingDelay(uint256 _newDelay) external onlyRole(GOVERNANCE_ADMIN_ROLE) {
        uint256 oldValue = votingDelay;
        votingDelay = _newDelay;
        emit VotingDelayUpdated(oldValue, _newDelay);
    }

    function setTimelockDelay(uint256 _newDelay) external onlyRole(GOVERNANCE_ADMIN_ROLE) {
        uint256 oldValue = timelockDelay;
        timelockDelay = _newDelay;
        emit TimelockDelayUpdated(oldValue, _newDelay);
    }

    function pause() external onlyRole(GOVERNANCE_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GOVERNANCE_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Required for UUPS upgrades
    function _authorizeUpgrade(address) internal override onlyRole(GOVERNANCE_ADMIN_ROLE) {}
}

