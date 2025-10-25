// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title IVotingEscrow
 * @notice Interface for the VotingEscrow contract
 * @dev Simplified interface compatible with Aragon ve-governance
 */
interface IVotingEscrow {
    /**
     * @notice Get the voting power of a veNFT
     * @param _tokenId ID of the veNFT
     * @return Voting power
     */
    function votingPower(uint256 _tokenId) external view returns (uint256);

    /**
     * @notice Get total voting power across all veNFTs
     * @return Total voting power
     */
    function totalVotingPower() external view returns (uint256);

    /**
     * @notice Check if an address is approved or owner of a veNFT
     * @param _spender Address to check
     * @param _tokenId ID of the veNFT
     * @return True if approved or owner
     */
    function isApprovedOrOwner(address _spender, uint256 _tokenId) external view returns (bool);

    /**
     * @notice Get the number of veNFTs owned by an address
     * @param _owner Address to check
     * @return Number of veNFTs
     */
    function balanceOf(address _owner) external view returns (uint256);

    /**
     * @notice Get veNFT ID by owner and index
     * @param _owner Address of the owner
     * @param _index Index in the owner's token list
     * @return Token ID
     */
    function tokenOfOwnerByIndex(address _owner, uint256 _index) external view returns (uint256);

    /**
     * @notice Create a new lock
     * @param _value Amount to lock
     * @return tokenId ID of the created veNFT
     */
    function createLock(uint256 _value) external returns (uint256 tokenId);

    /**
     * @notice Increase the locked amount
     * @param _tokenId ID of the veNFT
     * @param _value Amount to add
     */
    function increaseAmount(uint256 _tokenId, uint256 _value) external;

    /**
     * @notice Enter the exit queue to withdraw
     * @param _tokenId ID of the veNFT
     */
    function startExit(uint256 _tokenId) external;

    /**
     * @notice Complete exit and burn veNFT
     * @param _tokenId ID of the veNFT
     */
    function completeExit(uint256 _tokenId) external;

    /**
     * @notice Get owner of a veNFT
     * @param _tokenId ID of the veNFT
     * @return Owner address
     */
    function ownerOf(uint256 _tokenId) external view returns (address);

    /**
     * @notice Get voting power of a veNFT (alias for votingPower)
     * @param _tokenId ID of the veNFT
     * @return Voting power
     */
    function getVotingPower(uint256 _tokenId) external view returns (uint256);
}

