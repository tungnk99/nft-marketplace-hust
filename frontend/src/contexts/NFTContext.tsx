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
  royaltyFee: number; // Royalty fee in percentage (0-100)
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
  mintNFT: (cid: string, royaltyFee?: number) => Promise<string>;
  updatePrice: (nftId: string, newPrice: number) => Promise<boolean>;
  listNFT: (id: string, price: number) => Promise<void>;
  delistNFT: (id: string) => Promise<void>;
  getUserNFTs: () => Promise<NFT[]>;
  getMarketplaceNFTs: () => Promise<NFT[]>;
  getNFTWithMetadata: (nft: NFT) => Promise<NFTWithMetadata | null>;
  getNFTInfo: (nftId: string) => Promise<NFTWithMetadata>;
  isNFTListed: (nftId: string) => Promise<boolean>;
}

const NFTContext = createContext<NFTContextType | undefined>(undefined);

export const NFTProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  
  // Get MetaMask state
  const { account, isConnected } = useMetaMask();
  const userAddress = account || null;

  const buyNFT = useCallback(async (id: string) => {
    try {      
      // Call blockchain service to buy NFT
      const success = await blockchainService.buyNFT(id);
      
      if (success) {
        console.log('NFT bought successfully, no cache update needed');
      }
    } catch (error) {
      console.error('Error buying NFT:', error);
      throw error;
    }
  }, [userAddress]);

  const mintNFT = useCallback(async (cid: string, royaltyFee: number = 0): Promise<string> => {    
    try {
      // Call blockchain service to mint NFT
      const nftId = await blockchainService.mintNFT(cid, royaltyFee);
      
      console.log('NFT minted successfully, no cache update needed');
      
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
        console.log('NFT listed successfully, no cache update needed');
      }
    } catch (error) {
      console.error('Error listing NFT for sale:', error);
      throw error;
    }
  }, []);

  const updatePrice = useCallback(async (nftId: string, newPrice: number) => {
    try {
      // Call blockchain service to update NFT price  
      await blockchainService.updatePrice(nftId, newPrice);
    } catch (error) {
      console.error('Error updating NFT price:', error);
      throw error;
    }
  }, []);

  const delistNFT = useCallback(async (id: string) => {
    try {
      // Call blockchain service to delist NFT
      const success = await blockchainService.delistNFT(id);
      
      if (success) {
        console.log('NFT delisted successfully, no cache update needed');
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
    
    try {
      
      const metadata = await IPFSMetadataService.fetchMetadata(nft.cid);
      
      const result = {
        ...nft,
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
        category: metadata.category,
        attributes: metadata.attributes,
      };
      
      console.log(`✅ NFT with fresh metadata created for token ${nft.id}:`, result);
      
      return result;
    } catch (error) {
      console.error(`Failed to fetch metadata for CID ${nft.cid}:`, error);
      return null;
    }
  }, []);

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

  return (
    <NFTContext.Provider value={{
      loading,
      userAddress,
      buyNFT,
      mintNFT,
      listNFT,
      updatePrice,
      delistNFT,
      getUserNFTs,
      getMarketplaceNFTs,
      getNFTWithMetadata,
      getNFTInfo,
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
