
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useMetaMask } from '../hooks/useMetaMask';
import { toast } from '@/hooks/use-toast';
import { NFT } from '../contexts/NFTContext';

interface PurchaseConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFT | null;
  onConfirm: () => void;
}

const PurchaseConfirmationDialog: React.FC<PurchaseConfirmationDialogProps> = ({
  isOpen,
  onClose,
  nft,
  onConfirm,
}) => {
  const { isConnected, account, isInstalled, connectWallet } = useMetaMask();

  const handleConfirm = async () => {
    if (!isInstalled) {
      toast({
        title: "Cần cài đặt MetaMask",
        description: "Vui lòng cài đặt MetaMask extension để mua NFT.",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected) {
      try {
        await connectWallet();
        // Wait a bit for connection to complete
        setTimeout(() => {
          if (account) {
            handlePurchase();
          }
        }, 1000);
      } catch (error) {
        toast({
          title: "Lỗi kết nối",
          description: "Không thể kết nối với MetaMask. Vui lòng thử lại.",
          variant: "destructive",
        });
      }
      return;
    }

    handlePurchase();
  };

  const handlePurchase = async () => {
    try {
      toast({
        title: "Đang xử lý giao dịch",
        description: "Vui lòng xác nhận giao dịch trong MetaMask...",
      });
      
      // Simulate MetaMask transaction signing
      setTimeout(() => {
        onConfirm();
        onClose();
        toast({
          title: "Mua thành công!",
          description: "NFT đã được chuyển vào ví của bạn.",
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Giao dịch thất bại",
        description: "Có lỗi xảy ra khi xử lý giao dịch. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  if (!nft) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận mua hàng</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div className="text-center">
              <img
                src={nft.image}
                alt={nft.name}
                className="w-24 h-24 object-cover rounded-lg mx-auto mb-3"
              />
              <h3 className="font-semibold text-lg text-gray-800">{nft.name}</h3>
              <div className="flex justify-center gap-2 mt-2">
                <Badge variant="outline">{nft.category}</Badge>
                <Badge variant="secondary">{nft.rarity}</Badge>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Giá:</span>
                <span className="font-bold text-lg">{nft.price} ETH</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Mạng:</span>
                <span className="text-sm">{nft.blockchain}</span>
              </div>
            </div>

            {!isInstalled ? (
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-sm text-orange-700">
                  <strong>Cần cài đặt MetaMask:</strong>
                  <br />
                  Bạn cần cài đặt MetaMask extension để mua NFT.
                </div>
              </div>
            ) : isConnected ? (
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-700">
                  <strong>Ví đã kết nối:</strong>
                  <br />
                  {account?.slice(0, 6)}...{account?.slice(-4)}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 p-3 rounded-lg">
                <div className="text-sm text-yellow-700">
                  Bạn cần kết nối với ví MetaMask để hoàn tất giao dịch.
                </div>
              </div>
            )}

            <p className="text-sm text-gray-600">
              Bằng cách xác nhận, bạn đồng ý mua NFT này. Giao dịch sẽ được xử lý qua MetaMask.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            {!isInstalled 
              ? 'Tải MetaMask' 
              : !isConnected 
                ? 'Kết nối & Mua' 
                : 'Xác nhận mua'
            }
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PurchaseConfirmationDialog;
