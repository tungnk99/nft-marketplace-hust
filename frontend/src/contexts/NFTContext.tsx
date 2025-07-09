import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { blockchainService } from '../services/contractService';
import { IPFSMetadataService, NFTMetadata } from '../services/ipfsMetadataService';
import { useMetaMask } from '../hooks/useMetaMask';

export interface NFT {
  id: string;
  cid: string; // IPFS CID for metadata
  price: number;
  owner: string;
  creator: string;
  isListing: boolean;
  createdAt: Date;
  royaltyFee: bigint; // Royalty fee in wei (smallest unit of ETH)
}

// Extended NFT interface with metadata loaded from IPFS
export interface NFTWithMetadata extends NFT {
  name: string;
  description: string;
  image: string;
  category: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

interface NFTContextType {
  loading: boolean;
  userAddress: string;
  buyNFT: (id: string) => Promise<void>;
  mintNFT: (cid: string, royaltyFee?: bigint) => Promise<string>;
  listNFT: (id: string, price: number) => Promise<void>;
  delistNFT: (id: string) => Promise<void>;
  getUserNFTs: () => Promise<NFT[]>;
  getMarketplaceNFTs: () => Promise<NFT[]>;
  getNFTWithMetadata: (nft: NFT) => Promise<NFTWithMetadata | null>;
  getNFTInfo: (nftId: string) => Promise<NFTWithMetadata>;
  isMetadataLoading: (cid: string) => boolean;
  isNFTListed: (nftId: string) => Promise<boolean>;
}

const NFTContext = createContext<NFTContextType | undefined>(undefined);

export const NFTProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [metadataCache, setMetadataCache] = useState<Map<string, NFTMetadata>>(new Map());
  const [metadataLoading, setMetadataLoading] = useState<Set<string>>(new Set());
  
  // Get MetaMask state
  const { account, isConnected } = useMetaMask();
  const userAddress = account || null;

  const buyNFT = useCallback(async (id: string) => {
    try {
      console.log('Buying NFT with user address:', userAddress);
      
      // Call blockchain service to buy NFT
      const success = await blockchainService.buyNFT(id);
      
      if (success) {
        // Load metadata for the updated NFT
        const updatedNFT = await blockchainService.getNFTInfo(id);
        const metadata = await IPFSMetadataService.fetchMetadata(updatedNFT.cid);
        setMetadataCache(prev => new Map(prev).set(updatedNFT.cid, metadata));
      }
    } catch (error) {
      console.error('Error buying NFT:', error);
      throw error;
    }
  }, [userAddress]);

  const mintNFT = useCallback(async (cid: string, royaltyFee: bigint = BigInt(0)): Promise<string> => {
    console.log('Minting NFT with user address:', userAddress);
    
    try {
      // TODO
      // Call blockchain service to mint NFT
      const nftId = await blockchainService.mintNFT(cid, royaltyFee);
      
      // Load metadata for the new NFT
      try {
        console.log('Loading metadata for new NFT with CID:', cid);
        const metadata = await IPFSMetadataService.fetchMetadata(cid);
        setMetadataCache(prev => new Map(prev).set(cid, metadata));
        console.log('Metadata loaded successfully for new NFT');
      } catch (error) {
        console.error('Error loading metadata for new NFT:', error);
      }
      
      return nftId; // Trả về ID của NFT mới
    } catch (error) {
      console.error('Error minting NFT:', error);
      throw error;
    }
  }, [userAddress]);

  const listNFT = useCallback(async (id: string, price: number) => {
    try {
      // Call blockchain service to list NFT
      const success = await blockchainService.listNFT(id, price);
      
      if (success) {
        // Load metadata for the updated NFT
        const updatedNFT = await blockchainService.getNFTInfo(id);
        const metadata = await IPFSMetadataService.fetchMetadata(updatedNFT.cid);
        setMetadataCache(prev => new Map(prev).set(updatedNFT.cid, metadata));
      }
    } catch (error) {
      console.error('Error listing NFT for sale:', error);
      throw error;
    }
  }, []);

  const delistNFT = useCallback(async (id: string) => {
    try {
      // Call blockchain service to delist NFT
      const success = await blockchainService.delistNFT(id);
      
      if (success) {
        // Load metadata for the updated NFT
        const updatedNFT = await blockchainService.getNFTInfo(id);
        const metadata = await IPFSMetadataService.fetchMetadata(updatedNFT.cid);
        setMetadataCache(prev => new Map(prev).set(updatedNFT.cid, metadata));
      }
    } catch (error) {
      console.error('Error delisting NFT:', error);
      throw error;
    }
  }, []);

  const getUserNFTs = useCallback(async (): Promise<NFT[]> => {
    if (!userAddress) return [];
    try {
      return await blockchainService.getNFTsFromUser(userAddress);
    } catch (error) {
      console.error('Error getting user NFTs:', error);
      return [];
    }
  }, [userAddress]);

  const getMarketplaceNFTs = useCallback(async (): Promise<NFT[]> => {
    try {
      return await blockchainService.getNFTsFromMarketplace();
    } catch (error) {
      console.error('Error getting marketplace NFTs:', error);
      return [];
    }
  }, []);

  const getNFTWithMetadata = useCallback(async (nft: NFT): Promise<NFTWithMetadata | null> => {
    // Check cache first
    let metadata = metadataCache.get(nft.cid);
    
    // If not in cache and not currently loading, try to fetch it
    if (!metadata && !metadataLoading.has(nft.cid)) {
      try {
        // Mark as loading
        setMetadataLoading(prev => new Set(prev).add(nft.cid));
        console.log(`Fetching metadata for CID: ${nft.cid}`);
        
        const fetchedMetadata = await IPFSMetadataService.fetchMetadata(nft.cid);
        
        // Update cache
        setMetadataCache(prev => new Map(prev).set(nft.cid, fetchedMetadata));
        metadata = fetchedMetadata;
      } catch (error) {
        console.error(`Failed to fetch metadata for CID ${nft.cid}:`, error);
        return null; // Return null only if fetch fails
      } finally {
        // Remove from loading set
        setMetadataLoading(prev => {
          const newSet = new Set(prev);
          newSet.delete(nft.cid);
          return newSet;
        });
      }
    }
    
    // Return combined NFT with metadata
    if (!metadata) {
      return null; // Return null if metadata is still not available
    }
    
    return {
      ...nft,
      name: metadata.name,
      description: metadata.description,
      image: metadata.image,
      category: metadata.category,
      attributes: metadata.attributes,
    };
  }, [metadataCache, metadataLoading]);

  const getNFTInfo = useCallback(async (nftId: string): Promise<NFTWithMetadata> => {
    const nft = await blockchainService.getNFTInfo(nftId);
    const metadata = await getNFTWithMetadata(nft);
    if (!metadata) {
      throw new Error('Failed to get NFT metadata');
    }
    return metadata;
  }, [getNFTWithMetadata]);

  const isNFTListed = useCallback(async (nftId: string): Promise<boolean> => {
    return await blockchainService.isNFTListed(nftId);
  }, []);

  const isMetadataLoading = useCallback((cid: string): boolean => {
    return metadataLoading.has(cid);
  }, [metadataLoading]);

  return (
    <NFTContext.Provider value={{
      loading,
      userAddress,
      buyNFT,
      mintNFT,
      listNFT,
      delistNFT,
      getUserNFTs,
      getMarketplaceNFTs,
      getNFTWithMetadata,
      getNFTInfo,
      isMetadataLoading,
      isNFTListed,
    }}>
      {children}
    </NFTContext.Provider>
  );
};

export const useNFT = () => {
  const context = useContext(NFTContext);
  if (context === undefined) {
    throw new Error('useNFT must be used within a NFTProvider');
  }
  return context;
};
