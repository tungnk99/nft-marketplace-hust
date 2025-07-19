import { ethers } from 'ethers';
import { NFT, NFTTransaction } from '../contexts/NFTContext';

// Import contract addresses
import contractAddresses from '../../contracts/contract_addresses.json';
export const marketplaceContractAddress = contractAddresses.NFTMarketplacev2;
import NFTv2ABI from '../../contracts/NFTv2_abi.json';
import NFTMarketplacev2ABI from '../../contracts/NFTMarketplacev2_abi.json';

const nftContractAddress = contractAddresses.NFTv2;
const nftContractABI = NFTv2ABI.abi;
const marketplaceContractABI = NFTMarketplacev2ABI.abi;

export class BlockchainService {
  private static instance: BlockchainService;
  private nftContract: ethers.Contract;
  private marketplaceContract: ethers.Contract;
  private provider: ethers.BrowserProvider;
  private signer: ethers.JsonRpcSigner | null = null;

  private constructor() {
    // Initialize provider
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.initializeContracts();
    } else {
      throw new Error('MetaMask is not installed');
    }
  }

  public static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }

  private async initializeContracts() {
    try {
      // Get signer
      this.signer = await this.provider.getSigner();
      
      // Initialize contracts
      this.nftContract = new ethers.Contract(
        nftContractAddress,
        nftContractABI,
        this.signer
      );
      
      this.marketplaceContract = new ethers.Contract(
        marketplaceContractAddress,
        marketplaceContractABI,
        this.signer
      );
    } catch (error) {
      console.error('Error initializing contracts:', error);
    }
  }

  public async isApprovedForAll(owner: string, operator: string): Promise<boolean> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }
      return await this.nftContract.isApprovedForAll(owner, operator);
    } catch (error) {
      console.error('Error checking approval:', error);
      throw error;
    }
  }

  // Approve an address to transfer a specific NFT
  public async approve(address: string, tokenId: string): Promise<boolean> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }
      return await this.nftContract.approve(address, tokenId);
    } catch (error) {
      console.error('Error approving:', error);
      throw error;
    }
  }

  public async approveToMarketplace(tokenId: string): Promise<boolean> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }
      return await this.nftContract.approve(marketplaceContractAddress, tokenId);  
    } catch (error) {
      console.error('Error approving to marketplace:', error);
      throw error;
    }
  }
  
  public async getApprovalStatus(tokenId: string): Promise<boolean> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }
      // Only pass tokenId to getApproved (ERC-721 standard)
      const approvedAddress = await this.nftContract.getApproved(tokenId);
      return approvedAddress.toLowerCase() === marketplaceContractAddress.toLowerCase();
    } catch (error) {
      console.error('Error getting approval status:', error);
      throw error;
    }
  }

  // Set approval for all NFTs to an operator
  public async setApprovalForAll(operator: string, approved: boolean): Promise<boolean> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }
      return await this.nftContract.setApprovalForAll(operator, approved);
    } catch (error) {
      console.error('Error setting approval:', error);  
      throw error;
    }
  }

  public async setApprovalForAllToMarketplace(approved: boolean): Promise<boolean> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }
      return await this.nftContract.setApprovalForAll(marketplaceContractAddress, approved);
    } catch (error) {
      console.error('Error setting approval for all to marketplace:', error);
      throw error;
    }
  }

  /*
    Mint NFT. cid is the IPFS CID of the NFT.
    cid: string
    royaltyFee: number (percentage, 0-100)
    Returns: string (NFT ID)
  */
  public async mintNFT(cid: string, royaltyFee: number): Promise<string> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }

      // Validate royalty fee (0-100%)
      if (royaltyFee < 0 || royaltyFee > 100) {
        throw new Error('Royalty fee must be between 0% and 100%');
  }

      console.log('Minting NFT with:', {
        cid,
        royaltyFee: royaltyFee,
        royaltyPercentage: royaltyFee
      });
      
      // Call mint function on smart contract with percentage value
      const tx = await this.nftContract.mint(cid, royaltyFee);
      const receipt = await tx.wait();
      
      // Get the minted token ID from the event
      const mintEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = this.nftContract.interface.parseLog(log);
          return parsed?.name === 'NFTMinted';
        } catch {
          return false;
        }
      });
      
      if (mintEvent) {
        const parsed = this.nftContract.interface.parseLog(mintEvent);
        return parsed?.args.tokenId.toString();
      }
      
      throw new Error('Failed to get minted token ID');
    } catch (error) {
      console.error('Error minting NFT:', error);
      throw error;
    }
  }
  /*
    Buy NFT. nftId is the NFT id.
    Returns: boolean, true if successful, false if failed
  */
  public async buyNFT(nftId: string): Promise<boolean> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }

      // Get listing info to know the price
      const listing = await this.marketplaceContract.getListingById(
        contractAddresses.NFTv2,
        nftId
      );

      if (!listing || listing.seller === ethers.ZeroAddress) {
        throw new Error('NFT is not listed for sale');
      }

      // Buy the NFT with the correct price
      const tx = await this.marketplaceContract.buyItem(
        contractAddresses.NFTv2,
        nftId,
        { value: listing.price }
      );
      
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error buying NFT:', error);
      throw error;
    }
  }

  /*
    List NFT to marketplace for sale.
    nftId: string
    price: number (in ETH)
    Returns: boolean, true if successful, false if failed
  */
  public async listNFT(nftId: string, price: number): Promise<boolean> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }

      // Convert price to wei
      const priceInWei = ethers.parseEther(price.toString());
      
      // Get listing fee
      const listingFee = await this.marketplaceContract.getListingFee();
      
      // List the NFT
      const tx = await this.marketplaceContract.listItem(
        contractAddresses.NFTv2,
        nftId,
        priceInWei,
        { value: listingFee }
      );
      
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error listing NFT:', error);
      throw error;
    }
  }

  /*
    Delist NFT from marketplace.
    nftId: string
    Returns: boolean, true if successful, false if failed
  */
  public async delistNFT(nftId: string): Promise<boolean> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }

      const tx = await this.marketplaceContract.cancelListing(
        contractAddresses.NFTv2,
        nftId
      );
      
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error delisting NFT:', error);
      throw error;
    }
  }

  /*
    Update price of NFT on marketplace.
    nftId: string
    newPrice: number (in ETH)
    Returns: boolean, true if successful, false if failed
  */
  public async updatePrice(nftId: string, newPrice: number): Promise<boolean> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }

      const priceInWei = ethers.parseEther(newPrice.toString());
      
      const tx = await this.marketplaceContract.updateListingPrice(
        contractAddresses.NFTv2,
        nftId,
        priceInWei
      );
      
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error updating NFT price:', error);
      throw error;
    }
  }

  /*
    Get NFTs from marketplace.
    Returns: NFT[]
  */
  public async getNFTsFromMarketplace(): Promise<NFT[]> {
    
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }

      const listings = await this.marketplaceContract.getAllListings();
      
      const nfts: NFT[] = [];

      for (const listing of listings) {
        // Only include active listings (not canceled or sold)
        if (listing.canceledAt === 0n && listing.soldAt === 0n) {
          try {
            const tokenInfo = await this.nftContract.getTokenInfoById(listing.tokenId.toString());
            
            const nft = {
              id: listing.tokenId.toString(),
              price: Number(ethers.formatEther(listing.price)),
              owner: tokenInfo.owner,
              creator: tokenInfo.creator,
              isListing: true,
              createdAt: new Date(Number(tokenInfo.mintedAt) * 1000),
              royaltyFee: Number(tokenInfo.royaltyFee),
              cid: tokenInfo.tokenURI,
              lastSoldPrice: Number(ethers.formatEther(tokenInfo.lastSoldPrice)) || 0 // Last sold price in ETH
            };
            
            
            nfts.push(nft);
          } catch (error) {
            console.error(`❌ Error getting token info for ${listing.tokenId}:`, error);
          }
        } else {
          console.log(`⏭️ Skipping inactive listing for token ${listing.tokenId}:`, {
            canceledAt: listing.canceledAt,
            soldAt: listing.soldAt
          });
        }
      }

      return nfts;
    } catch (error) {
      console.error('❌ Error getting NFTs from marketplace:', error);
      throw error;
    }
  }

  /*
    Get NFTs from user.
    userAddress: string
    Returns: NFT[]
  */
  public async getNFTsFromUser(userAddress: string): Promise<NFT[]> {
    
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }

      const tokenInfos = await this.nftContract.getTokenInfoByOwner(userAddress);
      
      const nfts: NFT[] = [];

      for (const tokenInfo of tokenInfos) {
        try {
          // Check if NFT is listed on marketplace
          const listing = await this.marketplaceContract.getListingById(
            contractAddresses.NFTv2,
            tokenInfo.tokenId.toString()
          );
          const isListing = listing && 
                           listing.seller !== ethers.ZeroAddress && 
                           (listing.canceledAt === 0 || listing.canceledAt === 0n || listing.canceledAt === null || listing.canceledAt === undefined) &&
                           (listing.soldAt === 0 || listing.soldAt === 0n || listing.soldAt === null || listing.soldAt === undefined);
          
          const nft = {
            id: tokenInfo.tokenId.toString(),
            price: isListing ? Number(ethers.formatEther(listing.price)) : 0,
            owner: tokenInfo.owner,
            creator: tokenInfo.creator,
            isListing,
            createdAt: new Date(Number(tokenInfo.mintedAt) * 1000),
            royaltyFee: Number(tokenInfo.royaltyFee),
            cid: tokenInfo.tokenURI,
            lastSoldPrice: Number(ethers.formatEther(tokenInfo.lastSoldPrice)) || 0 // Last sold price in ETH
          };
          
          // Validation: If NFT is listed, ensure it has valid listing data
          if (isListing) {
            if (!listing || listing.seller === ethers.ZeroAddress) {
              console.warn(`⚠️ NFT ${nft.id} marked as listed but has invalid seller data`);
            }
            if (nft.price <= 0) {
              console.warn(`⚠️ NFT ${nft.id} marked as listed but has invalid price: ${nft.price}`);
            }
          }
          
          nfts.push(nft);
        } catch (error) {
          console.error(`❌ Error processing token ${tokenInfo.tokenId}:`, error);
        }
      }

      return nfts;
    } catch (error) {
      console.error('❌ Error getting NFTs from user:', error);
      throw error;
    }
  }

  public async getListingInfo(nftId: string): Promise<{
    isListed: boolean;
    price: number;
    seller: string;
    canceledAt: number;
    soldAt: number;
  }> {
    
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }
      const listing = await this.marketplaceContract.getListingById(
        contractAddresses.NFTv2,
        nftId
      );
      
      // Check if listing exists and is active
      const isListed = listing && 
                      listing.seller !== ethers.ZeroAddress && 
                      (listing.canceledAt === 0 || listing.canceledAt === 0n || listing.canceledAt === null || listing.canceledAt === undefined) &&
                      (listing.soldAt === 0 || listing.soldAt === 0n || listing.soldAt === null || listing.soldAt === undefined);
      
      const result = {
        isListed,
        price: isListed ? Number(ethers.formatEther(listing.price)) : 0,
        seller: listing?.seller || ethers.ZeroAddress,
        canceledAt: Number(listing?.canceledAt || 0n),
        soldAt: Number(listing?.soldAt || 0n),
      };

      return result;
    } catch (error) {
      console.error(`❌ Error getting listing info for token ${nftId}:`, error);
      // Return default values if listing doesn't exist
      const defaultResult = {
        isListed: false,
        price: 0,
        seller: ethers.ZeroAddress,
        canceledAt: 0,
        soldAt: 0,
      };
      
      return defaultResult;
    }
  }

  /*
    Get NFT info.
    nftId: string
    Returns: NFT
  */
  public async getNFTInfo(nftId: string): Promise<NFT> {
    
    const tokenInfo = await this.nftContract.getTokenInfoById(nftId);
    const listingInfo = await this.getListingInfo(nftId);
    
    const nft = {
      id: tokenInfo.tokenId.toString(),
      price: listingInfo.price,
      owner: tokenInfo.owner,
      creator: tokenInfo.creator,
      isListing: listingInfo.isListed,
      createdAt: new Date(Number(tokenInfo.mintedAt) * 1000),
      royaltyFee: Number(tokenInfo.royaltyFee),
      cid: tokenInfo.tokenURI,
      lastSoldPrice: Number(ethers.formatEther(tokenInfo.lastSoldPrice)) || 0 // Last sold price in ETH
    };
    
    return nft;
  }

  /*
    Check if NFT is listed on marketplace.
    nftId: string
    Returns: boolean, true if listed, false if not
  */
  public async isNFTListed(nftId: string): Promise<boolean> {
    
    try {
      const listing = await this.marketplaceContract.getListingById(
        contractAddresses.NFTv2,
        nftId
      );
      const isListed = listing && 
                      listing.seller !== ethers.ZeroAddress && 
                      (listing.canceledAt === 0 || listing.canceledAt === 0n || listing.canceledAt === null || listing.canceledAt === undefined) &&
                      (listing.soldAt === 0 || listing.soldAt === 0n || listing.soldAt === null || listing.soldAt === undefined);

      
      return isListed;
    } catch (error) {
      console.error(`❌ Error checking listing status for NFT ${nftId}:`, error);
      // Nếu lỗi (ví dụ: chưa từng được list), trả về false
      console.log(`📋 NFT ${nftId} not listed (error occurred)`);
      return false;
    }
  }

  /* Get historical transactions of a NFT
     nftId: string
     Returns: Array of transaction objects
  */
  public async getNFTHistoricalTransactions(nftId: string): Promise<NFTTransaction[]> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }

      const transactions: NFTTransaction[] = [];
      const transactionsFromBlockchain = await this.marketplaceContract.getHistoryTransactionsByNFT(nftContractAddress, nftId);

      for (const tx of transactionsFromBlockchain) {
        transactions.push({
          id: tx.tokenId,
          seller: tx.seller,
          buyer: tx.buyer,
          price: Number(ethers.formatEther(tx.price)),
          listedAt: new Date(Number(tx.listedAt) * 1000),
          updatedAt: new Date(Number(tx.updatedAt) * 1000),
          soldAt: new Date(Number(tx.soldAt) * 1000),
        });
      }

      return transactions;
    } catch (error) {
      console.error(`❌ Error getting historical transactions for NFT ${nftId}:`, error);
      throw error;
    }


  }

  /*
    Transfer NFT to another address.
    from: string (current owner)
    to: string (recipient address)
    tokenId: string
    Returns: boolean, true if successful, false if failed
  */
  public async transferNFT(from: string, to: string, tokenId: string): Promise<boolean> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }
      // Call safeTransferFrom(from, to, tokenId)
      const tx = await this.nftContract["safeTransferFrom(address,address,uint256)"](from, to, tokenId);
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error transferring NFT:', error);
      throw error;
    }
  }

  /*
    Get NFTs created by a specific address.
    creatorAddress: string
    Returns: NFT[]
  */

  public async getTotalRoyaltyFeesByCreatorAndToken(tokenId: string): Promise<number> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }
      const account = await this.signer.getAddress();
      const totalRoyaltyFees = await this.marketplaceContract.getTotalRoyaltyFeesByCreatorAndToken(
        nftContractAddress,
        account,
        tokenId
      );
      return totalRoyaltyFees;
    } catch (error) {
      console.error(`❌ Error getting total royalty fees for creator and token ${tokenId}:`, error);
      throw error;
    }
  }
  
  public async getNFTsByCreator(creatorAddress: string): Promise<NFT[]> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }

      const tokenInfos = await this.nftContract.getTokenInfoByCreator(creatorAddress);
      
      const nfts: NFT[] = [];

      for (const tokenInfo of tokenInfos) {
        try {
          // Check if NFT is listed on marketplace
          const listing = await this.marketplaceContract.getListingById(
            contractAddresses.NFTv2,
            tokenInfo.tokenId.toString()
          );
          const isListing = listing && 
                           listing.seller !== ethers.ZeroAddress && 
                           (listing.canceledAt === 0 || listing.canceledAt === 0n || listing.canceledAt === null || listing.canceledAt === undefined) &&
                           (listing.soldAt === 0 || listing.soldAt === 0n || listing.soldAt === null || listing.soldAt === undefined);
          const totalRoyaltyFees = await this.getTotalRoyaltyFeesByCreatorAndToken(tokenInfo.tokenId.toString());
          const nft = {
            id: tokenInfo.tokenId.toString(),
            price: isListing ? Number(ethers.formatEther(listing.price)) : 0,
            owner: tokenInfo.owner,
            creator: tokenInfo.creator,
            isListing,
            createdAt: new Date(Number(tokenInfo.mintedAt) * 1000),
            royaltyFee: Number(tokenInfo.royaltyFee),
            cid: tokenInfo.tokenURI,
            lastSoldPrice: Number(ethers.formatEther(tokenInfo.lastSoldPrice)) || 0,
            totalRoyaltyFees: totalRoyaltyFees
          };
          
          nfts.push(nft);
        } catch (error) {
          console.error(`❌ Error processing created token ${tokenInfo.tokenId}:`, error);
        }
      }

      return nfts;
    } catch (error) {
      console.error('❌ Error getting NFTs by creator:', error);
      throw error;
    }
  }

  /*
    Get royalty earnings for a specific NFT.
    nftId: string
    Returns: number (total royalty earnings in ETH)
  */
  public async getRoyaltyEarnings(nftId: string): Promise<number> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }

      // Get historical transactions for this NFT
      const transactions = await this.marketplaceContract.getHistoryTransactionsByNFT(
        contractAddresses.NFTv2, 
        nftId
      );

      let totalRoyaltyEarnings = 0;

      for (const tx of transactions) {
        // Only count completed sales (soldAt > 0)
        if (tx.soldAt > 0n) {
          const salePrice = Number(ethers.formatEther(tx.price));
          
          // Get NFT info to get royalty fee percentage
          const tokenInfo = await this.nftContract.getTokenInfoById(nftId);
          const royaltyFeePercentage = Number(tokenInfo.royaltyFee);
          
          // Calculate royalty earnings for this sale
          const royaltyEarnings = (salePrice * royaltyFeePercentage) / 100;
          totalRoyaltyEarnings += royaltyEarnings;
        }
      }

      return totalRoyaltyEarnings;
    } catch (error) {
      console.error(`❌ Error getting royalty earnings for NFT ${nftId}:`, error);
      return 0;
    }
  }
}

// Export singleton instance
export const blockchainService = BlockchainService.getInstance(); 