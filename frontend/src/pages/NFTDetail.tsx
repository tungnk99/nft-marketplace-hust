import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNFT, NFTWithMetadata, NFTTransaction } from '../contexts/NFTContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Calendar, User, Tag, Zap, Copy, Percent } from 'lucide-react';
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
  const { userAddress, buyNFT, getNFTInfo, getHistoricalTransactions } = useNFT();
  const [isBuying, setIsBuying] = useState(false);
  const [nftWithMetadata, setNftWithMetadata] = useState<NFTWithMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [historicalTransactions, setHistoricalTransactions] = useState<NFTTransaction[]>([]);

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
        const transactions = await getHistoricalTransactions(id);
        setHistoricalTransactions(transactions);
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
  
  function shortenAddress(addr: string) {
    return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : '';
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

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
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{nftWithMetadata.name}</h1>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline">{nftWithMetadata.category}</Badge>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{nftWithMetadata.description}</p>
            </CardContent>
          </Card>

          {/* Attributes Section */}
          {nftWithMetadata.attributes && nftWithMetadata.attributes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Attributes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {nftWithMetadata.attributes.map((attr, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">{attr.trait_type}</span>
                      <Badge variant="outline">{attr.value}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Price</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <span className="text-2xl font-bold">{nftWithMetadata.price} ETH</span>
                  </div>
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
                
                {isOwner && (
                  <Badge variant="secondary" className="w-full justify-center py-2">
                    You own this NFT
                  </Badge>
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

      {historicalTransactions.length > 0 && (
      <div className="mt-12">
        <div className="mt-12 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Historical Transactions</h1>
          {/* <p className="text-black-500"></p> */}
        </div>
        <div  className="shadow-lg">
          <Table className="bg-white text-gray-800 border border-gray-200">
            {/* <TableCaption>Historical Transactions.</TableCaption> */}
            <TableHeader>
              <TableRow className="bg-gray-200 hover:bg-gray-300">
                <TableHead className="text-blue-600 text-center">Time</TableHead>
                <TableHead className="text-blue-600 text-center">Seller</TableHead>
                <TableHead className="text-blue-600 text-center">Buyer</TableHead>
                <TableHead className="text-blue-600 text-center">Price</TableHead>
                {/* <TableHead className="text-right">Actions</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {historicalTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="text-center">
                    {transaction.soldAt.toLocaleDateString()} {transaction.soldAt.toLocaleTimeString()}
                  </TableCell>
                  <TableCell className="text-center">
                    {transaction.seller}
                  </TableCell>
                  <TableCell className="text-center">
                    {transaction.buyer}
                  </TableCell>
                  <TableCell className="text-right">
                    {transaction.price} ETH
                  </TableCell>
                  {/* <TableCell className="text-right">
                    <button className="text-blue-600 hover:underline">View</button>
                  </TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      )}

      {historicalTransactions.length === 0 && (
        <div className="mt-12 text-center">
          <p className="text-gray-500">No historical transactions found for this NFT.</p>
        </div>
      )}
    </div>
  );
};

export default NFTDetail;
