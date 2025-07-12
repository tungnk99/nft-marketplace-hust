import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNFT } from '../contexts/NFTContext';
import NFTCard from '../components/NFTCard';
import LoadingSpinner from '../components/LoadingSpinner';
import FilterBar, { FilterOptions } from '../components/FilterBar';
import PaginationComponent from '../components/PaginationComponent';
import PurchaseConfirmationDialog from '../components/PurchaseConfirmationDialog';
import { toast } from '@/hooks/use-toast';
import { NFT, NFTWithMetadata } from '../contexts/NFTContext';

const ITEMS_PER_PAGE = 8;

const Marketplace: React.FC = () => {
  const navigate = useNavigate();
  const { buyNFT, userAddress, getMarketplaceNFTs, getNFTInfo } = useNFT();
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNFT, setSelectedNFT] = useState<NFTWithMetadata | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [nftsWithMetadata, setNftsWithMetadata] = useState<NFTWithMetadata[]>([]);
  
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    category: '',
    priceRange: '',
  });

  useEffect(() => {
    const loadMarketplaceNFTs = async () => {
      try {
        setLoading(true);
        const marketplaceNFTs = await getMarketplaceNFTs();
        
        // Load metadata for all marketplace NFTs
        const nftsWithMetadataPromises = marketplaceNFTs.map(async (nft) => {
          try {
            const nftWithMetadata = await getNFTInfo(nft.id);
            return nftWithMetadata;
          } catch (error) {
            console.error(`Error loading metadata for NFT ${nft.id}:`, error);
            return null;
          }
        });
        
        const results = await Promise.all(nftsWithMetadataPromises);
        const validNFTs = results.filter((nft): nft is NFTWithMetadata => nft !== null);
        setNftsWithMetadata(validNFTs);
      } catch (error) {
        console.error('Error loading marketplace NFTs:', error);
        setNftsWithMetadata([]);
      } finally {
        setLoading(false);
      }
    };

    loadMarketplaceNFTs();
  }, [getMarketplaceNFTs, getNFTInfo]);

  const filteredAndSortedNFTs = useMemo(() => {
    let filtered = [...nftsWithMetadata];

    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter(nft => 
        nft.name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply category filter
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(nft => nft.category === filters.category);
    }

    // Apply price range filter
    if (filters.priceRange && filters.priceRange !== 'all') {
      filtered = filtered.filter(nft => {
        switch (filters.priceRange) {
          case '0-0.1':
            return nft.price < 0.1;
          case '0.1-1':
            return nft.price >= 0.1 && nft.price <= 1;
          case '1-5':
            return nft.price > 1 && nft.price <= 5;
          case '5+':
            return nft.price > 5;
          default:
            return true;
        }
      });
    }

    // Sort by newest first by default
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return filtered;
  }, [nftsWithMetadata, filters]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedNFTs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentNFTs = filteredAndSortedNFTs.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNFTClick = (nft: NFTWithMetadata) => {
    navigate(`/nft/${nft.id}`);
  };

  const handleBuyClick = (nft: NFTWithMetadata) => {
    // Don't allow users to buy their own NFTs
    if (userAddress && nft.owner.toLowerCase() === userAddress.toLowerCase()) {
      toast({
        title: "Cannot Buy Your Own NFT",
        description: "You already own this NFT. You can delist it from your collection.",
        variant: "destructive"
      });
      return;
    }
    setSelectedNFT(nft);
    setIsDialogOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (selectedNFT) {
      try {
        await buyNFT(selectedNFT.id);
        // Refresh marketplace NFTs after purchase
        const updatedMarketplaceNFTs = await getMarketplaceNFTs();
        const nftsWithMetadataPromises = updatedMarketplaceNFTs.map(async (nft) => {
          try {
            const nftWithMetadata = await getNFTInfo(nft.id);
            return nftWithMetadata;
          } catch (error) {
            console.error(`Error loading metadata for NFT ${nft.id}:`, error);
            return null;
          }
        });
        const results = await Promise.all(nftsWithMetadataPromises);
        const validNFTs = results.filter((nft): nft is NFTWithMetadata => nft !== null);
        setNftsWithMetadata(validNFTs);
        
        // Thông báo thành công chỉ hiển thị sau khi transaction hoàn thành
        toast({
          title: "NFT Purchased!",
          description: `You have successfully purchased ${selectedNFT.name}!`,
        });
      } catch (error) {
        console.error('Error purchasing NFT:', error);
        toast({
          title: "Error Purchasing NFT",
          description: "Failed to purchase NFT. Please try again.",
          variant: "destructive"
        });
        throw error; // Re-throw để PurchaseConfirmationDialog có thể catch
      }
    }
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: '',
      priceRange: '',
    });
    setCurrentPage(1);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-8">NFT Marketplace</h1>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">NFT Marketplace</h1>
        <p className="text-gray-600">Discover and collect unique digital assets</p>
      </div>

      <FilterBar 
        filters={filters}
        onFiltersChange={setFilters}
        onResetFilters={handleResetFilters}
      />

      <div className="mb-4">
        <p className="text-gray-600">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedNFTs.length)} of {filteredAndSortedNFTs.length} NFTs
        </p>
      </div>

      {filteredAndSortedNFTs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">No NFTs match your filters</div>
          <p className="text-gray-500 mt-2">Try adjusting your search criteria!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentNFTs.map((nft) => (
              <NFTCard
                key={nft.id}
                nft={nft}
                onClick={() => handleNFTClick(nft)}
                onBuy={() => handleBuyClick(nft)}
                showBuyButton={!userAddress || nft.owner.toLowerCase() !== userAddress.toLowerCase()}
                showStatusBadge={false} // Don't show status badge on marketplace since all NFTs are listed
              />
            ))}
          </div>

          {totalPages > 1 && (
            <PaginationComponent
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      <PurchaseConfirmationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        nft={selectedNFT}
        onConfirm={handleConfirmPurchase}
      />
    </div>
  );
};

export default Marketplace;
