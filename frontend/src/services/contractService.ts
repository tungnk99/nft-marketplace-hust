import { ethers } from 'ethers';
import { NFT } from '../contexts/NFTContext';

// Import contract addresses
import contractAddresses from '../../contracts/contract_addresses.json';
import NFTv2ABI from '../../contracts/NFTv2_abi.json';
import NFTMarketplacev2ABI from '../../contracts/NFTMarketplacev2_abi.json';

const nftContractAddress = contractAddresses.NFTv2;
const marketplaceContractAddress = contractAddresses.NFTMarketplacev2;  
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

  /*
    Mint NFT. cid is the IPFS CID of the NFT.
    cid: string
    royaltyFee: bigint (in wei)
    Returns: string (NFT ID)
  */
  public async mintNFT(cid: string, royaltyFee: bigint): Promise<string> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }

      // Convert wei to basis points (assuming 1 ETH = 10000 basis points for royalty)
      // This is a simplified conversion - you might want to adjust based on your smart contract logic
      const royaltyBasisPoints = Number(royaltyFee) / (10 ** 14); // Convert wei to basis points
      
      // Call mint function on smart contract
      const tx = await this.nftContract.mint(cid, royaltyBasisPoints);
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
    Get NFT by id.
    nftId: string
    Returns: NFT
  */
  public async getNFTById(nftId: string): Promise<NFT> {
    try {
      if (!this.signer) {
        await this.initializeContracts();
      }

      const tokenInfo = await this.nftContract.getTokenInfoById(nftId);
      
      return {
        id: nftId,
        price: 0, // Price is managed by marketplace
        owner: tokenInfo.owner,
        creator: tokenInfo.creator,
        isListing: false, // Will be updated by marketplace data
        createdAt: new Date(Number(tokenInfo.mintedAt) * 1000),
        royaltyFee: BigInt(tokenInfo.royaltyFee), // Keep as wei
        cid: tokenInfo.tokenURI, // Assuming tokenURI is the CID
      };
    } catch (error) {
      console.error('Error getting NFT by ID:', error);
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
            
            nfts.push({
              id: listing.tokenId.toString(),
              price: Number(ethers.formatEther(listing.price)),
              owner: tokenInfo.owner,
              creator: tokenInfo.creator,
              isListing: true,
              createdAt: new Date(Number(tokenInfo.mintedAt) * 1000),
              royaltyFee: BigInt(tokenInfo.royaltyFee),
              cid: tokenInfo.tokenURI,
            });
          } catch (error) {
            console.error(`Error getting token info for ${listing.tokenId}:`, error);
          }
        }
      }

      return nfts;
    } catch (error) {
      console.error('Error getting NFTs from marketplace:', error);
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

          const isListing = listing && listing.seller !== ethers.ZeroAddress && 
                           listing.canceledAt === 0n && listing.soldAt === 0n;

          nfts.push({
            id: tokenInfo.tokenId.toString(),
            price: isListing ? Number(ethers.formatEther(listing.price)) : 0,
            owner: tokenInfo.owner,
            creator: tokenInfo.creator,
            isListing,
            createdAt: new Date(Number(tokenInfo.mintedAt) * 1000),
            royaltyFee: BigInt(tokenInfo.royaltyFee),
            cid: tokenInfo.tokenURI,
          });
        } catch (error) {
          console.error(`Error processing token ${tokenInfo.tokenId}:`, error);
        }
      }

      return nfts;
    } catch (error) {
      console.error('Error getting NFTs from user:', error);
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
      const isListed = listing && listing.seller !== ethers.ZeroAddress && 
                      listing.canceledAt === 0n && listing.soldAt === 0n;
      
      return {
        isListed,
        price: isListed ? Number(ethers.formatEther(listing.price)) : 0,
        seller: listing?.seller || ethers.ZeroAddress,
        canceledAt: Number(listing?.canceledAt || 0n),
        soldAt: Number(listing?.soldAt || 0n),
      };
    } catch (error) {
      console.error('Error getting listing info:', error);
      // Return default values if listing doesn't exist
      return {
        isListed: false,
        price: 0,
        seller: ethers.ZeroAddress,
        canceledAt: 0,
        soldAt: 0,
      };
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
    return {
      id: tokenInfo.tokenId.toString(),
      price: listingInfo.price,
      owner: tokenInfo.owner,
      creator: tokenInfo.creator,
      isListing: listingInfo.isListed,
      createdAt: new Date(Number(tokenInfo.mintedAt) * 1000),
      royaltyFee: BigInt(tokenInfo.royaltyFee),
      cid: tokenInfo.tokenURI,
    }
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
      return listing && listing.seller !== ethers.ZeroAddress && listing.canceledAt === 0n && listing.soldAt === 0n;
    } catch (error) {
      // Nếu lỗi (ví dụ: chưa từng được list), trả về false
      return false;
    }
  }
}

// Export singleton instance
export const blockchainService = BlockchainService.getInstance(); 