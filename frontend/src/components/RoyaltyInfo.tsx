import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNFT } from '../contexts/NFTContext';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Loader2, Coins } from 'lucide-react';

interface RoyaltyInfoProps {
  nftId: string;
  royaltyFee: number;
  totalRoyaltyFees?: number;
}

const RoyaltyInfo: React.FC<RoyaltyInfoProps> = ({ nftId, royaltyFee, totalRoyaltyFees }) => {
  const { getRoyaltyEarnings } = useNFT();
  const [royaltyEarnings, setRoyaltyEarnings] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRoyaltyEarnings = async () => {
    setLoading(true);
    try {
      const earnings = await getRoyaltyEarnings(nftId);
      setRoyaltyEarnings(earnings);
    } catch (error) {
      console.error('Error fetching royalty earnings:', error);
      setRoyaltyEarnings(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoyaltyEarnings();
  }, [nftId]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Coins className="h-4 w-4" />
          Royalty Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Royalty Fee:</span>
          <Badge variant="secondary">{royaltyFee}%</Badge>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Royalty Earning:</span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-600">
              {totalRoyaltyFees !== undefined ? `${Number(ethers.formatEther(totalRoyaltyFees)).toFixed(4)} ETH` : 'N/A'}
            </span>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchRoyaltyEarnings}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            'Refresh Earnings'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RoyaltyInfo; 