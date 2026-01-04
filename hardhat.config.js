import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, ".env.local") });

const configPath = resolve(__dirname, "./config/config.json");
const configJson = JSON.parse(readFileSync(configPath, "utf-8"));
const selectedNetwork = process.env.DEFAULT_NETWORK || configJson.defaultNetwork;
const networkConfig =
  configJson.networks[selectedNetwork] ??
  configJson.networks[configJson.defaultNetwork];
const qieRpcUrl = process.env.QIE_RPC_URL || networkConfig.rpcUrl;
const qieChainId = Number(process.env.QIE_CHAIN_ID || networkConfig.chainId || 1337);
const qieGasLimit = Number(process.env.QIE_GAS_LIMIT || networkConfig.gasLimit || 1000000);

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  defaultNetwork: selectedNetwork,
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    qie: {
      url: qieRpcUrl,
      chainId: qieChainId,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: qieGasLimit,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
