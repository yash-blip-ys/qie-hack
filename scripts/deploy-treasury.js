import hre from "hardhat";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env.local") });

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("\n=== Deploying QieTreasury Contract ===");
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "QIE");
  
  if (balance === 0n) {
    throw new Error("Insufficient balance. Please fund your deployer account.");
  }

  // Get QUSD address from environment
  const QUSD_ADDRESS = process.env.NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS;
  
  if (!QUSD_ADDRESS) {
    throw new Error(
      "QUSD contract address not found in .env.local\n" +
      "Please set NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS after deploying QUSD first."
    );
  }

  console.log("QUSD contract address:", QUSD_ADDRESS);

  // Verify QUSD contract exists
  try {
    const qusdCode = await hre.ethers.provider.getCode(QUSD_ADDRESS);
    if (qusdCode === "0x") {
      throw new Error("QUSD contract not found at the provided address");
    }
    console.log("✅ QUSD contract verified");
  } catch (error) {
    throw new Error(`Failed to verify QUSD contract: ${error.message}`);
  }

  console.log("\nDeploying QieTreasury...");
  const QieTreasury = await hre.ethers.getContractFactory("QieTreasury");
  const treasury = await QieTreasury.deploy(QUSD_ADDRESS, deployer.address);

  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  
  console.log("\n✅ QieTreasury deployed successfully!");
  console.log("Contract address:", treasuryAddress);
  
  // Transfer QUSD ownership to Treasury
  console.log("\nTransferring QUSD ownership to Treasury...");
  const QUSD = await hre.ethers.getContractAt("QUSD", QUSD_ADDRESS);
  const currentOwner = await QUSD.owner();
  console.log("Current QUSD owner:", currentOwner);
  
  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log("⚠️  Warning: QUSD owner is not the deployer address");
    console.log("   You may need to transfer ownership manually");
  } else {
    const tx = await QUSD.transferOwnership(treasuryAddress);
    console.log("   Transaction hash:", tx.hash);
    await tx.wait();
    console.log("✅ Ownership transferred!");
    
    const newOwner = await QUSD.owner();
    console.log("   New QUSD owner:", newOwner);
  }
  
  console.log("\n📝 Update your .env.local file:");
  console.log(`NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS=${treasuryAddress}`);
  
  // Verify deployment
  const qusdTokenAddress = await treasury.qusdToken();
  const treasuryOwner = await treasury.owner();
  
  console.log("\nContract details:");
  console.log("  Treasury address:", treasuryAddress);
  console.log("  QUSD token address:", qusdTokenAddress);
  console.log("  Treasury owner:", treasuryOwner);
}

main()
  .then(() => {
    console.log("\n✅ Deployment script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

