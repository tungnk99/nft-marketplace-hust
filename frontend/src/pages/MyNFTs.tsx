import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNFT, NFT, NFTWithMetadata } from '../contexts/NFTContext';
import NFTCard from '../components/NFTCard';
import LoadingSpinner from '../components/LoadingSpinner';
import PaginationComponent from '../components/PaginationComponent';
import AddNFTToListDialog from '../components/AddNFTToListDialog';
import FilterBar, { FilterOptions } from '../components/FilterBar';
import MintNFTForm from '../components/MintNFTForm';
import RoyaltyInfo from '../components/RoyaltyInfo';
import NFTCardSimple from '../components/NFTCardSimple';
import NFTCardSimpleWithActions from '../components/NFTCardSimpleWithActions';
import NFTCardTable from '../components/NFTCardTable';
import NFTCardGrid from '../components/NFTCardGrid';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import WalletConnect from '../components/WalletConnect';
import { useMetaMask } from '../hooks/useMetaMask';
import { Grid3X3 } from 'lucide-react';

const ITEMS_PER_PAGE = 8;

const MyNFTs: React.FC = () => {
  const navigate = useNavigate();
  const { getUserNFTs, getCreatedNFTs, listNFT, delistNFT, updatePrice, getNFTWithMetadata } = useNFT();
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('collection');
  const [sortBy, setSortBy] = useState('name');
  const [nftsWithMetadata, setNftsWithMetadata] = useState<NFTWithMetadata[]>([]);
  const [userNFTs, setUserNFTs] = useState<NFT[]>([]);
  const [createdNFTs, setCreatedNFTs] = useState<NFT[]>([]);
  const [createdNFTsWithMetadata, setCreatedNFTsWithMetadata] = useState<NFTWithMetadata[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    category: 'all',
    listingStatus: 'all'
  });

  const { isConnected, account } = useMetaMask();

  // Function to refresh user NFTs from blockchain
  const refreshUserNFTs = async () => {
    try {
      const updatedNFTs = await getUserNFTs();
      setUserNFTs(updatedNFTs);
      const metas = await Promise.all(updatedNFTs.map(async nft => await getNFTWithMetadata(nft)));
      setNftsWithMetadata(metas.filter(Boolean));
    } catch (error) {
      console.error('❌ Error refreshing user NFTs:', error);
    }
  };

  // Function to refresh created NFTs from blockchain
  const refreshCreatedNFTs = async () => {
    try {
      const updatedCreatedNFTs = await getCreatedNFTs();
      setCreatedNFTs(updatedCreatedNFTs);
      const metas = await Promise.all(updatedCreatedNFTs.map(async nft => await getNFTWithMetadata(nft)));
      setCreatedNFTsWithMetadata(metas.filter(Boolean));
    } catch (error) {
      console.error('❌ Error refreshing created NFTs:', error);
    }
  };

  // Load user NFTs from blockchain
  useEffect(() => {
    const loadUserNFTs = async () => {
      if (!isConnected || !account) {
        setUserNFTs([]);
        setNftsWithMetadata([]);
        setCreatedNFTs([]);
        setCreatedNFTsWithMetadata([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Load owned NFTs
        const nfts = await getUserNFTs();
        setUserNFTs(nfts);
        
        // Load metadata for all owned NFTs
        const results = await Promise.allSettled(nfts.map(nft => getNFTWithMetadata(nft)));
        const validNFTs = results
          .filter(r => r.status === 'fulfilled' && r.value)
          .map(r => (r as PromiseFulfilledResult<NFTWithMetadata>).value);
        setNftsWithMetadata(validNFTs);

        // Load created NFTs
        const createdNfts = await getCreatedNFTs();
        setCreatedNFTs(createdNfts);
        
        // Load metadata for all created NFTs
        const createdResults = await Promise.allSettled(createdNfts.map(nft => getNFTWithMetadata(nft)));
        const validCreatedNFTs = createdResults
          .filter(r => r.status === 'fulfilled' && r.value)
          .map(r => (r as PromiseFulfilledResult<NFTWithMetadata>).value);
        setCreatedNFTsWithMetadata(validCreatedNFTs);
      } catch (error) {
        console.error('Error loading user NFTs:', error);
        setUserNFTs([]);
        setNftsWithMetadata([]);
        setCreatedNFTs([]);
        setCreatedNFTsWithMetadata([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserNFTs();
  }, [isConnected, account, getUserNFTs, getCreatedNFTs, getNFTWithMetadata]);

  // Xử lý disconnect - chỉ reset state, không navigate
  useEffect(() => {
    if (!isConnected || !account) {
      setNftsWithMetadata([]);
      setCreatedNFTsWithMetadata([]);
      setLoading(false);
    }
  }, [isConnected, account]);

  // Filter NFTs based on filters
  const filterNFTs = useCallback((nftList: NFTWithMetadata[]) => {
    return nftList.filter(nftWithMetadata => {
      // Nếu là tab created thì chỉ filter theo search và category
      if (activeTab === 'created') {
        // Search filter
        if (filters.search && !nftWithMetadata.name.toLowerCase().includes(filters.search.toLowerCase())) {
          return false;
        }
        // Category filter
        if (filters.category !== 'all' && nftWithMetadata.category !== filters.category) {
          return false;
        }
        return true;
      }
      // Các tab khác giữ nguyên logic cũ
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
        const isActuallyListing = nft?.isListing || false;
        return isActuallyListing;
      });
    } else if (activeTab === 'created') {
      baseNFTs = createdNFTsWithMetadata;
    } else {
      return []; // mint tab doesn't need NFTs
    }
    
    const filteredNFTs = filterNFTs(baseNFTs);
    const sortedNFTs = sortNFTs(filteredNFTs);
    
    return sortedNFTs;
  }, [nftsWithMetadata, createdNFTsWithMetadata, userNFTs, activeTab, filters, sortBy]);

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
      listingStatus: 'all'
    });
    setSortBy('name');
    setCurrentPage(1);
  };

  const handleNFTClick = (nft: NFTWithMetadata, show: boolean) => {
    const handleClick = show? navigate(`/nft/${nft.id}`) : null;
  };

  const handleListNFT = async (id: string, price: number) => {
    try {
      await listNFT(id, price);
      // Reload user NFTs from blockchain
      await refreshUserNFTs();
      // KHÔNG hiện toast thành công ở đây, để dialog xử lý
    } catch (error) {
      console.error('Error listing NFT:', error);
      let message = "Failed to list NFT for sale. Please try again.";
      if (error && typeof error === 'object') {
        const err = error as any;
        // ethers v6: code = 'ACTION_REJECTED', v5: code = 4001
        if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
          message = "Transaction was cancelled in MetaMask.";
        } else if (err.reason) {
          message = err.reason;
        } else if (err.message && typeof err.message === 'string') {
          // Lấy dòng đầu tiên, tránh quá dài
          message = err.message.split('\n')[0].slice(0, 120);
        }
      }
      toast({
        title: "Error Listing NFT",
        description: message,
        variant: "destructive"
      });
      throw new Error(message); // Để dialog biết có lỗi, message dễ hiểu
    }
  };
  const handleUpdateListingPrice = async (id: string, price: number) => {
    try {
      toast({
        title: "Waiting to update Price",
        description: "Price is updated to blockchain, please wait a moment.",
      });
      await updatePrice(id, price);
      await refreshUserNFTs();
      toast({
        title: "Price updated!",
        description: `Listing price updated to ${price} ETH.`,
      });
    } catch (error) {
      console.error('Error updating listing price:', error);
      toast({
        title: "Waiting to update Price",
        description: "Fail to update price, please try again.",
        variant: "destructive",
      });
    }
  }
  const handleDelistNFT = async (id: string) => {
    try {
      await delistNFT(id);
      // Reload user NFTs from blockchain
      await refreshUserNFTs();
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
    
    // Navigate ngay lập tức sang trang detail của NFT mới
    navigate(`/nft/${newNFTId}`);
    
    // Toast notification sau khi navigate
    toast({
      title: "NFT Minted Successfully!",
      description: "Your new NFT has been created and added to your collection.",
    });

    // Refresh created NFTs list
    await refreshCreatedNFTs();
  };

  // Handler to refresh after transfer
  const handleTransferSuccess = async () => {
    await refreshUserNFTs();
    await refreshCreatedNFTs();
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My NFT Collection</h1>
            <p className="text-gray-600 text-lg">
              Connect your wallet to manage your digital assets
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            {/* MetaMask Info */}
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">MetaMask Wallet</h3>
                <p className="text-sm text-gray-500">The most popular Web3 wallet</p>
              </div>
            </div>

            {/* Features List */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                View and manage your NFT collection
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                List NFTs for sale on marketplace
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Track royalty earnings
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Create and mint new NFTs
              </div>
            </div>

            {/* Connect Button */}
            <div className="mb-6">
              <WalletConnect />
            </div>

            {/* Download MetaMask */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Don't have MetaMask?</p>
                  <p className="text-xs text-blue-700">Download the extension to get started</p>
                </div>
                <a 
                  href="https://metamask.io/download/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                >
                  Download
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-500">
              By connecting your wallet, you agree to our{' '}
              <a href="#" className="text-blue-600 hover:text-blue-800">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-blue-600 hover:text-blue-800">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">My NFTs</h1>
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Loading your NFT collection...</p>
        </div>
      </div>
    );
  }

  const collectionNFTs = activeTab === 'collection' ? getDisplayNFTs : nftsWithMetadata;
  const listedNFTs = nftsWithMetadata.filter(nftWithMetadata => {
    const nft = userNFTs.find(n => n.id === nftWithMetadata.id);
    const isActuallyListing = nft?.isListing || false;
    return isActuallyListing;
  });
  const createdNFTsCount = createdNFTsWithMetadata.length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">My NFT Collection</h1>
        <p className="text-gray-600">Manage your digital assets, create new NFTs and list them for sale</p>
        <div className="flex gap-4 text-sm text-gray-500 mt-2">
          <span>Total NFTs: {nftsWithMetadata.length}</span>
          <span>Listed: {listedNFTs.length}</span>
          <span>Not Listed: {nftsWithMetadata.length - listedNFTs.length}</span>
          <span>Created: {createdNFTsCount}</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="collection">My Collection ({collectionNFTs.length})</TabsTrigger>
          <TabsTrigger value="listed">Listed NFTs ({listedNFTs.length})</TabsTrigger>
          <TabsTrigger value="created">Created NFTs ({createdNFTsCount})</TabsTrigger>
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
            
            <div className="flex items-center gap-4">
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
          </div>

          {displayNFTs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">No NFTs match your filters</div>
              <p className="text-gray-500 mt-2">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentNFTs.map((nft) => {
                  // Find the corresponding blockchain NFT data
                  const blockchainNFT = userNFTs.find(n => n.id === nft.id);
                  const isActuallyListing = blockchainNFT?.isListing || false;
                  
                  return (
                    <div key={nft.id}>
                      <NFTCard
                        nft={nft}
                        onClick={() => handleNFTClick(nft, true)}
                        onDetails={() => handleNFTClick(nft, true)}
                        onList={handleListNFT}
                        onDelist={handleDelistNFT}
                        onUpdatePrice={handleUpdateListingPrice}
                        showListButton={!isActuallyListing}
                        showDelistButton={isActuallyListing}
                        showListedTab={false}
                        showStatusBadge={true} // Show status badge in collection view
                        onTransferSuccess={handleTransferSuccess} // Pass transfer handler
                      />
                    </div>
                  );
                })}
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
            
            <div className="flex items-center gap-4">
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
          </div>

          {displayNFTs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">No listed NFTs match your filters</div>
              <p className="text-gray-500 mt-2">Try adjusting your search or filter criteria, or use the "Add NFT to List" button above!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentNFTs.map((nft) => {
                  // Find the corresponding blockchain NFT data
                  const blockchainNFT = userNFTs.find(n => n.id === nft.id);
                  
                  return (
                    <div key={nft.id}>
                      <NFTCard
                        nft={nft}
                        onClick={() => handleNFTClick(nft, false)}
                        onDetails={() => handleNFTClick(nft, true)}
                        onDelist={handleDelistNFT}
                        onUpdatePrice={handleUpdateListingPrice}
                        showDelistButton={true}
                        showListedTab={true}
                        showStatusBadge={true} // Show status badge in listed view
                      />
                    </div>
                  );
                })}
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

        <TabsContent value="created" className="mt-6">
          {/* Filter and Sort Controls */}
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
              <p className="text-sm text-gray-500">NFTs you have created - track your royalties and earnings</p>
            </div>
            
            <div className="flex items-center gap-4">
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
          </div>

          {displayNFTs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">No created NFTs match your filters</div>
              <p className="text-gray-500 mt-2">Try adjusting your search or filter criteria, or create your first NFT!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentNFTs.map((nft) => {
                  // Find the corresponding blockchain NFT data
                  const blockchainNFT = createdNFTs.find(n => n.id === nft.id);
                  
                  return (
                    <div key={nft.id}>
                      <NFTCardGrid
                        nft={nft}
                        royaltyFee={blockchainNFT?.royaltyFee || 0}
                        totalRoyaltyFees={blockchainNFT?.totalRoyaltyFees}
                        onClick={() => handleNFTClick(nft, true)}
                      />
                    </div>
                  );
                })}
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
