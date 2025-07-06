import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { nftDataService } from '../services/nftDataService';
import { IPFSMetadataService, NFTMetadata } from '../services/ipfsMetadataService';
import { useMetaMask } from '../hooks/useMetaMask';

export interface NFT {
  id: string;
  cid: string; // IPFS CID for metadata
  price: number;
  owner: string;
  creator: string;
  isForSale: boolean;
  createdAt: Date;
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
  nfts: NFT[];
  loading: boolean;
  userAddress: string;
  buyNFT: (id: string) => Promise<void>;
  mintNFT: (cid: string) => Promise<string>;
  listNFTForSale: (id: string, price: number) => Promise<void>;
  delistNFT: (id: string) => Promise<void>;
  getUserNFTs: () => NFT[];
  getMarketplaceNFTs: () => NFT[];
  getNFTWithMetadata: (nft: NFT) => Promise<NFTWithMetadata | null>;
  isMetadataLoading: (cid: string) => boolean;
}

const NFTContext = createContext<NFTContextType | undefined>(undefined);

export const NFTProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [metadataCache, setMetadataCache] = useState<Map<string, NFTMetadata>>(new Map());
  const [metadataLoading, setMetadataLoading] = useState<Set<string>>(new Set());
  
  // Get MetaMask state
  const { account, isConnected } = useMetaMask();
  const userAddress = account || null; // Không fallback, chỉ có khi đã kết nối

  // Load blockchain data from nftDataService
  useEffect(() => {
    const loadBlockchainData = async () => {
      try {
        setLoading(true);
        const blockchainData = await nftDataService.loadBlockchainNFTs();
        setNfts(blockchainData);
        
        // Load metadata for all NFTs
        await loadMetadataForNFTs(blockchainData);
      } catch (error) {
        console.error('Failed to load blockchain NFT data:', error);
        setNfts([]); // Set empty array if loading fails
      } finally {
        setLoading(false);
      }
    };

    loadBlockchainData();
  }, []);

  const buyNFT = useCallback(async (id: string) => {
    try {
      console.log('Buying NFT with user address:', userAddress);
      const updatedNFTs = nfts.map(nft => 
        nft.id === id ? { ...nft, owner: userAddress, isForSale: false } : nft
      );
      
      setNfts(updatedNFTs);
      
      // Update in data service
      const nftToUpdate = nfts.find(nft => nft.id === id);
      if (nftToUpdate) {
        await nftDataService.updateNFTInMock(id, {
          owner: userAddress,
          isForSale: false
        });
      }
    } catch (error) {
      console.error('Error buying NFT:', error);
    }
  }, [nfts, userAddress]);

  const mintNFT = useCallback(async (cid: string): Promise<string> => {
    console.log('Minting NFT with user address:', userAddress);
    const newNFT: NFT = {
      id: Date.now().toString(),
      cid,
      price: 0,
      owner: userAddress,
      creator: userAddress,
      isForSale: false,
      createdAt: new Date(),
    };
    
    // Add to local state
    setNfts(prev => [...prev, newNFT]);
    
    // Load metadata for the new NFT
    try {
      console.log('Loading metadata for new NFT with CID:', cid);
      const metadata = await IPFSMetadataService.fetchMetadata(cid);
      setMetadataCache(prev => new Map(prev).set(cid, metadata));
      console.log('Metadata loaded successfully for new NFT');
    } catch (error) {
      console.error('Error loading metadata for new NFT:', error);
    }
    
    // Save to data service
    try {
      const saved = await nftDataService.saveBlockchainNFT(newNFT);
      if (saved) {
        console.log('NFT saved successfully');
      } else {
        console.warn('Failed to save NFT');
      }
    } catch (error) {
      console.error('Error saving NFT:', error);
    }
    
    return newNFT.id; // Trả về ID của NFT mới
  }, [userAddress]);

  const listNFTForSale = useCallback(async (id: string, price: number) => {
    try {
      const updatedNFTs = nfts.map(nft => 
        nft.id === id ? { ...nft, price, isForSale: true } : nft
      );
      
      setNfts(updatedNFTs);
      
      // Update in data service
      await nftDataService.updateNFTInMock(id, {
        price,
        isForSale: true
      });
    } catch (error) {
      console.error('Error listing NFT for sale:', error);
    }
  }, [nfts]);

  const delistNFT = useCallback(async (id: string) => {
    try {
      const updatedNFTs = nfts.map(nft => 
        nft.id === id ? { ...nft, isForSale: false, price: 0 } : nft
      );
      
      setNfts(updatedNFTs);
      
      // Update in data service
      await nftDataService.updateNFTInMock(id, {
        isForSale: false,
        price: 0
      });
    } catch (error) {
      console.error('Error delisting NFT:', error);
    }
  }, [nfts]);

  const getUserNFTs = useCallback(() => {
    if (!userAddress) return [];
    console.log('Getting user NFTs for address:', userAddress);
    console.log('All NFTs:', nfts);
    const userNFTs = nfts.filter(nft => nft.owner.toLowerCase() === userAddress.toLowerCase());
    console.log('Found user NFTs:', userNFTs.length, userNFTs);
    return userNFTs;
  }, [nfts, userAddress]);

  const getMarketplaceNFTs = useCallback(() => {
    if (!userAddress) return nfts.filter(nft => nft.isForSale);
    return nfts.filter(nft => nft.isForSale && nft.owner.toLowerCase() !== userAddress.toLowerCase());
  }, [nfts, userAddress]);

  const loadMetadataForNFTs = useCallback(async (nftList: NFT[]) => {
    try {
      const cids = nftList.map(nft => nft.cid);
      const metadataMap = await IPFSMetadataService.fetchMultipleMetadata(cids);
      setMetadataCache(metadataMap);
    } catch (error) {
      console.error('Error loading metadata:', error);
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

  const isMetadataLoading = useCallback((cid: string): boolean => {
    return metadataLoading.has(cid);
  }, [metadataLoading]);

  return (
    <NFTContext.Provider value={{
      nfts,
      loading,
      userAddress,
      buyNFT,
      mintNFT,
      listNFTForSale,
      delistNFT,
      getUserNFTs,
      getMarketplaceNFTs,
      getNFTWithMetadata,
      isMetadataLoading,
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
