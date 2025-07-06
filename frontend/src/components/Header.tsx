
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Store, User } from 'lucide-react';
import WalletConnect from './WalletConnect';

const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Marketplace', icon: Store },
    { path: '/my-nfts', label: 'My NFTs', icon: User },
  ];

  return (
    <header className="bg-white shadow-lg border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">NFT Marketplace</span>
          </Link>

          <nav className="flex items-center space-x-6">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive(path)
                    ? 'bg-blue-100 text-blue-600 font-medium'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <WalletConnect />
        </div>
      </div>
    </header>
  );
};

export default Header;
