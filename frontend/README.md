# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/5a193336-55c3-4c44-bbda-9d11a239c5a1

## NFT Marketplace Architecture

This is a React-based NFT marketplace that uses a service-oriented architecture for data management:

### Data Services

- **NFTDataService**: Central service for managing NFT data operations
  - Loads NFT data from mock JSON files
  - Saves new NFTs to persistent storage
  - Updates NFT properties (listing, delisting, buying)
  - Provides caching for performance

- **IPFSMetadataService**: Handles metadata fetching from IPFS
  - Fetches NFT metadata (name, description, image, category) from IPFS using CIDs
  - Multiple gateway fallbacks for reliability
  - Caches metadata to reduce API calls

- **MockMetadataService**: Provides fallback metadata for mock NFTs
  - Ensures metadata is always available for display
  - Used when IPFS metadata is not accessible

### Data Flow

1. **Loading**: NFT data is loaded from `public/mock-nfts.json` via NFTDataService
2. **Metadata**: NFT metadata is fetched from IPFS using the CID field
3. **Operations**: All NFT operations (mint, buy, list, delist) are handled through the service layer
4. **Persistence**: Changes are saved back to the mock JSON file

### Key Features

- **Service Layer**: All data operations go through dedicated services
- **Async Operations**: All NFT operations are async with proper error handling
- **Metadata Caching**: IPFS metadata is cached to improve performance
- **Fallback Support**: Mock metadata service ensures UI always has data to display

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/5a193336-55c3-4c44-bbda-9d11a239c5a1) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/5a193336-55c3-4c44-bbda-9d11a239c5a1) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
