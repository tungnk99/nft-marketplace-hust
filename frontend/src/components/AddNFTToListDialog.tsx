import React, { useState, useEffect } from 'react';
import { useNFT } from '../contexts/NFTContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Plus, Copy, Percent, Hash } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { User } from 'lucide-react';
import { formatRoyaltyFee } from '../lib/utils';

interface AddNFTToListDialogProps {
  onNFTListed: (id: string, price: number) => void;
}

const AddNFTToListDialog: React.FC<AddNFTToListDialogProps> = ({ onNFTListed }) => {
  const { getUserNFTs, getNFTWithMetadata } = useNFT();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<string | null>(null);
  const [listPrice, setListPrice] = useState('');
  const [unlistedNFTsWithMetadata, setUnlistedNFTsWithMetadata] = useState<any[]>([]);
  const [loadingFetch, setLoadingFetch] = useState(false); // loading khi fetch NFTs
  const [loadingList, setLoadingList] = useState(false); // loading khi listing

  useEffect(() => {
    if (!isOpen) return;
    const fetchMetadata = async () => {
      setLoadingFetch(true);
      const userNFTs = await getUserNFTs();
      const unlistedNFTs = userNFTs.filter(nft => !nft.isListing);
      const nftsWithMeta = await Promise.all(unlistedNFTs.map(nft => getNFTWithMetadata(nft)));
      setUnlistedNFTsWithMetadata(nftsWithMeta.filter(Boolean));
      setLoadingFetch(false);
    };
    fetchMetadata();
    // Reset selection and price when dialog opens
    setSelectedNFT(null);
    setListPrice('');
  }, [isOpen, getUserNFTs, getNFTWithMetadata]);

  const handleListNFT = async () => {
    if (selectedNFT && listPrice) {
      const price = parseFloat(listPrice);
      if (price > 0) {
        setLoadingList(true);
        try {
          const maybePromise = onNFTListed(selectedNFT, price);
          if (typeof maybePromise !== 'undefined' && maybePromise !== null && typeof (maybePromise as Promise<any>).then === 'function') {
            await maybePromise;
          }
          setIsOpen(false);
          setSelectedNFT(null);
          setListPrice('');
          toast({
            title: "NFT Listed!",
            description: `Your NFT is now listed for sale at ${price} ETH.`,
          });
        } catch (error: any) {
          toast({
            title: "Listing Cancelled or Failed",
            description: error?.message || "Listing was cancelled or failed. Please try again.",
            variant: "destructive"
          });
        } finally {
          setLoadingList(false);
        }
      }
    }
  };

  function shortenAddress(addr: string) {
    return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : '';
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="mb-6">
          <Plus className="w-4 h-4 mr-2" />
          Add NFT to List
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add NFT to Marketplace</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loadingFetch ? (
            <div className="text-center py-8">
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                <span className="text-blue-600 text-sm">Loading NFTs...</span>
              </div>
            </div>
          ) : unlistedNFTsWithMetadata.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">All your NFTs are already listed for sale!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {unlistedNFTsWithMetadata.map((nft) => (
                  <Card 
                    key={nft.id} 
                    className={`cursor-pointer transition-all flex flex-col items-center border border-gray-200 bg-white ${
                      selectedNFT === nft.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-lg'
                    }`}
                    onClick={() => setSelectedNFT(nft.id)}
                    style={{ minWidth: 220 }}
                  >
                    <CardHeader className="p-0 flex justify-center items-center bg-gray-50 rounded-t-lg" style={{ height: 200 }}>
                      <img
                        src={nft.image}
                        alt={nft.name}
                        className="max-h-[180px] w-auto object-contain rounded-lg shadow"
                        style={{ margin: '0 auto', background: '#fff' }}
                      />
                    </CardHeader>
                    <CardContent className="p-3 flex flex-col items-center">
                      <CardTitle className="text-base font-semibold mb-1 text-center">{nft.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {nft.category}
                      </Badge>
                      <div className="flex flex-col items-center mt-2 gap-1">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          Owner:
                          <span className="font-mono">{shortenAddress(nft.owner)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(nft.owner);
                              // @ts-ignore
                              if (typeof toast === 'function') toast({ title: 'Copied!', description: 'Owner address copied.' });
                            }}
                            className="hover:text-blue-600"
                            title="Copy owner address"
                            type="button"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          Creator:
                          <span className="font-mono">{shortenAddress(nft.creator)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(nft.creator);
                              // @ts-ignore
                              if (typeof toast === 'function') toast({ title: 'Copied!', description: 'Creator address copied.' });
                            }}
                            className="hover:text-blue-600"
                            title="Copy creator address"
                            type="button"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Hash className="w-3 h-3 mr-1" />
                          <span className="mr-2">Token ID:</span>
                          <span className="font-mono">#{nft.id}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(nft.id);
                              // @ts-ignore
                              if (typeof toast === 'function') toast({ title: 'Copied!', description: 'Token ID copied.' });
                            }}
                            className="hover:text-blue-600"
                            title="Copy Token ID"
                            type="button"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedNFT && (
                <div className="border-t pt-4 space-y-4 relative">
                  {loadingList && (
                    <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                      <span className="text-blue-600 text-sm">Listing NFT...</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Set Price (ETH)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Enter price in ETH"
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      disabled={loadingList}
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleListNFT}
                      disabled={!listPrice || parseFloat(listPrice) <= 0 || loadingList}
                      className="flex-1"
                    >
                      {loadingList ? (
                        <span className="flex items-center justify-center"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>Listing...</span>
                      ) : (
                        'List NFT for Sale'
                      )}
                    </Button>
                    <Button 
                      onClick={() => {
                        setSelectedNFT(null);
                        setListPrice('');
                      }}
                      variant="outline"
                      className="flex-1"
                      disabled={loadingList}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddNFTToListDialog;
