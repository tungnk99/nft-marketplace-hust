// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface INFT {
    function getCreatorOfToken(uint256 tokenId) external view returns (address);
    function getRoyaltyOfToken(uint256 tokenId) external view returns (uint256);
    function getTokensByCreator(address creator) external view returns (uint256[] memory);
    function updateListingStatus(uint256 tokenId, bool listingStatus) external;
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
        address buyer;
    }

    struct RoyaltyInfo {
        uint256 tokenId;
        uint256 totalRoyaltyFee;
    }

    struct HistoricalTransaction {
        uint256 blockOfFirstTransaction;
        uint256 blockOfLastTransaction;
        uint256 firstTransactionTimestamp;
        uint256 lastTransactionTimestamp;
        uint256 transactionCount;
    }

    // Mapping from NFT address and tokenId to Listing
    mapping(address => mapping(uint256 => Listing)) private _listings;
    // Mapping from seller address to their listings
    mapping(address => Listing[]) private _sellerListings;
    // Mapping from creator address to their created NFTs to total royalty fees
    mapping(address => mapping(address => mapping(uint256 => uint256))) private _totalRoyaltyFeesByCreator;
    // Mapping from NFT address and tokenId to historical transactions
    mapping(address => mapping(uint256 => HistoricalTransaction)) private _historicalTransactions;

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
        require(price > 100, "Price must be > 100 wei");
        require(_listings[nft][tokenId].seller == address(0), "Already listed");

        IERC721 token = IERC721(nft);
        require(token.ownerOf(tokenId) == msg.sender, "Not owner");
        // require(token.getApproved(tokenId) == address(this), "Not approved");
        require(token.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");

        _listings[nft][tokenId] = Listing(nft, tokenId, msg.sender, price, block.timestamp, block.timestamp);
        INFT(nft).updateListingStatus(tokenId, true); // Update listing status in NFT contract
        _sellerListings[msg.sender].push(_listings[nft][tokenId]);
        _listingLogs.push(ListingLogInfo(nft, tokenId, msg.sender, price, block.timestamp, block.timestamp, 0, 0, address(0)));
        // payable(address(this)).transfer(_listingFee); // Transfer listing fee to contract

        emit ItemListed(nft, tokenId, msg.sender, price, block.timestamp);
    }

    function updateListingPrice(address nft, uint256 tokenId, uint256 newPrice) external {
        Listing storage item = _listings[nft][tokenId];
        require(item.seller != address(0), "Not listed");
        require(item.seller == msg.sender, "Not seller");
        require(newPrice > 100, "Price must be > 100 wei");
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
        for (uint256 i = _listingLogs.length; i > 0; i--) {
            if (_listingLogs[i - 1].nft == nft && 
                _listingLogs[i - 1].tokenId == tokenId && 
                _listingLogs[i - 1].seller == msg.sender && 
                _listingLogs[i - 1].listedAt == item.listedAt
            ) {
                _listingLogs[i - 1].price = newPrice;
                _listingLogs[i - 1].updatedAt = block.timestamp;
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
        INFT(nft).updateListingStatus(tokenId, false); // Update listing status in NFT contract
        emit ItemCanceled(nft, tokenId, block.timestamp);
    }

    function buyItem(address nft, uint256 tokenId) external payable nonReentrant {
        Listing memory item = _listings[nft][tokenId];
        require(item.seller != address(0), "Not listed");
        require(item.seller != msg.sender, "Cannot buy your own item");
        // require(IERC721(nft).getApproved(tokenId) == address(this), "Not approved");
        require(IERC721(nft).isApprovedForAll(item.seller, address(this)), "Marketplace not approved");
        require(msg.value >= item.price, "Insufficient ETH");

        uint256 royaltyPercent = INFT(nft).getRoyaltyOfToken(tokenId);
        address creator = INFT(nft).getCreatorOfToken(tokenId);

        uint256 sellerAmount = item.price;
        uint256 royaltyFee = 0;

        if (creator != item.seller) {
            royaltyFee = (item.price * royaltyPercent) / 100;
            require(royaltyFee <= msg.value, "Royalty fee exceeds payment");
            sellerAmount = item.price - royaltyFee;
        }

        if (royaltyFee > 0) {
            _totalRoyaltyFeesByCreator[nft][creator][tokenId] += royaltyFee; // Track total royalty fees by creator
        }

        if (creator == item.seller) {
            _totalRoyaltyFeesByCreator[nft][creator][tokenId] += sellerAmount; // If creator is the seller, add royalty to their total
        }

        IERC721(nft).safeTransferFrom(item.seller, msg.sender, tokenId);
        if (royaltyFee > 0) payable(creator).transfer(royaltyFee);
        payable(item.seller).transfer(sellerAmount);

        INFT(nft).updateListingStatus(tokenId, false); // Update listing status in NFT contract

        // delete _listings[nft][tokenId];
        _removeListing(nft, tokenId, item.seller);

        // Update the listing log
        for (uint256 i = _listingLogs.length; i > 0; i--) {
            if (_listingLogs[i - 1].nft == nft && 
                _listingLogs[i - 1].tokenId == tokenId && 
                _listingLogs[i - 1].seller == item.seller && 
                _listingLogs[i - 1].listedAt == item.listedAt
            ) {
                _listingLogs[i - 1].soldAt = block.timestamp;
                _listingLogs[i - 1].buyer = msg.sender;
                break;
            }
        }

        IERC721(nft).safeTransferFrom(item.seller, msg.sender, tokenId);
        if (royaltyFee > 0) payable(creator).transfer(royaltyFee);
        payable(item.seller).transfer(sellerAmount);

        // Update historical transactions
        HistoricalTransaction storage history = _historicalTransactions[nft][tokenId];
        if (history.transactionCount == 0) {
            history.blockOfFirstTransaction = block.number;
            history.firstTransactionTimestamp = block.timestamp;
        }
        history.blockOfLastTransaction = block.number;
        history.lastTransactionTimestamp = block.timestamp;
        history.transactionCount++;

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
        for (uint256 i = totalListings; i > 0; i--) {
            if (_listingLogs[i - 1].canceledAt > 0 || _listingLogs[i - 1].soldAt > 0) {
                continue;
            } else {
                countValidListings++;
                if (countValidListings >= limit + offset) {
                    startIndex = i - 1;
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
        if (_listingLogs.length == 0) {
            ListingLogInfo[] memory emptyListings;
            return emptyListings; // Return empty array if no listings
        }

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

    function getLastSoldPrice(address nft, uint256 tokenId) external view returns (uint256) {
        for (uint256 i = _listingLogs.length; i > 0; i--) {
            if (_listingLogs[i - 1].nft == nft && _listingLogs[i - 1].tokenId == tokenId && _listingLogs[i - 1].soldAt > 0) {
                return _listingLogs[i - 1].price;
            }
        }
        return 0; // Return 0 if no sold listing found
    }

    function _removeListing(address nft, uint256 tokenId, address seller) internal {
        delete _listings[nft][tokenId];
        Listing[] storage items = _sellerListings[seller];
        uint256 listedAt = 0;
        for (uint i = 0; i < items.length; i++) {
            if (items[i].nft == nft && items[i].tokenId == tokenId) {
                listedAt = items[i].listedAt;
                items[i] = items[items.length - 1];
                items.pop();
                break;
            }
        }

        // Update the listing log
        for (uint i = _listingLogs.length; i > 0; i--) {
            if (_listingLogs[i - 1].nft == nft && 
                _listingLogs[i - 1].tokenId == tokenId && 
                _listingLogs[i - 1].seller == seller && 
                _listingLogs[i - 1].listedAt == listedAt
            ) {
                _listingLogs[i - 1].canceledAt = block.timestamp;
                break;
            }
        }
    }

    function getHistoryTransactionsByNFT(address nft, uint256 tokenId) external view returns (ListingLogInfo[] memory) {
        uint256 totalLogs = _listingLogs.length;
        uint256 count = 0;

        for (uint256 i = 0; i < totalLogs; i++) {
            if (_listingLogs[i].nft == nft && _listingLogs[i].tokenId == tokenId && _listingLogs[i].soldAt > 0) {
                count++;
            }
        }

        ListingLogInfo[] memory logs = new ListingLogInfo[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < totalLogs; i++) {
            if (_listingLogs[i].nft == nft && _listingLogs[i].tokenId == tokenId && _listingLogs[i].soldAt > 0) {
                logs[index] = _listingLogs[i];
                index++;
            }
        }

        return logs;
    }

    function getTotalRoyaltyFeesByCreator(address nft, address creator) external view returns (RoyaltyInfo[] memory) {
        uint256[] memory tokenIds = INFT(nft).getTokensByCreator(creator);
        RoyaltyInfo[] memory royaltyInfos = new RoyaltyInfo[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            uint256 totalRoyaltyFee = _totalRoyaltyFeesByCreator[nft][creator][tokenId];
            royaltyInfos[i] = RoyaltyInfo(tokenId, totalRoyaltyFee);
        }
        return royaltyInfos;
    }

    function getTotalRoyaltyFeesByCreatorAndToken(address nft, address creator, uint256 tokenId) external view returns (uint256) {
        return _totalRoyaltyFeesByCreator[nft][creator][tokenId];
    }

    function getHistoricalTransaction(address nft, uint256 tokenId) external view returns (HistoricalTransaction memory) {
        return _historicalTransactions[nft][tokenId];
    }
}
