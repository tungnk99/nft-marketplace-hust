import React, { useState } from 'react';
import { NFTWithMetadata } from '../contexts/NFTContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { ExternalLink, Edit2, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import LoadingSpinner from './LoadingSpinner';

interface NFTCardTableProps {
  nft: NFTWithMetadata;
  isListing: boolean;
  onDetails?: () => void;
  onList?: (id: string, price: number) => void;
  onDelist?: (id: string) => void;
  onUpdatePrice?: (id: string, price: number) => void;
  showListButton?: boolean;
  showDelistButton?: boolean;
  showUpdatePriceButton?: boolean;
}

const NFTCardTable: React.FC<NFTCardTableProps> = ({ 
  nft, 
  isListing,
  onDetails,
  onList,
  onDelist,
  onUpdatePrice,
  showListButton = false,
  showDelistButton = false,
  showUpdatePriceButton = false
}) => {
  const [listPrice, setListPrice] = useState('');
  const [editPrice, setEditPrice] = useState(nft.price.toString());
  const [showListForm, setShowListForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleList = async () => {
    const price = parseFloat(listPrice);
    if (price > 0) {
      setIsLoading(true);
      try {
        await onList?.(nft.id, price);
        setShowListForm(false);
        setListPrice('');
        toast.success('NFT listed successfully!');
      } catch (error) {
        console.error('Error listing NFT:', error);
        toast.error('Failed to list NFT');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUpdatePrice = async () => {
    const price = parseFloat(editPrice);
    if (price > 0) {
      setIsLoading(true);
      try {
        await onUpdatePrice?.(nft.id, price);
        setShowEditForm(false);
        toast.success('Price updated successfully!');
      } catch (error) {
        console.error('Error updating price:', error);
        toast.error('Failed to update price');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDelist = async () => {
    setIsLoading(true);
    try {
      await onDelist?.(nft.id);
      toast.success('NFT delisted successfully!');
    } catch (error) {
      console.error('Error delisting NFT:', error);
      toast.error('Failed to delist NFT');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
        {/* Image */}
        <div className="flex-shrink-0">
          <img
            src={nft.image}
            alt={nft.name}
            className="w-12 h-12 object-cover rounded-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.svg';
            }}
          />
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{nft.name}</h3>
        </div>

        {/* Category */}
        <div className="w-24 flex-shrink-0">
          <span className="text-sm text-gray-600">{nft.category}</span>
        </div>

        {/* Price */}
        <div className="w-20 flex-shrink-0 text-right">
          {isListing ? (
            <span className="text-sm font-medium text-blue-600">{nft.price} ETH</span>
          ) : (
            <span className="text-sm text-gray-500">-</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {showListButton && !isListing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowListForm(true)}
              disabled={isLoading}
              className="h-8"
            >
              <Tag className="h-3 w-3 mr-1" />
              List
            </Button>
          )}

          {showUpdatePriceButton && isListing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditForm(true)}
              disabled={isLoading}
              className="h-8"
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}

          {showDelistButton && isListing && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelist}
              disabled={isLoading}
              className="h-8"
            >
              <X className="h-3 w-3 mr-1" />
              Delist
            </Button>
          )}

          {onDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDetails}
              className="h-8 w-8 p-0"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* List Form Dialog */}
      <Dialog open={showListForm} onOpenChange={setShowListForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>List NFT for Sale</DialogTitle>
            <DialogDescription>
              Set the price for your NFT in ETH
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Price (ETH)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                placeholder="0.01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowListForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleList} disabled={isLoading || !listPrice}>
              {isLoading ? <LoadingSpinner /> : 'List NFT'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Price Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Listing Price</DialogTitle>
            <DialogDescription>
              Update the price for your listed NFT
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">New Price (ETH)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder="0.01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePrice} disabled={isLoading || !editPrice}>
              {isLoading ? <LoadingSpinner /> : 'Update Price'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NFTCardTable; 