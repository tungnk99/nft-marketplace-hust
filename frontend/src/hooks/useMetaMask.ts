
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
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

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
        
        // Reset retry count on successful connection
        setRetryCount(0);
        console.log('Successfully connected to MetaMask');
      }
    } catch (error: any) {
      console.error('Error connecting to MetaMask:', error);
      
      if (error.code === 4001) {
        alert('Bạn đã từ chối kết nối với MetaMask. Vui lòng thử lại và chấp nhận kết nối.');
      } else if (error.code === -32002) {
        // Don't show confirm dialog if already retrying
        if (isRetrying) {
          console.log('Already retrying, ignoring duplicate error');
          return;
        }
        
        // Limit retry attempts to prevent infinite loops
        if (retryCount >= 2) {
          alert('Đã thử kết nối nhiều lần. Vui lòng kiểm tra popup MetaMask hoặc thử lại sau.');
          setRetryCount(0);
          setIsRetrying(false);
          return;
        }
        
        // Handle pending request error
        const shouldRetry = confirm(
          'Đã có yêu cầu kết nối đang chờ xử lý. Bạn có muốn:\n\n' +
          '1. Kiểm tra popup MetaMask và chấp nhận kết nối\n' +
          '2. Thử kết nối lại (có thể mất vài giây)\n\n' +
          'Nhấn OK để thử kết nối lại, Cancel để kiểm tra popup MetaMask.'
        );
        
        if (shouldRetry) {
          setRetryCount(prev => prev + 1);
          setIsRetrying(true);
          
          // First, disconnect current connection
          setState(prev => ({
            ...prev,
            isConnected: false,
            account: null,
          }));
          
          // Clear pending requests
          await clearPendingRequests();
          
          // Wait a bit and try fresh connection
          setTimeout(async () => {
            console.log('Retrying MetaMask connection with fresh request...');
            try {
              // Check if MetaMask is still available
              if (!window.ethereum || !window.ethereum.isMetaMask) {
                alert('MetaMask không còn khả dụng. Vui lòng kiểm tra extension MetaMask.');
                setIsRetrying(false);
                setRetryCount(0);
                return;
              }
              
              // Fresh connection request
              const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts',
              });
              
              const chainId = await window.ethereum.request({
                method: 'eth_chainId',
              });
              
              console.log('Retry successful - Connected accounts:', accounts);
              console.log('Chain ID:', chainId);
              
              if (accounts.length > 0) {
                setState(prev => ({
                  ...prev,
                  isConnected: true,
                  account: accounts[0],
                  chainId: chainId,
                }));
                
                // Reset retry count on successful connection
                setRetryCount(0);
                setIsRetrying(false);
                console.log('Successfully connected to MetaMask');
              }
            } catch (retryError: any) {
              console.error('Retry failed:', retryError);
              setIsRetrying(false);
              
              if (retryError.code === 4001) {
                alert('Bạn đã từ chối kết nối với MetaMask. Vui lòng thử lại và chấp nhận kết nối.');
                setRetryCount(0);
              } else if (retryError.code === -32002) {
                alert('Vẫn còn yêu cầu đang chờ xử lý. Vui lòng kiểm tra popup MetaMask và thử lại sau.');
                setRetryCount(0);
              } else {
                alert('Có lỗi xảy ra khi kết nối với MetaMask. Vui lòng thử lại.');
                setRetryCount(0);
              }
            }
          }, 2000);
        } else {
          // If user cancels, reset retry count
          setRetryCount(0);
          setIsRetrying(false);
          console.log('User chose to check MetaMask popup manually');
        }
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

  const clearPendingRequests = async () => {
    if (window.ethereum && window.ethereum.isMetaMask) {
      try {
        // Try to get accounts without requesting (this might clear pending requests)
        await window.ethereum.request({ method: 'eth_accounts' });
        console.log('Cleared pending requests');
      } catch (error) {
        console.log('No pending requests to clear');
      }
      
      // Additional cleanup: try to disconnect any existing connections
      try {
        // This might help clear any pending state
        await window.ethereum.request({ 
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
        console.log('Requested fresh permissions');
      } catch (error) {
        console.log('Permission request failed or not needed');
      }
    }
  };

  const forceRefreshConnection = async () => {
    if (window.ethereum && window.ethereum.isMetaMask) {
      try {
        // Force refresh by checking connection status
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
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
        
        console.log('Force refreshed MetaMask connection state');
      } catch (error) {
        console.error('Error force refreshing connection:', error);
      }
    }
  };

  return {
    ...state,
    connectWallet,
    disconnectWallet,
    clearPendingRequests,
    forceRefreshConnection,
  };
};
