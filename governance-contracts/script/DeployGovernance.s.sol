// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../src/VotingEscrow.sol";
import "../src/GovernanceCouncil.sol";
import "../src/FushumaGovernor.sol";

/**
 * @title DeployGovernance
 * @notice Deployment script for Fushuma governance contracts
 */
contract DeployGovernance is Script {
    // Configuration - these can be overridden via environment variables
    address public daoAddress;
    address public fumaTokenAddress;
    
    // VotingEscrow parameters
    uint256 public constant MIN_DEPOSIT = 100 ether; // 100 FUMA minimum
    uint256 public constant WARMUP_PERIOD = 7 days;
    uint256 public constant COOLDOWN_PERIOD = 14 days;
    uint256 public constant MIN_LOCK_DURATION = 30 days;
    uint256 public constant MAX_MULTIPLIER = 4; // 4x max voting power

    // Council parameters
    uint256 public constant REQUIRED_APPROVALS = 3;
    uint256 public constant VETO_PERIOD = 3 days;
    uint256 public constant VETO_VOTING_PERIOD = 2 days;
    uint256 public constant SPEEDUP_VOTING_PERIOD = 1 days;

    // Governor parameters
    uint256 public constant PROPOSAL_THRESHOLD = 1000 ether; // 1000 voting power
    uint256 public constant QUORUM_BPS = 1000; // 10%
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant VOTING_DELAY = 1 days;
    uint256 public constant TIMELOCK_DELAY = 2 days;

    function run() external {
        // Load addresses from environment or use defaults
        daoAddress = vm.envOr("DAO_ADDRESS", address(0x1234567890123456789012345678901234567890));
        fumaTokenAddress = vm.envOr("FUMA_TOKEN_ADDRESS", address(0x0987654321098765432109876543210987654321));

        console.log("\n=== Fushuma Governance Deployment ===");
        console.log("Deployer:", msg.sender);
        console.log("DAO Address:", daoAddress);
        console.log("FUMA Token:", fumaTokenAddress);

        vm.startBroadcast();

        // 1. Deploy VotingEscrow
        console.log("\n1. Deploying VotingEscrow...");
        VotingEscrow escrow = new VotingEscrow();
        console.log("VotingEscrow deployed at:", address(escrow));

        escrow.initialize(
            fumaTokenAddress,
            daoAddress,
            MIN_DEPOSIT,
            WARMUP_PERIOD,
            COOLDOWN_PERIOD,
            MIN_LOCK_DURATION,
            MAX_MULTIPLIER
        );
        console.log("VotingEscrow initialized");

        // 2. Deploy GovernanceCouncil
        console.log("\n2. Deploying GovernanceCouncil...");
        GovernanceCouncil council = new GovernanceCouncil();
        console.log("GovernanceCouncil deployed at:", address(council));

        council.initialize(
            daoAddress,
            REQUIRED_APPROVALS,
            VETO_PERIOD,
            VETO_VOTING_PERIOD,
            SPEEDUP_VOTING_PERIOD
        );
        console.log("GovernanceCouncil initialized");

        // 3. Deploy FushumaGovernor
        console.log("\n3. Deploying FushumaGovernor...");
        FushumaGovernor governor = new FushumaGovernor();
        console.log("FushumaGovernor deployed at:", address(governor));

        // Initialize governor
        governor.initialize(
            daoAddress,
            address(escrow),
            address(council),
            PROPOSAL_THRESHOLD,
            QUORUM_BPS,
            VOTING_PERIOD,
            VOTING_DELAY,
            TIMELOCK_DELAY
        );
        console.log("FushumaGovernor initialized");

        vm.stopBroadcast();

        // 4. Log deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("VotingEscrow:", address(escrow));
        console.log("GovernanceCouncil:", address(council));
        console.log("FushumaGovernor:", address(governor));
        
        console.log("\n=== VotingEscrow Parameters ===");
        console.log("Min Deposit:", MIN_DEPOSIT / 1e18, "FUMA");
        console.log("Warmup Period:", WARMUP_PERIOD / 1 days, "days");
        console.log("Cooldown Period:", COOLDOWN_PERIOD / 1 days, "days");
        console.log("Min Lock Duration:", MIN_LOCK_DURATION / 1 days, "days");
        console.log("Max Multiplier:", MAX_MULTIPLIER, "x");

        console.log("\n=== Council Parameters ===");
        console.log("Required Approvals:", REQUIRED_APPROVALS);
        console.log("Veto Period:", VETO_PERIOD / 1 days, "days");
        console.log("Veto Voting Period:", VETO_VOTING_PERIOD / 1 days, "days");
        console.log("Speedup Voting Period:", SPEEDUP_VOTING_PERIOD / 1 days, "days");

        console.log("\n=== Governor Parameters ===");
        console.log("Proposal Threshold:", PROPOSAL_THRESHOLD / 1e18, "voting power");
        console.log("Quorum:", QUORUM_BPS / 100, "%");
        console.log("Voting Period:", VOTING_PERIOD / 1 days, "days");
        console.log("Voting Delay:", VOTING_DELAY / 1 days, "days");
        console.log("Timelock Delay:", TIMELOCK_DELAY / 1 days, "days");

        console.log("\n=== Next Steps ===");
        console.log("1. Grant COUNCIL_MEMBER role to council members:");
        console.log("   cast send", address(council), '"grantRole(bytes32,address)" $(cast keccak "COUNCIL_MEMBER") <MEMBER_ADDRESS>');
        console.log("\n2. Grant EXECUTOR_ROLE to executor:");
        console.log("   cast send", address(governor), '"grantRole(bytes32,address)" $(cast keccak "EXECUTOR") <EXECUTOR_ADDRESS>');
        console.log("\n3. Update frontend with contract addresses");
        console.log("\n4. Test the system on testnet before mainnet deployment");
    }
}

