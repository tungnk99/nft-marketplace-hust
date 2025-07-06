import { NFT } from '../contexts/NFTContext';
import { mockFileService } from './mockFileService';

export interface NFTData {
  id: string;
  cid: string; // IPFS CID for metadata
  price: number;
  owner: string;
  creator: string;
  isForSale: boolean;
  createdAt: string;
}

export class NFTDataService {
  private static instance: NFTDataService;
  private cachedData: NFT[] | null = null;

  private constructor() {}

  public static getInstance(): NFTDataService {
    if (!NFTDataService.instance) {
      NFTDataService.instance = new NFTDataService();
    }
    return NFTDataService.instance;
  }

  /**
   * Load mock NFT data from JSON file
   */
  public async loadBlockchainNFTs(): Promise<NFT[]> {
    // TODO: Implement blockchain data loading

    // For now, return mock data
    return this.loadMockNFTs();
  }

  public async loadMockNFTs(): Promise<NFT[]> {
    if (this.cachedData) {
      return this.cachedData;
    }

    try {
      const response = await fetch('/mock-nfts.json');
      if (!response.ok) {
        throw new Error(`Failed to load mock data: ${response.statusText}`);
      }

      const data: NFTData[] = await response.json();
      
      // Convert JSON data to NFT objects with proper Date objects
      const nfts: NFT[] = data.map(item => ({
        ...item,
        createdAt: new Date(item.createdAt)
      }));

      this.cachedData = nfts;
      return nfts;
    } catch (error) {
      console.error('Error loading mock NFT data:', error);
      // Return empty array if loading fails
      return [];
    }
  }

  /**
   * Save new NFT to mock JSON file
   */
  public async saveNFTToMock(nft: NFT): Promise<boolean> {
    try {
      // Convert NFT to NFTData format
      const nftData: NFTData = {
        ...nft,
        createdAt: nft.createdAt.toISOString()
      };

      // Load current data
      const currentData = await this.loadMockNFTs();
      
      // Add new NFT
      const updatedData = [...currentData, nft];
      
      // Convert back to JSON format
      const jsonData: NFTData[] = updatedData.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString()
      }));

      // Update cache
      this.cachedData = updatedData;
      
      // Save to file using mock service
      const saved = await mockFileService.saveNFTsToFile(jsonData);
      
      console.log('NFT saved to mock data:', nftData);
      return saved;
    } catch (error) {
      console.error('Error saving NFT to mock data:', error);
      return false;
    }
  }

  /**
   * Save new NFT to blockchain (placeholder for future implementation)
   */
  public async saveBlockchainNFT(nft: NFT): Promise<boolean> {
    try {
      // TODO: Implement actual blockchain saving
      // For now, just save to mock data
      const saved = await this.saveNFTToMock(nft);
      
      console.log('NFT saved to blockchain (mock):', nft);
      return saved;
    } catch (error) {
      console.error('Error saving NFT to blockchain:', error);
      return false;
    }
  }

  /**
   * Update NFT in mock data (for listing/delisting)
   */
  public async updateNFTInMock(nftId: string, updates: Partial<NFT>): Promise<boolean> {
    try {
      const currentData = await this.loadMockNFTs();
      
      const updatedData = currentData.map(nft => 
        nft.id === nftId ? { ...nft, ...updates } : nft
      );
      
      // Update cache
      this.cachedData = updatedData;
      
      // Convert back to JSON format and save to file
      const jsonData: NFTData[] = updatedData.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString()
      }));
      
      // Save to file using mock service
      const saved = await mockFileService.saveNFTsToFile(jsonData);
      
      console.log('NFT updated in mock data:', nftId, updates);
      return saved;
    } catch (error) {
      console.error('Error updating NFT in mock data:', error);
      return false;
    }
  }

  /**
   * Clear cached data (useful for testing or refreshing)
   */
  public clearCache(): void {
    this.cachedData = null;
  }

  /**
   * Get mock data synchronously if already loaded
   */
  public getCachedData(): NFT[] | null {
    return this.cachedData;
  }
}

// Export singleton instance
export const nftDataService = NFTDataService.getInstance(); 