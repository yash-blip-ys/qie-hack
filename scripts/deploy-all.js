import hre from "hardhat";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env.local") });

const configPath = resolve(__dirname, "../config/config.json");
const configJson = JSON.parse(readFileSync(configPath, "utf-8"));
const selectedNetwork = process.env.DEFAULT_NETWORK || configJson.defaultNetwork;
const networkConfig =
  configJson.networks[selectedNetwork] ?? configJson.networks[configJson.defaultNetwork];
const qieDexPairAddress =
  networkConfig?.qiedexPair || "0x0000000000000000000000000000000000000000";

async function main() {
  console.log("\n🚀 Starting full deployment process...\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "QIE\n");
  
  if (balance === 0n) {
    throw new Error("Insufficient balance. Please fund your deployer account.");
  }

  // Step 1: Deploy QUSD
  console.log("=".repeat(50));
  console.log("Step 1: Deploying QUSD");
  console.log("=".repeat(50));
  
  const QUSD = await hre.ethers.getContractFactory("QUSD");
  const qusd = await QUSD.deploy(deployer.address);
  await qusd.waitForDeployment();
  const qusdAddress = await qusd.getAddress();
  
  console.log("✅ QUSD deployed to:", qusdAddress);

  // Step 2: Deploy MockQieOracle (Moved up)
  console.log("\n" + "=".repeat(50));
  console.log("Step 2: Deploying MockQieOracle (mock FX feed)");
  console.log("=".repeat(50));
  const MockOracle = await hre.ethers.getContractFactory("MockQieOracle");
  const initialPrice = hre.ethers.parseUnits("1", 18); // 1 QIE = 1 USD
  const mockOracle = await MockOracle.deploy(initialPrice, 18);
  await mockOracle.waitForDeployment();
  const mockOracleAddress = await mockOracle.getAddress();
  console.log("✅ MockQieOracle deployed to:", mockOracleAddress);
  
  // Step 3: Deploy Treasury (Now depends on Oracle)
  console.log("\n" + "=".repeat(50));
  console.log("Step 3: Deploying QieTreasury");
  console.log("=".repeat(50));
  
  const QieTreasury = await hre.ethers.getContractFactory("QieTreasury");
  // Pass mockOracleAddress to constructor
  const treasury = await QieTreasury.deploy(qusdAddress, mockOracleAddress, deployer.address);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  
  console.log("✅ QieTreasury deployed to:", treasuryAddress);
  
  // Mint initial supply to deployer for testing before transferring ownership
  const mintAmount = hre.ethers.parseEther("1000");
  await qusd.mint(deployer.address, mintAmount);
  console.log(`✅ Minted ${hre.ethers.formatEther(mintAmount)} QUSD to deployer for testing`);

  // Step 4: Transfer QUSD ownership
  console.log("\n" + "=".repeat(50));
  console.log("Step 4: Transferring QUSD ownership to Treasury");
  console.log("=".repeat(50));
  
  const tx = await qusd.transferOwnership(treasuryAddress);
  console.log("   Transaction hash:", tx.hash);
  await tx.wait();
  console.log("✅ Ownership transferred!");
  
  // Verify
  const newOwner = await qusd.owner();
  console.log("   QUSD owner:", newOwner);

  // Step 5: Dex
  console.log("\n" + "=".repeat(50));
  console.log("Step 5: Simulating QIEDEX testnet swap");
  console.log("=".repeat(50));
  const MockQieDex = await hre.ethers.getContractFactory("MockQieDex");
  const mockDex = await MockQieDex.deploy(qusdAddress);
  await mockDex.waitForDeployment();
  const mockDexAddress = await mockDex.getAddress();
  console.log("✅ MockQieDex deployed to:", mockDexAddress);

  const swapAmount = hre.ethers.parseEther("0.1");
  await qusd.approve(mockDexAddress, swapAmount);
  const swapTx = await mockDex.simulateSwap(deployer.address, swapAmount);
  await swapTx.wait();
  console.log(
    `✅ Simulated QIEDEX swap: ${hre.ethers.formatEther(swapAmount)} QUSD forwarded via mock pair`
  );
  
  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📋 Deployment Summary");
  console.log("=".repeat(50));
  console.log("QUSD Contract:", qusdAddress);
  console.log("Treasury Contract:", treasuryAddress);
  console.log("Mock Oracle:", mockOracleAddress);
  console.log("Mock QIEDex:", mockDexAddress);
  console.log("\n📝 Add these to your .env.local file:");
  console.log(`NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS=${qusdAddress}`);
  console.log(`NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS=${treasuryAddress}`);
  console.log(`NEXT_PUBLIC_MOCK_ORACLE_ADDRESS=${mockOracleAddress}`);
  console.log(`QIEDX_PAIR=${mockDexAddress}`);
  console.log("\n✅ All contracts deployed successfully!");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
