import React from 'react';
import { ethers } from 'ethers';
import { NFTWithMetadata } from '../contexts/NFTContext';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Percent, DollarSign } from 'lucide-react';

interface NFTCardGridProps {
  nft: NFTWithMetadata;
  royaltyFee: number;
  totalRoyaltyFees?: number;
  onClick?: () => void;
}

const NFTCardGrid: React.FC<NFTCardGridProps> = ({ 
  nft, 
  royaltyFee, 
  totalRoyaltyFees, 
  onClick 
}) => {
  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer" 
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* NFT Image */}
        <div className="aspect-square relative">
          <img
            src={nft.image}
            alt={nft.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.svg';
            }}
          />
        </div>

        {/* NFT Info */}
        <div className="p-4">
          <h3 className="font-medium text-gray-900 truncate mb-2">{nft.name}</h3>
          
          {/* Royalty Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Percent className="h-3 w-3 text-gray-500" />
              <span className="text-sm text-gray-600">Royalty:</span>
            </div>
            <Badge variant="secondary" className="text-xs">{royaltyFee}%</Badge>
          </div>

          {/* Total Earnings */}
          {totalRoyaltyFees !== undefined && (
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-gray-500" />
                <span className="text-sm text-gray-600">Total Royalty Earning:</span>
              </div>
              <span className="text-sm font-medium text-green-600">
                {Number(ethers.formatEther(totalRoyaltyFees)).toFixed(4)} ETH
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NFTCardGrid; 