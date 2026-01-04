import hre from "hardhat";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { readFileSync, writeFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env.local") });

const configPath = resolve(__dirname, "../config/config.json");
const configJson = JSON.parse(readFileSync(configPath, "utf-8"));
const selectedNetwork = process.env.DEFAULT_NETWORK || configJson.defaultNetwork;

async function main() {
  console.log(`\n🚀 Starting Deployment to Network: ${hre.network.name.toUpperCase()}\n`);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "QIE\n");
  
  if (balance === 0n) {
    throw new Error("❌ Insufficient balance. Please fund your deployer account.");
  }

  // --- Step 1: Deploy QUSD ---
  console.log("Step 1: Deploying QUSD...");
  const QUSD = await hre.ethers.getContractFactory("QUSD");
  const qusd = await QUSD.deploy(deployer.address);
  await qusd.waitForDeployment();
  const qusdAddress = await qusd.getAddress();
  console.log("✅ QUSD deployed:", qusdAddress);

  // --- Step 2: Deploy Oracle (Real Infrastructure) ---
  console.log("\nStep 2: Deploying Qie Oracle...");
  const MockOracle = await hre.ethers.getContractFactory("MockQieOracle");
  // Start with $0.05 assumption if mainnet, or $1 if testnet
  const initialPrice = hre.ethers.parseUnits("0.05", 18); 
  const mockOracle = await MockOracle.deploy(initialPrice, 18);
  await mockOracle.waitForDeployment();
  const mockOracleAddress = await mockOracle.getAddress();
  console.log("✅ Qie Oracle deployed:", mockOracleAddress);
  
  // --- Step 3: Deploy Treasury ---
  console.log("\nStep 3: Deploying Treasury...");
  const QieTreasury = await hre.ethers.getContractFactory("QieTreasury");
  const treasury = await QieTreasury.deploy(qusdAddress, mockOracleAddress, deployer.address);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("✅ Treasury deployed:", treasuryAddress);
  
  // --- Step 4: Setup Ownership & Permissions ---
  console.log("\nStep 4: Configuring Ownership...");
  const tx = await qusd.transferOwnership(treasuryAddress);
  await tx.wait();
  console.log("✅ QUSD ownership transferred to Treasury");

  // --- Summary ---
  console.log("\n" + "=".repeat(50));
  console.log("🎉 DEPLOYMENT COMPLETE");
  console.log("=".repeat(50));
  console.log(`Network:   ${hre.network.name}`);
  console.log(`QUSD:      ${qusdAddress}`);
  console.log(`Oracle:    ${mockOracleAddress}`);
  console.log(`Treasury:  ${treasuryAddress}`);
  console.log("=".repeat(50));

  // Save to .env.local automatically if user wants, or just log instructions
  console.log("\n⚠️  ACTION REQUIRED: Update your .env.local file with these new addresses:");
  console.log(`NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS=${qusdAddress}`);
  console.log(`NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS=${treasuryAddress}`);
  console.log(`NEXT_PUBLIC_MOCK_ORACLE_ADDRESS=${mockOracleAddress}`);
  console.log("\nThen restart your backend/frontend services.");

  // Write to a deployment file for easy access
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    contracts: {
      QUSD: qusdAddress,
      Oracle: mockOracleAddress,
      Treasury: treasuryAddress
    }
  };
  
  writeFileSync(
    resolve(__dirname, `../deployment-${hre.network.name}.json`), 
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\n📄 Deployment info saved to deployment-${hre.network.name}.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
