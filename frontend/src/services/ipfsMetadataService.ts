export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  category: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export class IPFSMetadataService {
  private static readonly IPFS_GATEWAYS = [
    'https://ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
  ];

  /**
   * Fetch NFT metadata from IPFS using CID with multiple gateway fallbacks
   */
  static async fetchMetadata(cid: string): Promise<NFTMetadata> {
    let lastError: Error | null = null;

    for (const gateway of this.IPFS_GATEWAYS) {
      try {
        const url = `${gateway}${cid}`;
          
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          },
        });
        console.log(`IPFS cid ${cid} response status: ${response.status}`);
        if (!response.ok) {
          throw new Error(`Gateway ${gateway} failed: ${response.statusText}`);
        }

        const metadata: NFTMetadata = await response.json();
        console.log(`IPFS cid ${cid} raw metadata:`, metadata);
        console.log(`IPFS cid ${cid} has name: ${!!metadata.name}, description: ${!!metadata.description}, image: ${!!metadata.image}, category: ${!!metadata.category}`);
        
        // Validate required fields
        if (!metadata.name || !metadata.description || !metadata.image) {
          throw new Error('Invalid metadata: missing required fields (name, description, image)');
        }

        // If category is missing, try to extract from attributes
        if (!metadata.category && metadata.attributes) {
          const categoryAttr = metadata.attributes.find(attr => 
            attr.trait_type.toLowerCase() === 'category'
          );
          if (categoryAttr) {
            metadata.category = categoryAttr.value.toString();
          } else {
            metadata.category = 'Unknown';
          }
        } else if (!metadata.category) {
          metadata.category = 'Unknown';
        }

        console.log(`IPFS cid ${cid} processed metadata:`, metadata);
        console.log(`Successfully fetched metadata from ${gateway}`);
        return metadata;
      } catch (error) {
        console.warn(`Failed to fetch from ${gateway}:`, error);
        lastError = error as Error;
        continue; // Try next gateway
      }
    }

    // If all gateways fail, return fallback metadata
    console.error('All IPFS gateways failed, using fallback metadata:', lastError);
    return this.getFallbackMetadata(cid);
  }

  /**
   * Fetch multiple NFT metadata in parallel
   */
  static async fetchMultipleMetadata(cids: string[]): Promise<Map<string, NFTMetadata>> {
    const metadataMap = new Map<string, NFTMetadata>();
    
    try {
      const promises = cids.map(async (cid) => {
        try {
          const metadata = await this.fetchMetadata(cid);
          metadataMap.set(cid, metadata);
        } catch (error) {
          console.error(`Failed to fetch metadata for CID ${cid}:`, error);
          // Return fallback metadata for failed requests
          metadataMap.set(cid, this.getFallbackMetadata(cid));
        }
      });

      await Promise.all(promises);
      return metadataMap;
    } catch (error) {
      console.error('Error fetching multiple metadata:', error);
      throw error;
    }
  }

  /**
   * Get fallback metadata when IPFS fetch fails
   */
  private static getFallbackMetadata(cid: string): NFTMetadata {
    return {
      name: `NFT ${cid.slice(0, 8)}...`,
      description: 'Metadata temporarily unavailable. Please try again later.',
      image: '/placeholder.svg',
      category: 'Unknown',
      attributes: [
        {
          trait_type: 'Status',
          value: 'Metadata Unavailable'
        }
      ]
    };
  }

  /**
   * Get IPFS gateway URL for a CID
   */
  static getIPFSURL(cid: string): string {
    const gateway = this.IPFS_GATEWAYS[0];
    return `${gateway}${cid}`;
  }
} 