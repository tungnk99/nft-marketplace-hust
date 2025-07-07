// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTv2 is ERC721URIStorage, Ownable {
    constructor(address marketplaceAddress) ERC721("THD NFT", "THD") Ownable(msg.sender) {
        require(marketplaceAddress != address(0), "Marketplace address cannot be zero");
        _marketplaceAddress = marketplaceAddress;
    }

    struct NFTInfo {
        uint256 tokenId;
        string tokenURI;
        address creator;
        uint256 royaltyFee;
        uint256 mintedAt;
    }

    struct NFTInfoWithOwner {
        uint256 tokenId;
        string tokenURI;
        address creator;
        address owner;
        uint256 royaltyFee;
        uint256 mintedAt;
    }

    uint256 private _tokenIds;
    address private _marketplaceAddress;
    // Mapping creator address to number of tokens created
    mapping(address => uint256) private _creatorTokenCount;
    // Mapping tokenId to NFTInfo struct
    mapping(uint256 => NFTInfo) private _nftInfos;

    event NFTMinted(address indexed creator, uint256 indexed tokenId, string tokenURI, uint256 timestamp);
    event NFTRoyaltyUpdated(uint256 indexed tokenId, uint256 newRoyalty, uint256 timestamp);

    function getMarketplaceAddress() external view returns (address) {
        return _marketplaceAddress;
    }

    function setMarketplaceAddress(address marketplaceAddress) external onlyOwner {
        require(marketplaceAddress != address(0), "Marketplace address cannot be zero");
        _marketplaceAddress = marketplaceAddress;

        for (uint256 i = 1; i <= _tokenIds; i++) {
            if (_ownerOf(i) != address(0)) {
                _approve(_marketplaceAddress, i, address(0));
            }
        }
    }

    function mint(string memory tokenURI, uint256 royaltyFee) external returns (uint256) {
        require(royaltyFee >= 0, "Royalty must be non-negative");

        _tokenIds++;
        uint256 newItemId = _tokenIds;

        _safeMint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);

        _creatorTokenCount[msg.sender] += 1;
        _nftInfos[newItemId] = NFTInfo({
            tokenId: newItemId,
            tokenURI: tokenURI,
            creator: msg.sender,
            royaltyFee: royaltyFee,
            mintedAt: block.timestamp
        });

        if (msg.sender != _marketplaceAddress) {
            approve(_marketplaceAddress, newItemId);
        }

        emit NFTMinted(msg.sender, newItemId, tokenURI, block.timestamp);
        return newItemId;
    }

    function getCreatorOfToken(uint256 tokenId) external view returns (address) {
        require(_exists(tokenId), "Token does not exist");
        return _nftInfos[tokenId].creator;
    }

    function getRoyaltyOfToken(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "Token does not exist");
        return _nftInfos[tokenId].royaltyFee;
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _tokenIds >= tokenId && tokenId > 0 && ownerOf(tokenId) != address(0);
    }

    function updateRoyalty(uint256 tokenId, uint256 newRoyalty) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(_nftInfos[tokenId].creator == msg.sender, "Not creator");
        require(newRoyalty >= 0, "Royalty must be non-negative");

        _nftInfos[tokenId].royaltyFee = newRoyalty;
        emit NFTRoyaltyUpdated(tokenId, newRoyalty, block.timestamp);
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
            if (_nftInfos[tokenId].creator != creator) continue;
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

    function getTokenInfoById(uint256 tokenId) external view returns (NFTInfo memory) {
        require(_exists(tokenId), "Token does not exist");
        return _nftInfos[tokenId];
    }

    function getTokenInfoByCreator(address creator) external view returns (NFTInfoWithOwner[] memory) {
        uint256 numberOfTokensCreated = _creatorTokenCount[creator];
        if (numberOfTokensCreated == 0) {
            return new NFTInfoWithOwner[](0); // Return an empty array if no tokens are created by the creator
        }

        NFTInfoWithOwner[] memory createdTokens = new NFTInfoWithOwner[](numberOfTokensCreated);
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < _tokenIds; i++) {
            uint256 tokenId = i + 1;
            if (_nftInfos[tokenId].creator != creator) continue;
            createdTokens[currentIndex] = NFTInfoWithOwner({
                tokenId: tokenId,
                tokenURI: _nftInfos[tokenId].tokenURI,
                creator: _nftInfos[tokenId].creator,
                owner: ownerOf(tokenId),
                royaltyFee: _nftInfos[tokenId].royaltyFee,
                mintedAt: _nftInfos[tokenId].mintedAt
            });
            currentIndex += 1;
        }

        return createdTokens;
    }

    function getTokenInfoByOwner(address owner) external view returns (NFTInfoWithOwner[] memory) {
        uint256 numberOfTokensOwned = balanceOf(owner);
        if (numberOfTokensOwned == 0) {
            return new NFTInfoWithOwner[](0); // Return an empty array if no tokens are owned by the owner
        }

        NFTInfoWithOwner[] memory ownedTokens = new NFTInfoWithOwner[](numberOfTokensOwned);
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < _tokenIds; i++) {
            uint256 tokenId = i + 1;
            if (ownerOf(tokenId) != owner) continue;
            ownedTokens[currentIndex] = NFTInfoWithOwner({
                tokenId: tokenId,
                tokenURI: _nftInfos[tokenId].tokenURI,
                creator: _nftInfos[tokenId].creator,
                owner: ownerOf(tokenId),
                royaltyFee: _nftInfos[tokenId].royaltyFee,
                mintedAt: _nftInfos[tokenId].mintedAt
            });
            currentIndex += 1;
        }

        return ownedTokens;
    }
}