import React, { useState } from 'react';
import { NFT, NFTWithMetadata } from '../contexts/NFTContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Wallet, Tag, User, Calendar, Copy, Percent, Hash } from 'lucide-react';
import { formatRoyaltyFee } from '../lib/utils';

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
  showListedTab?: boolean; // New prop to control listed tab display
  showDelistButton?: boolean;
  showStatusBadge?: boolean; // New prop to control status badge display
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
  showStatusBadge = true // Default to true for marketplace view
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [listPrice, setListPrice] = useState('');
  const [showListForm, setShowListForm] = useState(false);

  const handleBuy = async () => {
    setIsLoading(true);
    // Simulate transaction delay
    setTimeout(() => {
      onBuy?.(nft.id);
      setIsLoading(false);
    }, 1500);
  };

  const handleList = () => {
    const price = parseFloat(listPrice);
    if (price > 0) {
      onList?.(nft.id, price);
      setShowListForm(false);
      setListPrice('');
    }
  };
  const handleUpdatePrice = () => {
    const price = parseFloat(listPrice);
    setTimeout(() => {
    onUpdatePrice?.(nft.id, price);
    }, 1500)
  };
  const handleDelist = () => {
    onDelist?.(nft.id);
  };

  const handleCardClick = () => {
    onClick?.();
  };
  const handleDetailsClick = () => {
    onDetails?.();
  }

  function shortenAddress(addr: string) {
    return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : '';
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer" onClick={handleCardClick}>
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
          <div className="flex items-center gap-1">
            <Wallet className="w-3 h-3 mr-1" />
            <span className="mr-2">Owner:</span>
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
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 mr-1" />
            <span className="mr-2">Creator:</span>
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
          <div className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            <span className="mr-2">Created:</span>
            <span>{nft.createdAt.toLocaleDateString()}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Percent className="w-3 h-3 mr-1" />
            <span className="mr-2">Royalty:</span>
            <span className="font-medium">{formatRoyaltyFee(nft.royaltyFee)}</span>
          </div>
          <div className="flex items-center gap-1">
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
        
        {nft.isListing && (
          <div className="flex items-center text-lg font-bold text-blue-600 mt-3">
            <Tag className="w-4 h-4 mr-1" />
            {nft.price} ETH
          </div>
        )}
        {nft.isListing && showListedTab && (
          <div className="space-y-2">
            <input
              type="number"
              step="0.1"
              placeholder="Modify Price in ETH"
              value={listPrice}
              onChange={(e) => setListPrice(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
            <div className="flex space-x-2">
              <Button onClick={handleUpdatePrice} size="sm" className="flex-1">
                Modify Price
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleDetailsClick} size="sm" className="flex-1">
                Details
              </Button>
            </div>          </div>
        )}    
      </CardContent>
      
      <CardFooter className="p-4 pt-0" onClick={(e) => e.stopPropagation()}>
        {showBuyButton && nft.isListing && (
          <Button 
            onClick={handleBuy} 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Processing...' : `Buy for ${nft.price} ETH`}
          </Button>
        )}
        
        {showDelistButton && nft.isListing && (
          <Button 
            onClick={handleDelist}
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50"
          >
            Delist from Sale
          </Button>
        )}      
    
        {showListButton && !nft.isListing && (
          <div className="w-full">
            {!showListForm ? (
              <Button 
                onClick={() => setShowListForm(true)}
                variant="outline"
                className="w-full"
              >
                List for Sale
              </Button>
            ) : (
              <div className="space-y-2">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Price in ETH"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <div className="flex space-x-2">
                  <Button onClick={handleList} size="sm" className="flex-1">
                    List
                  </Button>
                  <Button 
                    onClick={() => setShowListForm(false)} 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default NFTCard;
