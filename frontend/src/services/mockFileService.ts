import { NFTData } from './nftDataService';

/**
 * Mock service to simulate saving data to JSON file
 * In a real application, this would be a backend API endpoint
 */
export class MockFileService {
  private static instance: MockFileService;

  private constructor() {}

  public static getInstance(): MockFileService {
    if (!MockFileService.instance) {
      MockFileService.instance = new MockFileService();
    }
    return MockFileService.instance;
  }

  /**
   * Simulate saving NFT data to JSON file
   * In production, this would be a POST request to your backend
   */
  public async saveNFTsToFile(nfts: NFTData[]): Promise<boolean> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real app, this would be:
      // const response = await fetch('/api/nfts', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(nfts)
      // });
      
      console.log('Mock: Saving NFTs to file:', nfts.length, 'items');
      console.log('Mock: File content would be:', JSON.stringify(nfts, null, 2));
      
      // Simulate success
      return true;
    } catch (error) {
      console.error('Mock: Error saving to file:', error);
      return false;
    }
  }

  /**
   * Simulate updating NFT in JSON file
   */
  public async updateNFTInFile(nftId: string, updates: Partial<NFTData>): Promise<boolean> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('Mock: Updating NFT in file:', nftId, updates);
      
      // Simulate success
      return true;
    } catch (error) {
      console.error('Mock: Error updating NFT in file:', error);
      return false;
    }
  }

  /**
   * Simulate reading from JSON file
   */
  public async readNFTsFromFile(): Promise<NFTData[]> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('Mock: Reading NFTs from file');
      
      // In a real app, this would fetch from your backend
      // const response = await fetch('/api/nfts');
      // return await response.json();
      
      // For now, return empty array (data comes from public/mock-nfts.json)
      return [];
    } catch (error) {
      console.error('Mock: Error reading from file:', error);
      return [];
    }
  }
}

export const mockFileService = MockFileService.getInstance(); 