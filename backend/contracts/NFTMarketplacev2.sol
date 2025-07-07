// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface INFT {
    function getCreatorOfToken(uint256 tokenId) external view returns (address);
    function getRoyaltyOfToken(uint256 tokenId) external view returns (uint256);
}

contract NFTMarketplacev2 is Ownable, ReentrancyGuard {
    constructor() Ownable(msg.sender) {}

    struct Listing {
        address nft;
        uint256 tokenId;
        address seller;
        uint256 price;
        uint256 listedAt;
        uint256 updatedAt;
    }

    struct ListingLogInfo {
        address nft;
        uint256 tokenId;
        address seller;
        uint256 price;
        uint256 listedAt;
        uint256 updatedAt;
        uint256 canceledAt;
        uint256 soldAt;
    }

    // Mapping from NFT address and tokenId to Listing
    mapping(address => mapping(uint256 => Listing)) private _listings;
    // Mapping from seller address to their listings
    mapping(address => Listing[]) private _sellerListings;

    ListingLogInfo[] private _listingLogs;

    uint256 private _listingFee = 0.0001 ether;

    event ItemListed(address indexed nft, uint256 indexed tokenId, address indexed seller, uint256 price, uint256 timestamp);
    event ListingUpdated(address indexed nft, uint256 indexed tokenId, address seller, uint256 newPrice, uint256 timestamp);
    event ItemCanceled(address indexed nft, uint256 indexed tokenId, uint256 timestamp);
    event ItemSold(address indexed nft, uint256 indexed tokenId, address seller, address buyer, uint256 price, uint256 timestamp);
    event ListingFeeUpdated(uint256 newFee, uint256 timestamp);
    event FeeWithdrawn(uint256 amount, uint256 timestamp);

    function getListingFee() external view returns (uint256) {
        return _listingFee;
    }

    function setListingFee(uint256 _fee) external onlyOwner {
        _listingFee = _fee;
        emit ListingFeeUpdated(_fee, block.timestamp);
    }

    function withdrawFees() external onlyOwner {
        uint256 amount = address(this).balance;
        payable(owner()).transfer(amount);
        emit FeeWithdrawn(amount, block.timestamp);
    }

    function listItem(address nft, uint256 tokenId, uint256 price) external payable nonReentrant {
        require(msg.value >= _listingFee, "Listing fee not paid");
        require(price > 0, "Price must be > 0");

        IERC721 token = IERC721(nft);
        require(token.ownerOf(tokenId) == msg.sender, "Not owner");
        require(token.getApproved(tokenId) == address(this), "Not approved");

        _listings[nft][tokenId] = Listing(nft, tokenId, msg.sender, price, block.timestamp, block.timestamp);
        _sellerListings[msg.sender].push(_listings[nft][tokenId]);
        _listingLogs.push(ListingLogInfo(nft, tokenId, msg.sender, price, block.timestamp, block.timestamp, 0, 0));
        payable(address(this)).transfer(_listingFee); // Transfer listing fee to contract

        emit ItemListed(nft, tokenId, msg.sender, price, block.timestamp);
    }

    function updateListingPrice(address nft, uint256 tokenId, uint256 newPrice) external {
        Listing storage item = _listings[nft][tokenId];
        require(item.seller != address(0), "Not listed");
        require(item.seller == msg.sender, "Not seller");
        require(newPrice > 0, "Price must be > 0");
        require(newPrice != item.price, "Price already set to this value");

        item.price = newPrice;
        item.updatedAt = block.timestamp;
        // Update the seller's listing in the array
        for (uint i = 0; i < _sellerListings[msg.sender].length; i++) {
            if (_sellerListings[msg.sender][i].nft == nft && _sellerListings[msg.sender][i].tokenId == tokenId) {
                _sellerListings[msg.sender][i].price = newPrice;
                _sellerListings[msg.sender][i].updatedAt = block.timestamp;
                break;
            }
        }

        // Update the listing log
        for (uint i = _listingLogs.length - 1; i >= 0; i--) {
            if (_listingLogs[i].nft == nft && 
                _listingLogs[i].tokenId == tokenId && 
                _listingLogs[i].seller == msg.sender && 
                _listingLogs[i].listedAt == _sellerListings[msg.sender][i].listedAt
            ) {
                _listingLogs[i].price = newPrice;
                _listingLogs[i].updatedAt = block.timestamp;
                break;
            }
        }

        emit ListingUpdated(nft, tokenId, msg.sender, newPrice, block.timestamp);
    }

    function cancelListing(address nft, uint256 tokenId) external {
        Listing memory item = _listings[nft][tokenId];
        require(item.seller != address(0), "Not listed");
        require(item.seller == msg.sender, "Not seller");

        _removeListing(nft, tokenId, item.seller);
        emit ItemCanceled(nft, tokenId, block.timestamp);
    }

    function buyItem(address nft, uint256 tokenId) external payable nonReentrant {
        Listing memory item = _listings[nft][tokenId];
        require(item.seller != address(0), "Not listed");
        require(item.seller != msg.sender, "Cannot buy your own item");
        require(IERC721(nft).getApproved(tokenId) == address(this), "Not approved");
        require(msg.value >= item.price, "Insufficient ETH");

        uint256 royaltyFee = INFT(nft).getRoyaltyOfToken(tokenId);
        address creator = INFT(nft).getCreatorOfToken(tokenId);

        uint256 sellerAmount = item.price - royaltyFee;

        delete _listings[nft][tokenId];
        _removeListing(nft, tokenId, item.seller);

        // Update the listing log
        for (uint i = _listingLogs.length - 1; i >= 0; i--) {
            if (_listingLogs[i].nft == nft && 
                _listingLogs[i].tokenId == tokenId && 
                _listingLogs[i].seller == item.seller && 
                _listingLogs[i].listedAt == item.listedAt
            ) {
                _listingLogs[i].soldAt = block.timestamp;
                break;
            }
        }

        IERC721(nft).safeTransferFrom(item.seller, msg.sender, tokenId);
        if (royaltyFee > 0) payable(creator).transfer(royaltyFee);
        payable(item.seller).transfer(sellerAmount);

        emit ItemSold(nft, tokenId, item.seller, msg.sender, item.price, block.timestamp);
    }

    function getListingsBySeller(address seller) external view returns (Listing[] memory) {
        return _sellerListings[seller];
    }

    function getLatestListings(uint256 limit, uint256 offset) external view returns (ListingLogInfo[] memory) {
        uint256 totalListings = _listingLogs.length;

        if (offset >= totalListings) {
            return new ListingLogInfo[](0); // Return empty array if offset is out of bounds
        }

        if (limit <= 0) {
            limit = 10; // Default limit if not specified
        }

        uint256 countValidListings = 0;
        uint256 startIndex = totalListings - 1;
        for (uint i = totalListings - 1; i >= 0; i--) {
            if (_listingLogs[i].canceledAt > 0 || _listingLogs[i].soldAt > 0) {
                continue;
            } else {
                countValidListings++;
                if (countValidListings >= limit + offset) {
                    startIndex = i;
                    break;
                }
            }
        }

        if (countValidListings == 0 || countValidListings <= offset) {
            return new ListingLogInfo[](0); // Return empty array if no valid listings
        } else if (countValidListings <= limit + offset) {
            limit = countValidListings - offset; // Adjust limit if there are fewer valid listings than requested
        } else if (countValidListings < limit) {
            limit = countValidListings; // Adjust limit if there are fewer valid listings than requested
        }

        ListingLogInfo[] memory listings = new ListingLogInfo[](limit);
        uint256 currentIndex = 0;
        for (uint i = startIndex; i < totalListings; i++) {
            if (_listingLogs[i].canceledAt > 0 || _listingLogs[i].soldAt > 0) {
                continue; // Skip canceled or sold listings
            }
            listings[currentIndex] = _listingLogs[i];
            currentIndex++;
            if (currentIndex >= limit) {
                break; // Stop if we reached the limit
            }
        }
        return listings;
    }

    function getAllListings() external view returns (ListingLogInfo[] memory) {
        uint256 totalListings = _listingLogs.length;
        uint256 countValidListings = 0;
        for (uint i = 0; i < totalListings; i++) {
            if (_listingLogs[i].canceledAt > 0 || _listingLogs[i].soldAt > 0) {
                continue; // Skip canceled or sold listings
            } else {
                countValidListings++;
            }
        }

        if (countValidListings == 0) {
            return new ListingLogInfo[](0); // Return empty array if no valid listings
        }

        ListingLogInfo[] memory listings = new ListingLogInfo[](countValidListings);
        uint256 currentIndex = 0;
        for (uint i = 0; i < totalListings; i++) {
            if (_listingLogs[i].canceledAt > 0 || _listingLogs[i].soldAt > 0) {
                continue; // Skip canceled or sold listings
            }
            listings[currentIndex] = _listingLogs[i];
            currentIndex++;
        }
        return listings;
    }

    function getListingById(address nft, uint256 tokenId) external view returns (Listing memory) {
        return _listings[nft][tokenId];
    }

    function _removeListing(address nft, uint256 tokenId, address seller) internal {
        delete _listings[nft][tokenId];
        Listing[] storage items = _sellerListings[seller];
        for (uint i = 0; i < items.length; i++) {
            if (items[i].nft == nft && items[i].tokenId == tokenId) {
                items[i] = items[items.length - 1];
                items.pop();
                break;
            }
        }

        // Update the listing log
        for (uint i = _listingLogs.length - 1; i >= 0; i--) {
            if (_listingLogs[i].nft == nft && 
                _listingLogs[i].tokenId == tokenId && 
                _listingLogs[i].seller == seller && 
                _listingLogs[i].listedAt == items[i].listedAt
            ) {
                _listingLogs[i].canceledAt = block.timestamp;
                break;
            }
        }
    }
}
