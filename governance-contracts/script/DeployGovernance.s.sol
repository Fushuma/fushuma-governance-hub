// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/Script.sol";
import "../src/FushumaGovernor.sol";
import "../src/GovernanceCouncil.sol";

/**
 * @title DeployGovernance
 * @notice Deployment script for Fushuma governance contracts
 * @dev This script deploys the complete governance system including:
 *      - GovernanceCouncil (council with veto/speedup powers)
 *      - FushumaGovernor (main governance contract)
 * 
 * Prerequisites:
 * - VotingEscrowIncreasing must be deployed
 * - Clock contract must be deployed
 * - Aragon DAO must be deployed
 * 
 * Environment variables required:
 * - DAO_ADDRESS: Address of the Aragon DAO
 * - ESCROW_ADDRESS: Address of the VotingEscrowIncreasing contract
 * - CLOCK_ADDRESS: Address of the Clock contract
 * - COUNCIL_MEMBERS: Comma-separated list of council member addresses
 */
contract DeployGovernance is Script {
    // Default governance parameters (can be overridden with env vars)
    uint256 constant PROPOSAL_THRESHOLD = 1000 ether; // 1000 voting power
    uint256 constant QUORUM_BPS = 1000; // 10%
    uint256 constant VOTING_PERIOD = 7 days;
    uint256 constant VOTING_DELAY = 1 days;
    uint256 constant TIMELOCK_DELAY = 2 days;

    uint256 constant REQUIRED_APPROVALS = 3; // 3 of 5 council members
    uint256 constant VETO_PERIOD = 3 days;
    uint256 constant VETO_VOTING_PERIOD = 2 days;
    uint256 constant SPEEDUP_VOTING_PERIOD = 1 days;

    function run() external {
        // Load environment variables
        address daoAddress = vm.envAddress("DAO_ADDRESS");
        address escrowAddress = vm.envAddress("ESCROW_ADDRESS");
        address clockAddress = vm.envAddress("CLOCK_ADDRESS");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying Fushuma Governance System...");
        console.log("DAO Address:", daoAddress);
        console.log("Escrow Address:", escrowAddress);
        console.log("Clock Address:", clockAddress);

        // 1. Deploy GovernanceCouncil
        console.log("\n1. Deploying GovernanceCouncil...");
        GovernanceCouncil council = new GovernanceCouncil();
        console.log("GovernanceCouncil deployed at:", address(council));

        // Initialize council
        council.initialize(
            daoAddress,
            REQUIRED_APPROVALS,
            VETO_PERIOD,
            VETO_VOTING_PERIOD,
            SPEEDUP_VOTING_PERIOD
        );
        console.log("GovernanceCouncil initialized");

        // 2. Deploy FushumaGovernor
        console.log("\n2. Deploying FushumaGovernor...");
        FushumaGovernor governor = new FushumaGovernor();
        console.log("FushumaGovernor deployed at:", address(governor));

        // Initialize governor
        governor.initialize(
            daoAddress,
            escrowAddress,
            address(council),
            PROPOSAL_THRESHOLD,
            QUORUM_BPS,
            VOTING_PERIOD,
            VOTING_DELAY,
            TIMELOCK_DELAY
        );
        console.log("FushumaGovernor initialized");

        // 3. Log deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("GovernanceCouncil:", address(council));
        console.log("FushumaGovernor:", address(governor));
        console.log("\nGovernance Parameters:");
        console.log("- Proposal Threshold:", PROPOSAL_THRESHOLD / 1 ether, "voting power");
        console.log("- Quorum:", QUORUM_BPS / 100, "%");
        console.log("- Voting Period:", VOTING_PERIOD / 1 days, "days");
        console.log("- Voting Delay:", VOTING_DELAY / 1 days, "days");
        console.log("- Timelock Delay:", TIMELOCK_DELAY / 1 days, "days");
        console.log("\nCouncil Parameters:");
        console.log("- Required Approvals:", REQUIRED_APPROVALS);
        console.log("- Veto Period:", VETO_PERIOD / 1 days, "days");
        console.log("- Veto Voting Period:", VETO_VOTING_PERIOD / 1 days, "days");
        console.log("- Speedup Voting Period:", SPEEDUP_VOTING_PERIOD / 1 days, "days");

        console.log("\n=== Next Steps ===");
        console.log("1. Grant COUNCIL_MEMBER_ROLE to council members via DAO");
        console.log("2. Grant EXECUTOR_ROLE to appropriate addresses");
        console.log("3. Grant GOVERNANCE_ADMIN_ROLE to DAO");
        console.log("4. Test proposal creation and voting");

        vm.stopBroadcast();

        // Save deployment addresses to file
        _saveDeployment(address(council), address(governor));
    }

    function _saveDeployment(address council, address governor) internal {
        string memory json = string(abi.encodePacked(
            '{\n',
            '  "council": "', vm.toString(council), '",\n',
            '  "governor": "', vm.toString(governor), '",\n',
            '  "network": "fushuma",\n',
            '  "chainId": 121224,\n',
            '  "timestamp": ', vm.toString(block.timestamp), '\n',
            '}'
        ));

        vm.writeFile("deployments/governance.json", json);
        console.log("\nDeployment addresses saved to deployments/governance.json");
    }
}

