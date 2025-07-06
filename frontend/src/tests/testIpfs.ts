import { IPFSService } from '../services/ipfsService';

export const testIPFSUpload = async () => {
  console.log('🚀 Starting IPFS Upload Test...');
  
  try {
    const ipfsService = new IPFSService();
    
    // Test 1: Upload file 
    console.log('\n📤 Testing single file upload...');
    const testContent = 'Hello IPFS! This is a test file.';
    const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
    
    const imageUrl = await ipfsService.uploadImage(testFile);
    console.log('✅ Image upload successful:', imageUrl);
    
    // Test 2: Upload metadata
    console.log('\n📤 Testing metadata upload...');
    const testMetadata = {
      name: 'Test NFT',
      description: 'This is a test NFT for IPFS',
      image: imageUrl,
      attributes: [
        { trait_type: 'Type', value: 'Test' },
        { trait_type: 'Category', value: 'Demo' }
      ]
    };
    
    const metadataUrl = await ipfsService.uploadMetadata(testMetadata);
    console.log('✅ Metadata upload successful:', metadataUrl);
    
    // Test 3: Upload NFT hoàn chỉnh
    console.log('\n📤 Testing complete NFT upload...');
    const nftResult = await ipfsService.uploadNFT(
        'Test NFT',
        testFile,
        testMetadata
    );
    console.log('✅ Complete NFT upload successful:');
    console.log('   - Image URL:', nftResult.imageUrl);
    console.log('   - Metadata URL:', nftResult.metadataUrl);
    console.log('   - Metadata CID:', nftResult.metadataCid);
    
    console.log('\n🎉 All tests passed successfully!');
    return { success: true, results: { imageUrl, metadataUrl, nftResult } };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};


console.log("Hello World");
const result = await testIPFSUpload();
console.log(result);