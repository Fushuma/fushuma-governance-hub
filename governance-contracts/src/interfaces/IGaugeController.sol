// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IGaugeController {
    struct GaugeWeight {
        uint256 totalVotingPower;
        uint256 relativeWeight;
    }
    
    function getGaugeWeight(uint256 gaugeId, uint256 epoch) external view returns (GaugeWeight memory);
    function finalizeEpochWeights(uint256 epoch) external;
}

