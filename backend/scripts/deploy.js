const fs = require("fs");
const path = require("path");
const { ethers, run, network } = require("hardhat");

async function main() {
  console.log("📦 Deploying contracts...");

  const NFT = await ethers.getContractFactory("NFT");
  const nft = await NFT.deploy();
  const nftResponse = await nft.waitForDeployment();
  console.log("✅ NFT contract deployed to:", await nftResponse.getAddress());

  const Marketplace = await ethers.getContractFactory("NFTMarketplace");
  const market = await Marketplace.deploy();
  const marketResponse = await market.waitForDeployment();
  console.log("✅ NFTMarketplace contract deployed to:", await marketResponse.getAddress());

  if (network.name === "sepolia") {
    console.log("⏳ Waiting for Etherscan to index...");
    await sleep(30000);

    await verify(await nftResponse.getAddress(), []);
    await verify(await marketResponse.getAddress(), []);
  }

  await saveDeployedContractInfo(nftResponse, "NFT");
  await saveDeployedContractInfo(marketResponse, "NFTMarketplace");

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
  const contractsDir = path.join(__dirname, "../frontend/constants");

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

  console.log(`📁 Saved ${name} address and ABI to frontend/constants/`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(error => {
  console.error("❌ Script error:", error);
  process.exit(1);
});
