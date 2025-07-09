
import { useState, useEffect } from 'react';

interface MetaMaskState {
  isConnected: boolean;
  account: string | null;
  isInstalled: boolean;
  chainId: string | null;
}

export const useMetaMask = () => {
  const [state, setState] = useState<MetaMaskState>({
    isConnected: false,
    account: null,
    isInstalled: false,
    chainId: null,
  });

  useEffect(() => {
    // Check if MetaMask is installed
    const checkMetaMask = () => {
      const isInstalled = 
        typeof window !== 'undefined' && 
        typeof window.ethereum !== 'undefined' && 
        window.ethereum.isMetaMask === true;
      
      console.log('MetaMask installed:', isInstalled);
      setState(prev => ({ ...prev, isInstalled }));
    };

    checkMetaMask();

    // Check if already connected
    const checkConnection = async () => {
      if (window.ethereum && window.ethereum.isMetaMask) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          
          console.log('Existing accounts:', accounts);
          console.log('Chain ID:', chainId);
          
          if (accounts.length > 0) {
            setState(prev => ({
              ...prev,
              isConnected: true,
              account: accounts[0],
              chainId: chainId,
            }));
          } else {
            setState(prev => ({
              ...prev,
              isConnected: false,
              account: null,
              chainId: chainId,
            }));
          }
        } catch (error) {
          console.error('Error checking MetaMask connection:', error);
        }
      }
    };

    checkConnection();

    // Listen for account changes
    const handleAccountsChanged = (accounts: string[]) => {
      console.log('Accounts changed:', accounts);
      // Reload lại trang khi đổi account
      window.location.reload();
    };

    // Listen for chain changes
    const handleChainChanged = (chainId: string) => {
      console.log('Chain changed:', chainId);
      setState(prev => ({
        ...prev,
        chainId: chainId,
      }));
    };

    if (window.ethereum && window.ethereum.isMetaMask) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum && window.ethereum.isMetaMask) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const connectWallet = async () => {
    if (!state.isInstalled) {
      alert('Vui lòng cài đặt MetaMask extension trước khi kết nối!');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    if (!window.ethereum || !window.ethereum.isMetaMask) {
      console.error('MetaMask not detected');
      alert('Không tìm thấy MetaMask. Vui lòng đảm bảo bạn đã cài đặt extension MetaMask.');
      return;
    }

    try {
      console.log('Requesting MetaMask connection...');
      
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      // Get chain ID
      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      });
      
      console.log('Connected accounts:', accounts);
      console.log('Chain ID:', chainId);
      
      if (accounts.length > 0) {
        setState(prev => ({
          ...prev,
          isConnected: true,
          account: accounts[0],
          chainId: chainId,
        }));
        
        console.log('Successfully connected to MetaMask');
      }
    } catch (error: any) {
      console.error('Error connecting to MetaMask:', error);
      
      if (error.code === 4001) {
        alert('Bạn đã từ chối kết nối với MetaMask. Vui lòng thử lại và chấp nhận kết nối.');
      } else if (error.code === -32002) {
        alert('Đã có yêu cầu kết nối đang chờ xử lý. Vui lòng kiểm tra popup MetaMask.');
      } else {
        alert('Có lỗi xảy ra khi kết nối với MetaMask. Vui lòng thử lại.');
      }
    }
  };

  const disconnectWallet = () => {
    setState(prev => ({
      ...prev,
      isConnected: false,
      account: null,
      chainId: null,
    }));
    console.log('Wallet disconnected');
  };

  return {
    ...state,
    connectWallet,
    disconnectWallet,
  };
};
