// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface INFT {
    function getCreatorOfToken(uint256 tokenId) external view returns (address);
    function getRoyaltyOfToken(uint256 tokenId) external view returns (uint256);
}

contract NFTMarketplace is Ownable, ReentrancyGuard {
    constructor() Ownable(msg.sender) {}

    struct Listing {
        address nft;
        uint256 tokenId;
        address seller;
        uint256 price;
    }

    mapping(address => mapping(uint256 => Listing)) public listings;
    mapping(address => Listing[]) private sellerListings;

    uint256 private _listingFee = 0.0001 ether;

    event ItemListed(address indexed nft, uint256 indexed tokenId, address indexed seller, uint256 price);
    event ListingUpdated(address indexed nft, uint256 indexed tokenId, address seller, uint256 newPrice);
    event ItemCanceled(address indexed nft, uint256 indexed tokenId);
    event ItemSold(address indexed nft, uint256 indexed tokenId, address seller, address buyer, uint256 price);
    event ListingFeeUpdated(uint256 newFee);
    event FeeWithdrawn(uint256 amount);

    function getListingFee() external view returns (uint256) {
        return _listingFee;
    }

    function setListingFee(uint256 _fee) external onlyOwner {
        _listingFee = _fee;
        emit ListingFeeUpdated(_fee);
    }

    function withdrawFees() external onlyOwner {
        uint256 amount = address(this).balance;
        payable(owner()).transfer(amount);
        emit FeeWithdrawn(amount);
    }

    function listItem(address nft, uint256 tokenId, uint256 price) external payable nonReentrant {
        require(msg.value >= _listingFee, "Listing fee not paid");
        require(price > 0, "Price must be > 0");

        IERC721 token = IERC721(nft);
        require(token.ownerOf(tokenId) == msg.sender, "Not owner");
        require(token.getApproved(tokenId) == address(this), "Not approved");

        listings[nft][tokenId] = Listing(nft, tokenId, msg.sender, price);
        sellerListings[msg.sender].push(listings[nft][tokenId]);
        payable(address(this)).transfer(_listingFee); // Transfer listing fee to contract

        emit ItemListed(nft, tokenId, msg.sender, price);
    }

    function updateListingPrice(address nft, uint256 tokenId, uint256 newPrice) external {
        Listing storage item = listings[nft][tokenId];
        require(item.seller != address(0), "Not listed");
        require(item.seller == msg.sender, "Not seller");
        require(newPrice > 0, "Price must be > 0");
        require(newPrice != item.price, "Price already set to this value");

        item.price = newPrice;
        // Update the seller's listing in the array
        for (uint i = 0; i < sellerListings[msg.sender].length; i++) {
            if (sellerListings[msg.sender][i].nft == nft && sellerListings[msg.sender][i].tokenId == tokenId) {
                sellerListings[msg.sender][i].price = newPrice;
                break;
            }
        }
        emit ListingUpdated(nft, tokenId, msg.sender, newPrice);
    }

    function cancelListing(address nft, uint256 tokenId) external {
        Listing memory item = listings[nft][tokenId];
        require(item.seller != address(0), "Not listed");
        require(item.seller == msg.sender, "Not seller");

        _removeListing(nft, tokenId, item.seller);
        emit ItemCanceled(nft, tokenId);
    }

    function buyItem(address nft, uint256 tokenId) external payable nonReentrant {
        Listing memory item = listings[nft][tokenId];
        require(item.seller != address(0), "Not listed");
        require(item.seller != msg.sender, "Cannot buy your own item");
        require(IERC721(nft).getApproved(tokenId) == address(this), "Not approved");
        require(msg.value >= item.price, "Insufficient ETH");

        uint256 royaltyFee = INFT(nft).getRoyaltyOfToken(tokenId);
        address creator = INFT(nft).getCreatorOfToken(tokenId);

        uint256 sellerAmount = item.price - royaltyFee;

        delete listings[nft][tokenId];
        _removeListing(nft, tokenId, item.seller);

        IERC721(nft).safeTransferFrom(item.seller, msg.sender, tokenId);
        if (royaltyFee > 0) payable(creator).transfer(royaltyFee);
        payable(item.seller).transfer(sellerAmount);

        emit ItemSold(nft, tokenId, item.seller, msg.sender, item.price);
    }

    function getListingsBySeller(address seller) external view returns (Listing[] memory) {
        return sellerListings[seller];
    }

    function _removeListing(address nft, uint256 tokenId, address seller) internal {
        delete listings[nft][tokenId];
        Listing[] storage items = sellerListings[seller];
        for (uint i = 0; i < items.length; i++) {
            if (items[i].nft == nft && items[i].tokenId == tokenId) {
                items[i] = items[items.length - 1];
                items.pop();
                break;
            }
        }
    }
}
