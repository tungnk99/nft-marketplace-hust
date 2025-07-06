import { NFTMetadata } from './ipfsMetadataService';

export interface MockNFTData {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  price: number;
  owner: string;
  creator: string;
  isForSale: boolean;
  createdAt: string;
}

export class MockMetadataService {
  private static readonly MOCK_NFT_DATA: MockNFTData[] = [
    {
      id: "1",
      name: "Cosmic Cat #001",
      description: "A mystical cat floating in space",
      image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop",
      category: "Art",
      price: 2.5,
      owner: "0x742d35Cc6634C0532925a3b8D42342637AB2B67F",
      creator: "0x742d35Cc6634C0532925a3b8D42342637AB2B67F",
      isForSale: true,
      createdAt: "2024-01-15T00:00:00.000Z"
    },
    {
      id: "2",
      name: "Digital Sunset",
      description: "Beautiful digital art of a sunset",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
      category: "Photography",
      price: 1.8,
      owner: "0x8ba1f109551bD432803012645Hac136c0532925b",
      creator: "0x8ba1f109551bD432803012645Hac136c0532925b",
      isForSale: true,
      createdAt: "2024-01-10T00:00:00.000Z"
    },
    {
      id: "3",
      name: "Abstract Dreams",
      description: "Colorful abstract digital art",
      image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop",
      category: "Art",
      price: 3.2,
      owner: "0x1234567890abcdef1234567890abcdef12345678",
      creator: "0x1234567890abcdef1234567890abcdef12345678",
      isForSale: true,
      createdAt: "2024-01-12T00:00:00.000Z"
    },
    {
      id: "4",
      name: "Neon City",
      description: "Futuristic city with neon lights",
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=400&fit=crop",
      category: "Game",
      price: 0,
      owner: "0x1234567890abcdef1234567890abcdef12345678",
      creator: "0x1234567890abcdef1234567890abcdef12345678",
      isForSale: false,
      createdAt: "2024-01-08T00:00:00.000Z"
    },
    {
      id: "5",
      name: "Music Waves",
      description: "Visual representation of sound waves",
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
      category: "Music",
      price: 0.8,
      owner: "0x9876543210fedcba9876543210fedcba98765432",
      creator: "0x9876543210fedcba9876543210fedcba98765432",
      isForSale: true,
      createdAt: "2024-01-20T00:00:00.000Z"
    }
  ];

  /**
   * Get mock NFT data by ID
   */
  static getMockNFTData(id: string): MockNFTData | undefined {
    return this.MOCK_NFT_DATA.find(nft => nft.id === id);
  }

  /**
   * Get all mock NFT data
   */
  static getAllMockNFTData(): MockNFTData[] {
    return this.MOCK_NFT_DATA;
  }

  /**
   * Convert mock NFT data to IPFS metadata format
   */
  static convertToIPFSMetadata(mockData: MockNFTData): NFTMetadata {
    return {
      name: mockData.name,
      description: mockData.description,
      image: mockData.image,
      category: mockData.category,
      attributes: [
        {
          trait_type: "Original ID",
          value: mockData.id
        },
        {
          trait_type: "Creator",
          value: mockData.creator
        },
        {
          trait_type: "Created Date",
          value: mockData.createdAt
        }
      ]
    };
  }

  /**
   * Get fallback metadata for mock NFTs (when IPFS is not available)
   */
  static getFallbackMetadata(id: string): NFTMetadata {
    const mockData = this.getMockNFTData(id);
    if (mockData) {
      return this.convertToIPFSMetadata(mockData);
    }
    
    return {
      name: `Mock NFT #${id}`,
      description: 'This is a mock NFT for demonstration purposes.',
      image: '/placeholder.svg',
      category: 'Mock',
      attributes: [
        {
          trait_type: 'Type',
          value: 'Mock NFT'
        },
        {
          trait_type: 'ID',
          value: id
        }
      ]
    };
  }
} 