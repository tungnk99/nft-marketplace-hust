require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");

const dotenv = require("dotenv");
dotenv.config();

// Ensure your configuration variables are set before executing the script
const { vars } = require("hardhat/config");

const INFURA_API_KEY = process.env.INFURA_API_KEY || vars.get("INFURA_API_KEY");
const SEPOLIA_PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY || vars.get("SEPOLIA_PRIVATE_KEY");
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || vars.get("ETHERSCAN_API_KEY");

module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [SEPOLIA_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};