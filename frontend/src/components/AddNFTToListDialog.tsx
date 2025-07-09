import React, { useState, useEffect } from 'react';
import { useNFT } from '../contexts/NFTContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Plus, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AddNFTToListDialogProps {
  onNFTListed: (id: string, price: number) => void;
}

const AddNFTToListDialog: React.FC<AddNFTToListDialogProps> = ({ onNFTListed }) => {
  const { getUserNFTs, getNFTWithMetadata } = useNFT();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<string | null>(null);
  const [listPrice, setListPrice] = useState('');
  const [unlistedNFTsWithMetadata, setUnlistedNFTsWithMetadata] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchMetadata = async () => {
      setLoading(true);
      const userNFTs = await getUserNFTs();
      const unlistedNFTs = userNFTs.filter(nft => !nft.isListing);
      const nftsWithMeta = await Promise.all(unlistedNFTs.map(nft => getNFTWithMetadata(nft)));
      setUnlistedNFTsWithMetadata(nftsWithMeta.filter(Boolean));
      setLoading(false);
    };
    fetchMetadata();
    // Reset selection and price when dialog opens
    setSelectedNFT(null);
    setListPrice('');
  }, [isOpen, getUserNFTs, getNFTWithMetadata]);

  const handleListNFT = () => {
    if (selectedNFT && listPrice) {
      const price = parseFloat(listPrice);
      if (price > 0) {
        onNFTListed(selectedNFT, price);
        setIsOpen(false);
        setSelectedNFT(null);
        setListPrice('');
        toast({
          title: "NFT Listed!",
          description: `Your NFT is now listed for sale at ${price} ETH.`,
        });
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
          {loading ? (
            <div className="text-center py-8">Loading NFTs...</div>
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedNFT && (
                <div className="border-t pt-4 space-y-4">
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
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleListNFT}
                      disabled={!listPrice || parseFloat(listPrice) <= 0}
                      className="flex-1"
                    >
                      List NFT for Sale
                    </Button>
                    <Button 
                      onClick={() => {
                        setSelectedNFT(null);
                        setListPrice('');
                      }}
                      variant="outline"
                      className="flex-1"
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
