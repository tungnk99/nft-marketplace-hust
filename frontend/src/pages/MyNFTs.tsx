import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNFT, NFT, NFTWithMetadata } from '../contexts/NFTContext';
import NFTCard from '../components/NFTCard';
import LoadingSpinner from '../components/LoadingSpinner';
import PaginationComponent from '../components/PaginationComponent';
import AddNFTToListDialog from '../components/AddNFTToListDialog';
import FilterBar, { FilterOptions } from '../components/FilterBar';
import MintNFTForm from '../components/MintNFTForm';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WalletConnect from '../components/WalletConnect';
import { useMetaMask } from '../hooks/useMetaMask';

const ITEMS_PER_PAGE = 8;

const MyNFTs: React.FC = () => {
  const navigate = useNavigate();
  const { getUserNFTs, listNFT, delistNFT, getNFTWithMetadata } = useNFT();
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('collection');
  const [sortBy, setSortBy] = useState('name');
  const [nftsWithMetadata, setNftsWithMetadata] = useState<NFTWithMetadata[]>([]);
  const [userNFTs, setUserNFTs] = useState<NFT[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    category: 'all',
    priceRange: 'all',
    listingStatus: 'all'
  });
  const { isConnected, account } = useMetaMask();

  // Load user NFTs from blockchain
  useEffect(() => {
    const loadUserNFTs = async () => {
      if (!isConnected || !account) {
        setUserNFTs([]);
        setNftsWithMetadata([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const nfts = await getUserNFTs();
        setUserNFTs(nfts);
        
        // Load metadata for all NFTs
        const results = await Promise.allSettled(nfts.map(nft => getNFTWithMetadata(nft)));
        const validNFTs = results
          .filter(r => r.status === 'fulfilled' && r.value)
          .map(r => (r as PromiseFulfilledResult<NFTWithMetadata>).value);
        setNftsWithMetadata(validNFTs);
      } catch (error) {
        console.error('Error loading user NFTs:', error);
        setUserNFTs([]);
        setNftsWithMetadata([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserNFTs();
  }, [isConnected, account, getUserNFTs, getNFTWithMetadata]);

  // Xử lý disconnect - chỉ reset state, không navigate
  useEffect(() => {
    if (!isConnected || !account) {
      setNftsWithMetadata([]);
      setLoading(false);
    }
  }, [isConnected, account]);

  // Filter NFTs based on filters
  const filterNFTs = useCallback((nftList: NFTWithMetadata[]) => {
    return nftList.filter(nftWithMetadata => {
      const nft = userNFTs.find(n => n.id === nftWithMetadata.id);
      if (!nft) return false;
      
      // Search filter
      if (filters.search && !nftWithMetadata.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      // Category filter
      if (filters.category !== 'all' && nftWithMetadata.category !== filters.category) {
        return false;
      }
      
      // Price range filter (only for listed NFTs)
      if (filters.priceRange !== 'all' && nft.isListing) {
        const price = nft.price || 0;
        switch (filters.priceRange) {
          case '0-0.1':
            return price < 0.1;
          case '0.1-1':
            return price >= 0.1 && price <= 1;
          case '1-5':
            return price > 1 && price <= 5;
          case '5+':
            return price > 5;
          default:
            return true;
        }
      }

      // Listing status filter (only for collection tab)
      if (activeTab === 'collection' && filters.listingStatus !== 'all') {
        if (filters.listingStatus === 'listed' && !nft.isListing) {
          return false;
        }
        if (filters.listingStatus === 'not-listed' && nft.isListing) {
          return false;
        }
      }
      
      return true;
    });
  }, [userNFTs, filters, activeTab]);

  // Sort NFTs
  const sortNFTs = useCallback((nftList: NFTWithMetadata[]) => {
    return [...nftList].sort((a, b) => {
      const nftA = userNFTs.find(n => n.id === a.id);
      const nftB = userNFTs.find(n => n.id === b.id);
      
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-low':
          return (nftA?.price || 0) - (nftB?.price || 0);
        case 'price-high':
          return (nftB?.price || 0) - (nftA?.price || 0);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'status':
          return (nftB?.isListing ? 1 : 0) - (nftA?.isListing ? 1 : 0);
        default:
          return 0;
      }
    });
  }, [userNFTs, sortBy]);

  // Get NFTs based on active tab with filters and sorting
  const getDisplayNFTs = useMemo(() => {
    let baseNFTs = [];
    if (activeTab === 'collection') {
      baseNFTs = nftsWithMetadata;
    } else if (activeTab === 'listed') {
      baseNFTs = nftsWithMetadata.filter(nftWithMetadata => {
        const nft = userNFTs.find(n => n.id === nftWithMetadata.id);
        return nft?.isListing;
      });
    } else {
      return []; // mint tab doesn't need NFTs
    }
    
    const filteredNFTs = filterNFTs(baseNFTs);
    const sortedNFTs = sortNFTs(filteredNFTs);
    
    return sortedNFTs;
  }, [nftsWithMetadata, userNFTs, activeTab, filters, sortBy]);

  const displayNFTs = getDisplayNFTs;

  // Pagination logic (declare only once, after displayNFTs)
  const totalPages = Math.ceil(displayNFTs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentNFTs = displayNFTs.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      priceRange: 'all',
      listingStatus: 'all'
    });
    setSortBy('name');
    setCurrentPage(1);
  };

  const handleNFTClick = (nft: NFTWithMetadata) => {
    navigate(`/nft/${nft.id}`);
  };

  const handleListNFT = async (id: string, price: number) => {
    console.log('Listing NFT:', id, 'for price:', price);
    try {
      await listNFT(id, price);
      // Reload user NFTs from blockchain
      const updatedNFTs = await getUserNFTs();
      setUserNFTs(updatedNFTs);
      const metas = await Promise.all(updatedNFTs.map(async nft => await getNFTWithMetadata(nft)));
      setNftsWithMetadata(metas.filter(Boolean));
      toast({
        title: "NFT Listed!",
        description: `Your NFT is now listed for sale at ${price} ETH and visible on the marketplace.`,
      });
    } catch (error) {
      console.error('Error listing NFT:', error);
      toast({
        title: "Error Listing NFT",
        description: "Failed to list NFT for sale. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDelistNFT = async (id: string) => {
    console.log('Delisting NFT:', id);
    try {
      await delistNFT(id);
      // Reload user NFTs from blockchain
      const updatedNFTs = await getUserNFTs();
      setUserNFTs(updatedNFTs);
      const metas = await Promise.all(updatedNFTs.map(async nft => await getNFTWithMetadata(nft)));
      setNftsWithMetadata(metas.filter(Boolean));
      toast({
        title: "NFT Delisted!",
        description: "Your NFT has been removed from the marketplace.",
      });
    } catch (error) {
      console.error('Error delisting NFT:', error);
      toast({
        title: "Error Delisting NFT",
        description: "Failed to delist NFT. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleMintSuccess = async (newNFTId: string) => {
    console.log('Mint success - new NFT ID:', newNFTId);
    
    // Navigate ngay lập tức sang trang detail của NFT mới
    navigate(`/nft/${newNFTId}`);
    
    // Toast notification sau khi navigate
    toast({
      title: "NFT Minted Successfully!",
      description: "Your new NFT has been created and added to your collection.",
    });
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h1 className="text-2xl font-bold mb-4">My NFTs</h1>
        <p className="mb-6 text-gray-600">Please connect your MetaMask wallet to view your NFTs.</p>
        <WalletConnect />
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-8">My NFTs</h1>
        <LoadingSpinner />
      </div>
    );
  }

  const collectionNFTs = activeTab === 'collection' ? getDisplayNFTs : nftsWithMetadata;
  const listedNFTs = nftsWithMetadata.filter(nftWithMetadata => {
    const nft = userNFTs.find(n => n.id === nftWithMetadata.id);
    return nft?.isListing;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">My NFT Collection</h1>
        <p className="text-gray-600">Manage your digital assets, create new NFTs and list them for sale</p>
        <div className="flex gap-4 text-sm text-gray-500 mt-2">
          <span>Total NFTs: {nftsWithMetadata.length}</span>
          <span>Listed: {listedNFTs.length}</span>
          <span>Not Listed: {nftsWithMetadata.length - listedNFTs.length}</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="collection">My Collection ({collectionNFTs.length})</TabsTrigger>
          <TabsTrigger value="listed">Listed NFTs ({listedNFTs.length})</TabsTrigger>
          <TabsTrigger value="mint">Mint NFT</TabsTrigger>
        </TabsList>

        <TabsContent value="collection" className="mt-6">
          {/* Filter and Sort Controls with listing status filter */}
          <FilterBar 
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onResetFilters={handleResetFilters}
            showListingStatus={true}
          />
          
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-gray-600">
                Showing {Math.min(startIndex + 1, displayNFTs.length)}-{Math.min(endIndex, displayNFTs.length)} of {displayNFTs.length} NFTs
              </p>
              <p className="text-sm text-gray-500">All your NFTs - you can list unlisted ones for sale</p>
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="status">Status (Listed first)</SelectItem>
                <SelectItem value="price-low">Price (Low to High)</SelectItem>
                <SelectItem value="price-high">Price (High to Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {displayNFTs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">No NFTs match your filters</div>
              <p className="text-gray-500 mt-2">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentNFTs.map((nft) => (
                  <NFTCard
                    key={nft.id}
                    nft={nft}
                    onClick={() => handleNFTClick(nft)}
                    onList={handleListNFT}
                    onDelist={handleDelistNFT}
                    showListButton={!nft.isListing}
                    showDelistButton={nft.isListing}
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
        </TabsContent>

        <TabsContent value="listed" className="mt-6">
          <AddNFTToListDialog onNFTListed={handleListNFT} />
          
          {/* Filter and Sort Controls without listing status filter */}
          <FilterBar 
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onResetFilters={handleResetFilters}
            showListingStatus={false}
          />
          
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-gray-600">
                Showing {Math.min(startIndex + 1, displayNFTs.length)}-{Math.min(endIndex, displayNFTs.length)} of {displayNFTs.length} NFTs
              </p>
              <p className="text-sm text-gray-500">These NFTs are currently listed on the marketplace and available for purchase</p>
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="price-low">Price (Low to High)</SelectItem>
                <SelectItem value="price-high">Price (High to Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {displayNFTs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">No listed NFTs match your filters</div>
              <p className="text-gray-500 mt-2">Try adjusting your search or filter criteria, or use the "Add NFT to List" button above!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentNFTs.map((nft) => (
                  <NFTCard
                    key={nft.id}
                    nft={nft}
                    onClick={() => handleNFTClick(nft)}
                    onDelist={handleDelistNFT}
                    showDelistButton={true}
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
        </TabsContent>

        <TabsContent value="mint" className="mt-6">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Create New NFT</h2>
              <p className="text-gray-600">Design and mint your unique digital asset</p>
            </div>
            
            <MintNFTForm onMintSuccess={handleMintSuccess} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyNFTs;
