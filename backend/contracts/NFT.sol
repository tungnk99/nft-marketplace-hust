// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT is ERC721URIStorage, Ownable {
    constructor() ERC721("THD NFT", "THD") Ownable(msg.sender) {}

    uint256 private _tokenIds;
    mapping(uint256 => address) private _creators;
    mapping(address => uint256) private _creatorTokenCount;
    mapping(uint256 => uint256) private _royaltyFees;

    event NFTMinted(address indexed creator, uint256 indexed tokenId, string tokenURI);
    event NFTRoyaltyUpdated(uint256 indexed tokenId, uint256 newRoyalty);

    function mint(string memory tokenURI, uint256 royaltyFee) external returns (uint256) {
        require(royaltyFee >= 0, "Royalty must be non-negative");

        _tokenIds++;
        uint256 newItemId = _tokenIds;

        _safeMint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);

        _creators[newItemId] = msg.sender;
        _creatorTokenCount[msg.sender] += 1;
        _royaltyFees[newItemId] = royaltyFee;

        emit NFTMinted(msg.sender, newItemId, tokenURI);
        return newItemId;
    }

    function getRoyaltyOfToken(uint256 tokenId) external view returns (uint256) {
        return _royaltyFees[tokenId];
    }

    // function _exists(uint256 tokenId) internal view returns (bool) {
    //     return _tokenIds >= tokenId && tokenId > 0 && ownerOf(tokenId) != address(0);
    // }

    function updateRoyalty(uint256 tokenId, uint256 newRoyalty) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(_creators[tokenId] == msg.sender, "Not creator");
        // require(newRoyalty <= 1000, "Too high");
        require(newRoyalty >= 0, "Royalty must be non-negative");

        _royaltyFees[tokenId] = newRoyalty;
        emit NFTRoyaltyUpdated(tokenId, newRoyalty);
    }

    function getTokensByCreator(address creator) external view returns (uint256[] memory) {
        uint256 numberOfTokensCreated = _creatorTokenCount[creator];
        if (numberOfTokensCreated == 0) {
            return new uint256[](0); // Return an empty array if no tokens are created by the creator
        }

        uint256[] memory createdTokens = new uint256[](numberOfTokensCreated);
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < _tokenIds; i++) {
            uint256 tokenId = i + 1;
            if (_creators[tokenId] != creator) continue;
            createdTokens[currentIndex] = tokenId;
            currentIndex += 1;
        }
        return createdTokens;
    }

    function getTokensByOwner(address owner) external view returns (uint256[] memory) {
        uint256 numberOfTokensOwned = balanceOf(owner);
        if (numberOfTokensOwned == 0) {
            return new uint256[](0); // Return an empty array if no tokens are owned by the owner
        }
        uint256[] memory ownedTokens = new uint256[](numberOfTokensOwned);
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < _tokenIds; i++) {
            uint256 tokenId = i + 1;
            if (ownerOf(tokenId) != owner) continue;
            ownedTokens[currentIndex] = tokenId;
            currentIndex += 1;
        }

        return ownedTokens;
    }

    function getCreatorOfToken(uint256 tokenId) external view returns (address) {
        return _creators[tokenId];
    }
}