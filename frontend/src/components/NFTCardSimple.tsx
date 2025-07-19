import React from 'react';
import { ethers } from 'ethers';
import { NFTWithMetadata } from '../contexts/NFTContext';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { ExternalLink } from 'lucide-react';

interface NFTCardSimpleProps {
  nft: NFTWithMetadata;
  royaltyFee: number;
  totalRoyaltyFees?: number;
  onDetails?: () => void;
}

const NFTCardSimple: React.FC<NFTCardSimpleProps> = ({ 
  nft, 
  royaltyFee, 
  totalRoyaltyFees, 
  onDetails 
}) => {
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Small Image */}
          <div className="flex-shrink-0">
            <img
              src={nft.image}
              alt={nft.name}
              className="w-16 h-16 object-cover rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder.svg';
              }}
            />
          </div>

          {/* NFT Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{nft.name}</h3>
            <p className="text-sm text-gray-500 truncate">{nft.category}</p>
          </div>

          {/* Royalty Info */}
          <div className="flex-shrink-0 text-right">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-gray-600">Royalty:</span>
              <Badge variant="secondary" className="text-xs">{royaltyFee}%</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Royalty Earning:</span>
              <span className="text-sm font-medium text-green-600">
                {totalRoyaltyFees !== undefined ? `${Number(ethers.formatEther(totalRoyaltyFees)).toFixed(4)} ETH` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Details Button */}
          {onDetails && (
            <div className="flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onDetails}
                className="h-8 w-8 p-0"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NFTCardSimple; 