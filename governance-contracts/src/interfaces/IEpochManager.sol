// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEpochManager {
    function getCurrentEpoch() external view returns (uint256);
    function getEpochStartTime(uint256 epoch) external view returns (uint256);
    function getEpochEndTime(uint256 epoch) external view returns (uint256);
    function isVotingPeriod() external view returns (bool);
    function isDistributionPeriod() external view returns (bool);
    function isPreparationPeriod() external view returns (bool);
}

