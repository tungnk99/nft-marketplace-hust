const fs = require("fs");
const path = require("path");
const { ethers, run, network } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("📦 Deploying contracts...");

  const Marketplace = await ethers.getContractFactory(process.env.NFT_MARKETPLACE_CONTRACT_NAME || "NFTMarketplacev2");
  const market = await Marketplace.deploy();
  const marketResponse = await market.waitForDeployment();
  const marketplaceAddress = await marketResponse.getAddress();
  console.log("✅ NFTMarketplace contract deployed to:", marketplaceAddress);

  const NFT = await ethers.getContractFactory(process.env.NFT_CONTRACT_NAME || "NFTv2");
  const nft = await NFT.deploy(marketplaceAddress);
  const nftResponse = await nft.waitForDeployment();
  const nftAddress = await nftResponse.getAddress();
  console.log("✅ NFT contract deployed to:", nftAddress);

  if (network.name === "sepolia") {
    console.log("⏳ Waiting for Etherscan to index...");
    await sleep(30000);

    await verify(nftAddress, [marketplaceAddress]);
    await verify(marketplaceAddress, []);
  }

  await saveDeployedContractInfo(nftResponse, "NFTv2");
  await saveDeployedContractInfo(marketResponse, "NFTMarketplacev2");

  console.log("✅ All contracts saved and verified.");
}

async function verify(address, args) {
  try {
    await run("verify:verify", {
      address,
      constructorArguments: args,
    });
    console.log(`🔍 Verified: ${address}`);
  } catch (e) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log(`🔁 Already verified: ${address}`);
    } else {
      console.error(`❌ Verification failed for ${address}:`, e.message);
    }
  }
}

async function saveDeployedContractInfo(contract, name) {
  const contractsDir = path.join(__dirname, "../deployed_information");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Write the address
  const addressFile = path.join(contractsDir, "contract_addresses.json");
  let addresses = {};
  if (fs.existsSync(addressFile)) {
    addresses = JSON.parse(fs.readFileSync(addressFile, "utf8"));
  }
  addresses[name] = await contract.getAddress();
  fs.writeFileSync(addressFile, JSON.stringify(addresses, null, 2));

  // Write the ABI
  const artifact = artifacts.readArtifactSync(name);
  const abiFile = path.join(contractsDir, `${name}_abi.json`);
  fs.writeFileSync(abiFile, JSON.stringify(artifact, null, 2));

  console.log(`📁 Saved ${name} address and ABI to contracts/`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(error => {
  console.error("❌ Script error:", error);
  process.exit(1);
});
