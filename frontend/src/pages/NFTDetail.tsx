import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNFT, NFTWithMetadata, NFTTransaction } from '../contexts/NFTContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Calendar, User, Tag, Zap, Copy, Percent, Edit2, CheckCircle, XCircle, CircleCheck, CircleX, FileText, List, ChevronLeft, ChevronRight } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatRoyaltyFee } from '../lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";

const NFTDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userAddress, buyNFT, getNFTInfo, getHistoricalTransactions, updatePrice } = useNFT();
  const [isBuying, setIsBuying] = useState(false);
  const [nftWithMetadata, setNftWithMetadata] = useState<NFTWithMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [historicalTransactions, setHistoricalTransactions] = useState<NFTTransaction[]>([]);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  // Thêm state cho paging
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PER_PAGE = 5;
  const [totalHistoryPages, setTotalHistoryPages] = useState(1);
  // const [pagedHistory, setPagedHistory] = useState<NFTTransaction[]>([]);
  // const totalHistoryPages = Math.ceil(historicalTransactions.length / HISTORY_PER_PAGE);
  // const pagedHistory = historicalTransactions.slice((historyPage-1)*HISTORY_PER_PAGE, historyPage*HISTORY_PER_PAGE);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  useEffect(() => {
    const loadNFTData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

        try {
          setLoading(true);
        const nftData = await getNFTInfo(id);
        console.log('NFT data loaded:', nftData);
        
        setNftWithMetadata(nftData);

        // Load historical transactions
        const { items: transactions, total, page, pageSize, pageCount } = await getHistoricalTransactions(id, 1, HISTORY_PER_PAGE);
        setHistoricalTransactions(transactions);
        setHistoryPage(page);
        setTotalHistoryPages(pageCount);
        } catch (error) {
        console.error('Error loading NFT data:', error);
        setNftWithMetadata(null);
        } finally {
        setLoading(false);
      }
    };

    loadNFTData();
  }, [id, getNFTInfo, getHistoricalTransactions]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner />
        <p className="text-gray-600 mt-4">Loading NFT details...</p>
      </div>
    );
  }

  if (!nftWithMetadata) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">NFT Not Found</h1>
        <p className="text-gray-600 mb-6">The NFT you're looking for doesn't exist or metadata is not loaded.</p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>
        </Link>
      </div>
    );
  }

  const isOwner = nftWithMetadata.owner.toLowerCase() === userAddress.toLowerCase();
  const canBuy = nftWithMetadata.isListing && !isOwner;

  const handleBuy = async () => {
    if (canBuy) {
      try {
        setIsBuying(true);
        await buyNFT(nftWithMetadata.id);
        
        // Thông báo thành công chỉ hiển thị sau khi transaction hoàn thành
        toast({
          title: "NFT Purchased!",
          description: `You have successfully purchased ${nftWithMetadata.name}!`,
        });
        
        navigate('/');
      } catch (error) {
        console.error('Error buying NFT:', error);
        toast({
          title: "Error Purchasing NFT",
          description: "Failed to purchase NFT. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsBuying(false);
      }
    }
  };

  const handlePageChange = async (page: number) => {
    // Load historical transactions
    const { items: transactions, total, page: currentPage, pageSize, pageCount } = await getHistoricalTransactions(id, page, HISTORY_PER_PAGE);
    setHistoricalTransactions(transactions);
    setHistoryPage(currentPage);
    setTotalHistoryPages(pageCount);
  };

  function shortenAddress(addr: string, startCharacterCounts = 6, endCharacterCounts = 4) {
    return addr ? addr.slice(0, startCharacterCounts) + '...' + addr.slice(-endCharacterCounts) : '';
  }

  function shortenTransactionHash(hash: string, startCharacterCounts = 10, endCharacterCounts = 6) {
    return hash ? hash.slice(0, startCharacterCounts) + '...' + hash.slice(-endCharacterCounts) : '';
  }

  const handleUpdatePrice = async (id: string, price: number) => {
    setIsUpdatingPrice(true);
    try {
      await updatePrice(id, price);
      toast({ title: 'Price updated!', description: `Listing price updated to ${price} ETH.` });
      // Reload NFT info
      const nftData = await getNFTInfo(id);
      setNftWithMetadata(nftData);
      setIsEditingPrice(false);
    } catch (error) {
      toast({ title: 'Error updating price', description: 'Failed to update price. Please try again.', variant: 'destructive' });
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Overlay loading spinner khi isUpdatingPrice */}
      {isUpdatingPrice && (
        <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-20">
          <LoadingSpinner />
          <span className="mt-2 text-gray-600 text-sm">Processing...</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Section */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <img
                src={nftWithMetadata.image}
                alt={nftWithMetadata.name}
                className="w-full h-96 lg:h-[500px] object-cover rounded-lg"
              />
            </CardContent>
          </Card>
        </div>

        {/* Details Section */}
        <div className="space-y-6">
          {/* Ở phần header tên NFT */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-gray-800">{nftWithMetadata.name}</h1>
              {isOwner && (
                <Badge variant="secondary" className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 border-blue-200">Owner</Badge>
              )}
            </div>
          </div>

          {/* Information Section - Description full width, attributes grid 2 cột, category là attribute đầu tiên */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-gray-600">
                    <FileText className="w-4 h-4 mr-2 text-gray-400" />
                    Description
                  </span>
                  <span className="text-sm text-gray-800 font-medium ml-4 text-right">{nftWithMetadata.description}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-gray-600">
                    <Tag className="w-4 h-4 mr-2 text-gray-400" />
                    Category
                  </span>
                  <Badge variant="outline" className="ml-4 text-xs px-2 py-0.5">{nftWithMetadata.category}</Badge>
                </div>
                {nftWithMetadata.attributes && nftWithMetadata.attributes.filter(attr => attr.trait_type.toLowerCase() !== 'category').length > 0 && (
                  <div>
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <List className="w-4 h-4 mr-2 text-gray-400" />
                      Attribute
                    </div>
                    <div className="space-y-1">
                      {nftWithMetadata.attributes.filter(attr => attr.trait_type.toLowerCase() !== 'category').map((attr, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1">
                          <span className="text-xs text-gray-600">{attr.trait_type}</span>
                          <span className="text-xs text-gray-800 font-medium">{attr.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Owner</span>
                </div>
                <span className="text-sm font-mono flex items-center gap-1">
                  {shortenAddress(nftWithMetadata.owner)}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(nftWithMetadata.owner);
                      // @ts-ignore
                      if (typeof toast === 'function') toast({ title: 'Copied!', description: 'Owner address copied.' });
                    }}
                    className="hover:text-blue-600"
                    title="Copy owner address"
                    type="button"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Creator</span>
                </div>
                <span className="text-sm font-mono flex items-center gap-1">
                  {shortenAddress(nftWithMetadata.creator)}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(nftWithMetadata.creator);
                      // @ts-ignore
                      if (typeof toast === 'function') toast({ title: 'Copied!', description: 'Creator address copied.' });
                    }}
                    className="hover:text-blue-600"
                    title="Copy creator address"
                    type="button"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Created</span>
                </div>
                <span className="text-sm">
                  {nftWithMetadata.createdAt.toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Token ID</span>
                </div>
                <span className="text-sm font-mono flex items-center gap-1">
                  #{nftWithMetadata.id}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(nftWithMetadata.id);
                      // @ts-ignore
                      if (typeof toast === 'function') toast({ title: 'Copied!', description: 'Token ID copied.' });
                    }}
                    className="hover:text-blue-600"
                    title="Copy Token ID"
                    type="button"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Royalty Fee</span>
                </div>
                <span className="text-sm font-medium">{formatRoyaltyFee(nftWithMetadata.royaltyFee)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Last Sold Price</span>
                </div>
                <span className="text-sm font-medium">{nftWithMetadata.lastSoldPrice} ETH</span>
              </div>
            </CardContent>
          </Card>

          {/* Price and Buy Section */}
          {nftWithMetadata.isListing && (
            <Card className="relative">
              <CardContent>
                <div className="flex items-center gap-2 py-2">
                  <span className="text-base font-semibold text-gray-800">Listing Price:</span>
                    <Zap className="w-5 h-5 text-yellow-500" />
                  {isOwner ? (
                    isEditingPrice ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          className="border border-gray-300 rounded-md px-2 py-1 text-2xl font-bold text-blue-600 w-28 focus:outline-none focus:ring-2 focus:ring-blue-400 mr-2"
                          style={{ width: '110px' }}
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                        <span className="text-blue-600 text-2xl font-bold mr-2">ETH</span>
                        <Button
                          size="icon"
                          className="w-8 h-8 p-0 bg-green-100 hover:bg-green-200 text-green-600 mr-1 flex items-center justify-center"
                          onClick={e => {
                            e.stopPropagation();
                            const newPrice = Number(editPrice);
                            if (isNaN(newPrice) || newPrice <= 0) return;
                            if (newPrice === nftWithMetadata.price) {
                              toast({ title: 'Price has not changed.', variant: 'destructive' });
                              return;
                            }
                            handleUpdatePrice(nftWithMetadata.id, newPrice);
                          }}
                          disabled={isNaN(Number(editPrice)) || Number(editPrice) <= 0}
                          title="Confirm"
                        >
                          {typeof CheckCircle !== 'undefined' ? <CheckCircle className="w-5 h-5" /> : <CircleCheck className="w-5 h-5" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-8 h-8 p-0 text-red-500 hover:bg-red-100 flex items-center justify-center"
                          onClick={e => {
                            e.stopPropagation();
                            setIsEditingPrice(false);
                            setEditPrice(nftWithMetadata.price.toString());
                          }}
                          title="Cancel"
                        >
                          {typeof XCircle !== 'undefined' ? <XCircle className="w-5 h-5" /> : <CircleX className="w-5 h-5" />}
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-blue-600 mr-2">{nftWithMetadata.price} ETH</span>
                        <Button
                          size="icon"
                          className="w-8 h-8 p-0 bg-gray-100 hover:bg-gray-200 text-blue-600 border border-blue-200 mr-2 flex items-center justify-center"
                          onClick={e => {
                            e.stopPropagation();
                            setIsEditingPrice(true);
                            setEditPrice(nftWithMetadata.price.toString());
                          }}
                          title="Edit Price"
                        >
                          <Edit2 className="w-5 h-5" />
                        </Button>
                      </>
                    )
                  ) : (
                    <span className="text-2xl font-bold">{nftWithMetadata.price} ETH</span>
                  )}
                </div>
                {canBuy && (
                  <Button 
                    onClick={handleBuy}
                    disabled={isBuying}
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    size="lg"
                  >
                    {isBuying ? 'Buying...' : 'Buy Now'}
                  </Button>
                )}
                
              </CardContent>
            </Card>
          )}

          {!nftWithMetadata.isListing && !isOwner && (
            <Card>
              <CardContent className="py-6">
                <Badge variant="secondary" className="w-full justify-center py-2">
                  Not for sale
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* History Section */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {historicalTransactions.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-lg shadow-sm">
                <Table className="bg-white text-gray-800 border border-gray-200">
                  <TableHeader>
                    <TableRow className="bg-gray-200 hover:bg-gray-300">
                      <TableHead className="text-black-700 text-center font-bold">Time</TableHead>
                      <TableHead className="text-black-700 text-center font-bold">Transaction Hash</TableHead>
                      <TableHead className="text-black-700 text-center font-bold">Seller</TableHead>
                      <TableHead className="text-black-700 text-center font-bold">Buyer</TableHead>
                      <TableHead className="text-black-700 text-right font-bold">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicalTransactions.map((transaction, index) => (
                      <TableRow key={index} className="hover:bg-blue-50 transition">
                        <TableCell className="text-center">
                          {transaction.soldAt.toLocaleDateString()} {transaction.soldAt.toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <a className="text-blue-600 hover:underline" href={`https://sepolia.etherscan.io/tx/${transaction.transactionHash}`} target="_blank" rel="noopener noreferrer">
                            {shortenTransactionHash(transaction.transactionHash, 12, 8)}
                          </a>
                        </TableCell>
                        <TableCell className="text-center">
                          <a className="text-blue-600 hover:underline" href={`https://sepolia.etherscan.io/address/${transaction.seller}`} target="_blank" rel="noopener noreferrer">
                            {shortenAddress(transaction.seller, 8, 6)}
                          </a>
                        </TableCell>
                        <TableCell className="text-center">
                          <a className="text-blue-600 hover:underline" href={`https://sepolia.etherscan.io/address/${transaction.buyer}`} target="_blank" rel="noopener noreferrer">
                            {shortenAddress(transaction.buyer, 8, 6)}
                          </a>
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.price} ETH
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Paging controls */}
              {totalHistoryPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button size="icon" variant="ghost" onClick={() => handlePageChange(Math.max(1, historyPage - 1))} disabled={historyPage === 1}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <span className="text-sm text-gray-600">Page {historyPage} of {totalHistoryPages}</span>
                  <Button size="icon" variant="ghost" onClick={() => handlePageChange(Math.min(totalHistoryPages, historyPage + 1))} disabled={historyPage === totalHistoryPages}>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">No historical transactions found for this NFT.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NFTDetail;
