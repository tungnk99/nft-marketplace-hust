// Test script để kiểm tra read-only mode
import { ethers } from 'ethers';

const nftContractAddress = "0x0285587623d6fD48E06072A8c43Fa9DE7A4A6a76";
const marketplaceContractAddress = "0xD1e51B09c59Edc26ad119f3b8fC7342AF6534D70";

// Load ABI files
import nftContractABI from './contracts/NFTv2_abi.json' assert { type: 'json' };
import marketplaceContractABI from './contracts/NFTMarketplacev2_abi.json' assert { type: 'json' };

async function testReadOnly() {
  try {
    console.log('🧪 Testing read-only mode...');
    
    // Create provider
    const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
    
    // Initialize contracts
    const nftContract = new ethers.Contract(nftContractAddress, nftContractABI, provider);
    const marketplaceContract = new ethers.Contract(marketplaceContractAddress, marketplaceContractABI, provider);
    
    console.log('✅ Contracts created');
    
    // Test getting listings
    console.log('📋 Getting all listings...');
    const listings = await marketplaceContract.getAllListings();
    console.log('📊 Found listings:', listings.length);
    
    if (listings.length > 0) {
      console.log('📝 First listing:', listings[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testReadOnly(); 