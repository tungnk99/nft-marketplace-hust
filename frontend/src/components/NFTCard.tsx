import React, { useState } from 'react';
import { NFT, NFTWithMetadata } from '../contexts/NFTContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Wallet, Tag, User, Calendar, Copy, Percent, Hash, Edit2, CheckCircle, XCircle, CircleCheck, CircleX } from 'lucide-react';
import { formatRoyaltyFee } from '../lib/utils';
import { useNFT } from '../contexts/NFTContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { marketplaceContractAddress } from '../services/contractService';
import LoadingSpinner from './LoadingSpinner';

interface NFTCardProps {
  nft: NFTWithMetadata;
  onClick?: () => void;
  onDetails?: () => void; // New prop for details view
  onBuy?: (id: string) => void;
  onUpdatePrice?: (id: string, price: number) => void;
  onList?: (id: string, price: number) => void;
  onDelist?: (id: string) => void;
  showBuyButton?: boolean;
  showListButton?: boolean;
  showDelistButton?: boolean;
  showListedTab?: boolean; // New prop to control listed tab display
  showStatusBadge?: boolean; // New prop to control status badge display
  onTransferSuccess?: () => void; // New: callback after transfer
  isMarketplace?: boolean; // mới
  isLoading?: boolean; // loading trạng thái mua từ ngoài vào
}

const NFTCard: React.FC<NFTCardProps> = ({ 
  nft, 
  onClick,
  onDetails,
  onBuy, 
  onUpdatePrice,
  onList, 
  onDelist,
  showBuyButton = false, 
  showListButton = false,
  showDelistButton = false,
  showListedTab = false, // Default to false for non-listed view
  showStatusBadge = true, // Default to true for marketplace view
  onTransferSuccess,
  isMarketplace,
  isLoading: isLoadingProp // nhận prop isLoading
}) => {
  const [isLoadingState, setIsLoading] = useState(false);
  const [listPrice, setListPrice] = useState('');
  const [showListForm, setShowListForm] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [pendingList, setPendingList] = useState(false);
  const [approveLoading, setApproveLoading] = useState<'single' | 'all' | null>(null);
  const nftContext = useNFT();
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferAddress, setTransferAddress] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Sử dụng isLoadingProp nếu được truyền vào, ưu tiên prop này
  const isLoading = typeof isLoadingProp === 'boolean' ? isLoadingProp : isLoadingState;

  const handleBuy = async () => {
    setIsLoading(true);
    // Simulate transaction delay
    setTimeout(() => {
      onBuy?.(nft.id);
      setIsLoading(false);
    }, 1500);
  };

  const handleList = async () => {
    const price = parseFloat(listPrice);
    if (price > 0) {
      setIsLoading(true);
      try {
        // Luôn kiểm tra approve for all trước khi list
        let approvedAll = false;
        if (nftContext.userAddress) {
          approvedAll = await nftContext.isApprovedForAll(nftContext.userAddress, marketplaceContractAddress);
        }
        if (!approvedAll) {
          // Nếu chưa approve, hiển thị dialog approve for all
          setShowListForm(false);
          setShowApproveDialog(true);
          setPendingList(true);
          setIsLoading(false);
          return;
        }
        await onList?.(nft.id, price);
        setShowListForm(false);
        setListPrice('');
      } finally {
        setIsLoading(false);
      }
    }
  };
  const handleUpdatePrice = () => {
    const price = parseFloat(listPrice);
    setTimeout(() => {
    onUpdatePrice?.(nft.id, price);
    }, 1500)
  };
  const handleDelist = async () => {
    setIsLoading(true);
    try {
      await onDelist?.(nft.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = () => {
    // Nếu đang approve hoặc loading thì không cho click vào card
    if (showApproveDialog || isLoading || approveLoading) return;
    onClick?.();
  };
  const handleDetailsClick = () => {
    onDetails?.();
  }

  const handleListButtonClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      // Only check approve for all
      const isApprovedAll = nftContext.getCachedIsApprovedForAll && nftContext.getCachedIsApprovedForAll();
      console.log('Cached isApprovedForAll:', isApprovedAll);
      if (isApprovedAll) {
        setShowListForm(true);
        setIsLoading(false);
        console.log('Show listing price form for NFT (approved all):', nft.id);
        return;
      }
      // If not approved for all, show approve dialog
      setShowApproveDialog(true);
      setPendingList(true);
      setIsLoading(false);
      console.log('Show approve dialog for NFT:', nft.id);
    } catch (error) {
      console.error('Error during listing approval check:', error);
      toast(
        <div>
          <strong>Error</strong>
          <div>Failed to check approval status</div>
        </div>
      );
      setIsLoading(false);
    }
  };

  const handleApprove = async (option: 'single' | 'all') => {
    setApproveLoading(option);
    try {
      if (option === 'single') {
        await nftContext.approveToMarketplace(nft.id);
      } else {
        await nftContext.setApprovalForAllToMarketplace(true);
        // Cập nhật lại cache approveAll
        if (nftContext.userAddress) {
          await nftContext.isApprovedForAll(nftContext.userAddress, marketplaceContractAddress);
        }
      }
      toast(
        <div>
          <strong>Approved</strong>
          <div>Approval successful. You can now list your NFT.</div>
        </div>
      );
      setShowApproveDialog(false);
      setShowListForm(true);
    } catch (error) {
      toast(
        <div>
          <strong>Error</strong>
          <div>Approval failed. Please try again.</div>
        </div>
      );
    } finally {
      setApproveLoading(null);
    }
  };

  function shortenAddress(addr: string) {
    return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : '';
  }

  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPrice, setEditPrice] = useState(nft.price.toString());

  // Only show transfer if user is owner
  const isOwner = nftContext.userAddress && nftContext.userAddress.toLowerCase() === nft.owner.toLowerCase();

  // Trong component:
  // Nếu là marketplace, không render các nút List/Delist/Transfer
  if (isMarketplace) {
    // Nếu là owner, chỉ render thông tin, không render nút Buy
    if (isOwner) {
      return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer relative" onClick={handleCardClick}>
          <CardHeader className="p-0">
            <div className="relative">
              <img
                src={nft.image}
                alt={nft.name}
                className="w-full h-64 object-cover"
              />
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-xs">
                  {nft.category}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <CardTitle className="text-lg mb-2">{nft.name}</CardTitle>
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{nft.description}</p>
            {/* Các thông tin khác giữ nguyên */}
            <div className="flex items-center gap-1 mt-1">
              <Wallet className="w-3 h-3 mr-1" />
              <span className="mr-2">Owner:</span>
              <span className="font-mono">{shortenAddress(nft.owner)}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <User className="w-3 h-3 mr-1" />
              <span className="mr-2">Creator:</span>
              <span className="font-mono">{shortenAddress(nft.creator)}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3 mr-1" />
              <span className="mr-2">Created:</span>
              <span>{nft.createdAt.toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Percent className="w-3 h-3 mr-1" />
              <span className="mr-2">Royalty:</span>
              <span className="font-medium">{formatRoyaltyFee(nft.royaltyFee)}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Tag className="w-3 h-3 mr-1" />
              <span className="mr-2">Last Sold Price:</span>
              <span className="font-medium">{nft.lastSoldPrice} ETH</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Tag className="w-4 h-4 text-gray-400 mr-1" />
              <span className="text-base text-gray-700 font-medium mr-1">Listing Price:</span>
              <span className="font-bold text-blue-600 text-xl">{nft.price} ETH</span>
            </div>
            {/* Badge Owner ở vị trí nút Buy */}
            <div className="flex justify-start mt-4">
              <span className="text-sm text-gray-500 italic">You are the owner of this NFT</span>
            </div>
          </CardContent>
        </Card>
      );
    }
    // Nếu không phải owner, render nút Buy nếu showBuyButton=true
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer relative" onClick={handleCardClick}>
        {(approveLoading !== null) && (
          <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-30">
            <LoadingSpinner />
            <span className="mt-2 text-blue-600 text-sm">Approving...</span>
          </div>
        )}
        {(isLoading || isTransferring) && (
          <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-20">
            <LoadingSpinner />
            <span className="mt-2 text-gray-600 text-sm">Processing...</span>
          </div>
        )}
        <CardHeader className="p-0">
          <div className="relative">
            <img
              src={nft.image}
              alt={nft.name}
              className="w-full h-64 object-cover"
            />
            {showStatusBadge && (
              <div className="absolute top-2 right-2 flex flex-col gap-1">
                {nft.isListing && (
                  <Badge className="bg-green-500 hover:bg-green-600">
                    Listed
                  </Badge>
                )}
                {!nft.isListing && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                    Not Listed
                  </Badge>
                )}
              </div>
            )}
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs">
                {nft.category}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <CardTitle className="text-lg mb-2">{nft.name}</CardTitle>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{nft.description}</p>
          {/* Các thông tin khác giữ nguyên */}
          <div className="flex items-center gap-1 mt-1">
            <Wallet className="w-3 h-3 mr-1" />
            <span className="mr-2">Owner:</span>
            <span className="font-mono">{shortenAddress(nft.owner)}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <User className="w-3 h-3 mr-1" />
            <span className="mr-2">Creator:</span>
            <span className="font-mono">{shortenAddress(nft.creator)}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3 mr-1" />
            <span className="mr-2">Created:</span>
            <span>{nft.createdAt.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Percent className="w-3 h-3 mr-1" />
            <span className="mr-2">Royalty:</span>
            <span className="font-medium">{formatRoyaltyFee(nft.royaltyFee)}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Tag className="w-3 h-3 mr-1" />
            <span className="mr-2">Last Sold Price:</span>
            <span className="font-medium">{nft.lastSoldPrice} ETH</span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Tag className="w-4 h-4 text-gray-400 mr-1" />
            <span className="text-base text-gray-700 font-medium mr-1">Listing Price:</span>
            <span className="font-bold text-blue-600 text-xl">{nft.price} ETH</span>
          </div>
          {showBuyButton && (
            <div className="flex justify-start mt-4">
              <Button
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold px-4 py-2 text-base w-auto min-w-[100px]"
                style={{ borderRadius: '8px' }}
                onClick={e => {
                  e.stopPropagation();
                  handleBuy();
                }}
                disabled={isLoading}
              >
                {isLoading ? <LoadingSpinner className="w-4 h-4 mx-auto" /> : 'Buy Now'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer relative" onClick={handleCardClick}>
      {(approveLoading !== null) && (
        <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-30">
          <LoadingSpinner />
          <span className="mt-2 text-blue-600 text-sm">Approving...</span>
        </div>
      )}
      {(isLoading || isTransferring) && (
        <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-20">
          <LoadingSpinner />
          <span className="mt-2 text-gray-600 text-sm">Processing...</span>
        </div>
      )}
      <CardHeader className="p-0">
        <div className="relative">
          <img
            src={nft.image}
            alt={nft.name}
            className="w-full h-64 object-cover"
          />
          {showStatusBadge && (
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              {nft.isListing && (
                <Badge className="bg-green-500 hover:bg-green-600">
                  Listed
                </Badge>
              )}
              {!nft.isListing && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                  Not Listed
                </Badge>
              )}
            </div>
          )}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-xs">
              {nft.category}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <CardTitle className="text-lg mb-2">{nft.name}</CardTitle>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{nft.description}</p>
        
        {/* Display attributes if available */}
        {nft.attributes && nft.attributes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {nft.attributes.map((attr, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {attr.trait_type}: {attr.value}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex items-center gap-1 mt-1">
            <Hash className="w-3 h-3 mr-1" />
            <span className="mr-2">Token ID:</span>
            <span className="font-mono">#{nft.id}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(nft.id);
                if (typeof toast === 'function') toast('Token ID copied.');
              }}
              className="hover:text-blue-600"
              title="Copy Token ID"
              type="button"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Wallet className="w-3 h-3 mr-1" />
            <span className="mr-2">Owner:</span>
            <span className="font-mono">{shortenAddress(nft.owner)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(nft.owner);
                if (typeof toast === 'function') toast('Owner address copied.');
              }}
              className="hover:text-blue-600"
              title="Copy owner address"
              type="button"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <User className="w-3 h-3 mr-1" />
            <span className="mr-2">Creator:</span>
            <span className="font-mono">{shortenAddress(nft.creator)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(nft.creator);
                if (typeof toast === 'function') toast('Creator address copied.');
              }}
              className="hover:text-blue-600"
              title="Copy creator address"
              type="button"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3 mr-1" />
            <span className="mr-2">Created:</span>
            <span>{nft.createdAt.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Percent className="w-3 h-3 mr-1" />
            <span className="mr-2">Royalty:</span>
            <span className="font-medium">{formatRoyaltyFee(nft.royaltyFee)}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Tag className="w-3 h-3 mr-1" />
            <span className="mr-2">Last Sold Price:</span>
            <span className="font-medium">{nft.lastSoldPrice} ETH</span>
          </div>
        </div>
        
        {/* Giá chỉ hiển thị ở dưới cùng khi ở tab Listed NFT */}
        {!(showListedTab && nft.isListing) && (
          <div className="flex items-center gap-2 mt-3">
            <Tag className="w-4 h-4 text-gray-400 mr-1" />
            {isMarketplace ? (
              <>
                <span className="text-base text-gray-700 font-medium mr-1">Listing Price:</span>
                <span className="font-bold text-blue-600 text-xl">{nft.price} ETH</span>
              </>
            ) : (
              <>
                <span className="text-xs text-gray-600 mr-1">Listing Price:</span>
                <span className="font-bold text-blue-600 text-lg">{nft.price} ETH</span>
              </>
            )}
          </div>
        )}
        {showListedTab && nft.isListing && (
          <>
            <div className="flex items-center gap-2 mt-3">
              <Tag className="w-3 h-3 text-gray-400 mr-1" />
              <span className="text-xs text-gray-600 mr-1">Listing Price:</span>
              {isEditingPrice ? (
                <>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-lg font-bold text-blue-600 w-24 focus:outline-none focus:ring-2 focus:ring-blue-400 mr-2"
                    style={{ width: '90px' }}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                  <span className="text-blue-600 text-lg font-bold mr-2">ETH</span>
                  <Button
                    size="icon"
                    className="w-7 h-7 p-0 bg-green-100 hover:bg-green-200 text-green-600 mr-1 flex items-center justify-center"
                    onClick={e => {
                      e.stopPropagation();
                      const newPrice = Number(editPrice);
                      if (isNaN(newPrice) || newPrice <= 0) return;
                      if (newPrice === nft.price) {
                        toast.warning('Price has not changed.');
                        return;
                      }
                      setIsLoading(true);
                      Promise.resolve(onUpdatePrice && onUpdatePrice(nft.id, newPrice))
                        .finally(() => setIsLoading(false));
                      setIsEditingPrice(false);
                    }}
                    disabled={isNaN(Number(editPrice)) || Number(editPrice) <= 0}
                    title="Confirm"
                  >
                    {typeof CheckCircle !== 'undefined' ? <CheckCircle className="w-5 h-5" /> : <CircleCheck className="w-5 h-5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 p-0 text-red-500 hover:bg-red-100 flex items-center justify-center"
                    onClick={e => {
                      e.stopPropagation();
                      setIsEditingPrice(false);
                      setEditPrice(nft.price.toString());
                    }}
                    title="Cancel"
                  >
                    {typeof XCircle !== 'undefined' ? <XCircle className="w-5 h-5" /> : <CircleX className="w-5 h-5" />}
                  </Button>
                </>
              ) : (
                <>
                  <span className="font-bold text-blue-600 text-lg mr-2">{nft.price} ETH</span>
                  <Button
                    size="icon"
                    className="w-7 h-7 p-0 bg-gray-100 hover:bg-gray-200 text-blue-600 border border-blue-200 mr-2 flex items-center justify-center"
                    onClick={e => {
                      e.stopPropagation();
                      setIsEditingPrice(true);
                    }}
                    title="Edit Price"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
            {/* KHÔNG render Delist nhỏ ở đây nếu showListedTab=true */}
          </>
        )}
        {showListForm && (
          <div className="mt-3" onClick={e => e.stopPropagation()}>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col gap-3 shadow-sm w-full">
              <label className="text-sm font-medium text-gray-700 mb-1" htmlFor={`list-price-${nft.id}`}>Set Listing Price</label>
              <div className="flex items-center gap-2">
                <input
                  id={`list-price-${nft.id}`}
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="Enter price"
                  value={listPrice}
                  onChange={e => setListPrice(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base bg-white"
                  onClick={e => e.stopPropagation()}
                />
                <span className="text-gray-500 font-semibold">ETH</span>
              </div>
              {listPrice !== '' && (isNaN(Number(listPrice)) || Number(listPrice) <= 0) && (
                <div className="text-red-500 text-xs mt-1">Please enter a valid price &gt; 0</div>
              )}
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={handleList}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  disabled={isLoading || !listPrice || isNaN(Number(listPrice)) || Number(listPrice) <= 0}
                >
                  {isLoading ? <LoadingSpinner className="w-4 h-4 mx-auto" /> : 'Confirm Listing'}
                </Button>
                <Button
                  onClick={() => setShowListForm(false)}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="max-w-sm mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-6 flex flex-col items-center">
            <div className="flex flex-col items-center w-full">
              <div className="bg-blue-100 rounded-full p-3 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.104.896-2 2-2s2 .896 2 2-.896 2-2 2-2-.896-2-2zm0 0V7m0 4v4m0 0h.01" /></svg>
              </div>
              <DialogTitle className="text-xl font-bold text-gray-800 mb-2 text-center w-full">Cấp quyền cho Marketplace</DialogTitle>
              <DialogDescription className="text-gray-600 text-center mb-4 w-full">
                Hãy cấp quyền cho marketplace để bán NFT của bạn.
              </DialogDescription>
              <Button onClick={() => handleApprove('all')} disabled={approveLoading === 'all'} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 text-base mb-2">
                {approveLoading === 'all' ? 'Approving...' : 'Approve'}
              </Button>
              <Button onClick={() => setShowApproveDialog(false)} variant="ghost" className="w-full text-gray-500">Hủy</Button>
              <div className="text-xs text-gray-400 mt-3 text-center w-full">Bạn chỉ cần approve một lần để sử dụng marketplace thuận tiện hơn.</div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Nút Transfer và List/Delist cho owner - chỉ hiện ở tab My Collection (showListedTab=false) */}
        {isOwner && !showListedTab && (
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant="outline"
              className="text-blue-600 border-blue-200 px-4 py-1 text-sm font-medium w-1/2 hover:bg-blue-200 hover:text-black"
              onClick={e => {
                e.stopPropagation();
                if (!nft.isListing) setShowTransferDialog(true);
              }}
              disabled={nft.isListing}
              title={nft.isListing ? 'NFT đang được list trên marketplace, không thể transfer.' : ''}
            >
              Transfer
            </Button>
            {!nft.isListing ? (
              <Button
                variant="outline"
                className="text-green-600 border-green-200 px-4 py-1 text-sm font-medium w-1/2 hover:bg-green-200 hover:text-black"
                onClick={e => {
                  e.stopPropagation();
                  setShowListForm(true);
                }}
              >
                List
              </Button>
            ) : (
              <Button
                variant="outline"
                className="text-red-600 border-red-200 px-4 py-1 text-sm font-medium w-1/2 hover:bg-red-200 hover:text-black"
                onClick={async e => {
                  e.stopPropagation();
                  await handleDelist();
                }}
                disabled={isLoading}
              >
                Delist
              </Button>
            )}
          </div>
        )}
        {/* Chỉ hiện Delist ở tab Listed NFTs (showListedTab=true) */}
        {isOwner && showListedTab && nft.isListing && (
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant="outline"
              className="text-red-600 border-red-200 px-4 py-1 text-sm font-medium w-full hover:bg-red-200 hover:text-black"
              onClick={async e => {
                e.stopPropagation();
                await handleDelist();
              }}
              disabled={isLoading}
            >
              Delist
            </Button>
          </div>
        )}
        {/* Transfer Dialog */}
        <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
          <DialogContent className="max-w-sm mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-6 flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Transfer NFT</DialogTitle>
              <DialogDescription>Enter the recipient's address to transfer this NFT.</DialogDescription>
            </DialogHeader>
            <input
              type="text"
              placeholder="0x..."
              value={transferAddress}
              onChange={e => setTransferAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
              disabled={isTransferring}
            />
            <div className="flex gap-2 w-full mt-2">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                disabled={isTransferring || !transferAddress || !/^0x[a-fA-F0-9]{40}$/.test(transferAddress)}
                onClick={async e => {
                  e.stopPropagation();
                  setIsTransferring(true);
                  try {
                    await nftContext.transferNFT(transferAddress, nft.id);
                    toast.success('NFT transferred successfully!');
                    setShowTransferDialog(false);
                    setTransferAddress('');
                    if (onTransferSuccess) onTransferSuccess();
                  } catch (err: any) {
                    toast.error('Transfer failed: ' + (err?.message || 'Unknown error'));
                  } finally {
                    setIsTransferring(false);
                  }
                }}
              >
                Confirm
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={e => {
                  e.stopPropagation();
                  setShowTransferDialog(false);
                  setTransferAddress('');
                }}
                disabled={isTransferring}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default NFTCard;
