import React, { useState } from 'react';
import { useNFT } from '../contexts/NFTContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from '@/hooks/use-toast';
import { Upload, Palette, Image as ImageIcon } from 'lucide-react';

interface MintNFTFormProps {
  onMintSuccess?: (nftId: string) => void;
}

const MintNFTForm: React.FC<MintNFTFormProps> = ({ onMintSuccess }) => {
  const { mintNFT, userAddress } = useNFT();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    category: 'Art',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPEG, PNG, GIF, or WebP image.",
          variant: "destructive",
        });
        return;
      }

      setUploadedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImagePreview(result);
        setFormData(prev => ({ ...prev, image: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !uploadedFile) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields and upload an image before minting.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      toast({
        title: "Uploading to IPFS...",
        description: "Please wait while we upload your NFT to IPFS.",
      });

      // Upload to Pinata directly from frontend
      const result = await uploadToIPFS(uploadedFile, {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        attributes: [{ trait_type: "Category", value: formData.category }],
        creator: userAddress
      });

      // Add to local NFT collection and get the new NFT ID
      const newNFTId = await mintNFT(result.NFTCid);
      
      // Reset form
      setFormData({ name: '', description: '', image: '', category: 'Art' });
      setImagePreview('');
      setUploadedFile(null);
      
      // Call success callback with the new NFT ID
      if (onMintSuccess) {
        onMintSuccess(newNFTId);
      }

    } catch (error: any) {
      console.error('Mint error:', error);
      toast({
        title: "Mint Failed",
        description: error.message || "Failed to mint NFT. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to upload to Pinata directly
  const uploadToIPFS = async (file: File, metadata: any) => {
    const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
    
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT not configured. Please add VITE_PINATA_JWT to your environment variables.');
    }

    try {
      // Step 1: Upload image file with pinataMetadata
      const formData = new FormData();
      formData.append('file', file);
      
      // Add pinataMetadata for better organization
      const pinataMetadata = JSON.stringify({
        name: `${metadata.name}-image`,
        keyvalues: {
          type: 'nft-image',
          category: metadata.attributes?.[0]?.value || 'Unknown'
        }
      });
      formData.append('pinataMetadata', pinataMetadata);

      const imageRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`
        },
        body: formData
      });

      if (!imageRes.ok) {
        throw new Error(`Failed to upload image: ${imageRes.statusText}`);
      }

      const imageData = await imageRes.json();
      const imageUrl = `https://gateway.pinata.cloud/ipfs/${imageData.IpfsHash}`;

      // Step 2: Upload metadata with image URL and pinataMetadata
      const metadataWithImage = { 
        ...metadata, 
        image: imageUrl,
        creator: metadata.creator
      };

      const metadataPayload = {
        pinataMetadata: {
          name: `${metadata.name}-metadata`,
          keyvalues: {
            type: 'nft-metadata',
            category: metadata.attributes?.[0]?.value || 'Unknown'
          }
        },
        pinataContent: metadataWithImage
      };

      const metadataRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PINATA_JWT}`
        },
        body: JSON.stringify(metadataPayload)
      });

      if (!metadataRes.ok) {
        throw new Error(`Failed to upload metadata: ${metadataRes.statusText}`);
      }

      const metadataData = await metadataRes.json();

      return {
        NFTCid: metadataData.IpfsHash,
        imageUrl
      };

    } catch (error) {
      console.error('Upload to IPFS error:', error);
      throw new Error(`Failed to upload to IPFS: ${error.message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Palette className="w-5 h-5" />
          <span>Create New NFT</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              NFT Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter NFT name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your NFT"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Art">Art</option>
              <option value="Music">Music</option>
              <option value="Game">Game</option>
              <option value="Collectibles">Collectibles</option>
              <option value="Photography">Photography</option>
            </select>
          </div>

          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image *
            </label>
            
            {/* File Upload */}
            <div className="mb-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600 hover:text-blue-500">
                      Click to upload
                    </span> or drag and drop
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, GIF, WebP up to 10MB
                  </p>
                </div>
              </label>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* File info */}
            {uploadedFile && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">{uploadedFile.name}</p>
                    <p className="text-blue-700">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUploadedFile(null);
                      setImagePreview('');
                      setFormData(prev => ({ ...prev, image: '' }));
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>

          {imagePreview && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
              <div className="border border-gray-300 rounded-lg overflow-hidden max-w-xs">
                <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Uploading to IPFS...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Mint NFT</span>
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default MintNFTForm;
