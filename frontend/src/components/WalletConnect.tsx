import React, { useState } from 'react';
import { Wallet, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMetaMask } from '../hooks/useMetaMask';
import { toast } from '@/hooks/use-toast';

const WalletConnect: React.FC = () => {
  const { isConnected, account, isInstalled, connectWallet, disconnectWallet, clearPendingRequests, forceRefreshConnection } = useMetaMask();
  const [isClearing, setIsClearing] = useState(false);
  const [lastRetryTime, setLastRetryTime] = useState(0);

  if (!isInstalled) {
    return (
      <Button 
        onClick={connectWallet}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
      >
        <Wallet className="w-5 h-5 mr-2" />
        <span>Install MetaMask</span>
      </Button>
    );
  }

  if (isConnected && account) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2 bg-green-100 px-4 py-3 rounded-xl border border-green-200">
          <Wallet className="w-4 h-4 text-green-600" />
          <span className="text-sm font-mono text-green-700 font-medium">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        </div>
      </div>
    );
  }

  const handleClearAndConnect = async () => {
    // Prevent spam clicking
    const now = Date.now();
    if (now - lastRetryTime < 3000) { // 3 seconds cooldown
      console.log('Retry button clicked too quickly, ignoring...');
      return;
    }
    
    setLastRetryTime(now);
    setIsClearing(true);
    
    try {
      // First force refresh connection state
      await forceRefreshConnection();
      
      // Then clear pending requests
      await clearPendingRequests();
      
      // Only show toast on success, not on every retry
      console.log('Cleared pending requests, retrying connection...');
      
      setTimeout(() => {
        connectWallet();
        setIsClearing(false);
      }, 1000);
    } catch (error) {
      setIsClearing(false);
      // Only show error toast if it's a real error
      console.error('Error clearing pending requests:', error);
    }
  };

  const handleReconnect = async () => {
    // Prevent spam clicking
    const now = Date.now();
    if (now - lastRetryTime < 3000) { // 3 seconds cooldown
      console.log('Reconnect button clicked too quickly, ignoring...');
      return;
    }
    
    setLastRetryTime(now);
    setIsClearing(true);
    
    try {
      // Disconnect first
      disconnectWallet();
      
      // Clear pending requests
      await clearPendingRequests();
      
      console.log('Disconnected and cleared pending requests, reconnecting...');
      
      setTimeout(() => {
        connectWallet();
        setIsClearing(false);
      }, 1000);
    } catch (error) {
      setIsClearing(false);
      console.error('Error during reconnect:', error);
    }
  };

  return (
    <div className="space-y-3">
      <Button 
        onClick={connectWallet}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <Wallet className="w-5 h-5 mr-2" />
        <span>Connect MetaMask</span>
      </Button>
      
      <Button 
        onClick={handleReconnect}
        variant="outline"
        size="sm"
        disabled={isClearing}
        className="w-full text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400 rounded-lg transition-colors"
        title="Disconnect and reconnect to MetaMask"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isClearing ? 'animate-spin' : ''}`} />
        <span>Reconnect</span>
      </Button>
    </div>
  );
};

export default WalletConnect;
