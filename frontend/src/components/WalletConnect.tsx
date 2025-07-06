import React from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMetaMask } from '../hooks/useMetaMask';
import { toast } from '@/hooks/use-toast';

const WalletConnect: React.FC = () => {
  const { isConnected, account, isInstalled, connectWallet, disconnectWallet } = useMetaMask();

  if (!isInstalled) {
    return (
      <Button 
        onClick={connectWallet}
        variant="outline"
        className="flex items-center space-x-2 text-orange-600 border-orange-300 hover:bg-orange-50"
      >
        <Wallet className="w-4 h-4" />
        <span>Cài đặt MetaMask</span>
      </Button>
    );
  }

  if (isConnected && account) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2 bg-green-100 px-3 py-2 rounded-lg border border-green-200">
          <Wallet className="w-4 h-4 text-green-600" />
          <span className="text-sm font-mono text-green-700">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Button 
      onClick={connectWallet}
      variant="outline"
      className="flex items-center space-x-2 text-blue-600 border-blue-300 hover:bg-blue-50"
    >
      <Wallet className="w-4 h-4" />
      <span>Kết nối MetaMask</span>
    </Button>
  );
};

export default WalletConnect;
