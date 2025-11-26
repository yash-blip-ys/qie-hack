import hre from "hardhat";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env.local") });

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("\n=== Deploying QUSD Contract ===");
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "QIE");
  
  if (balance === 0n) {
    throw new Error("Insufficient balance. Please fund your deployer account.");
  }

  console.log("\nDeploying QUSD...");
  const QUSD = await hre.ethers.getContractFactory("QUSD");
  const qusd = await QUSD.deploy(deployer.address); // Owner is deployer initially

  await qusd.waitForDeployment();
  const address = await qusd.getAddress();
  
  console.log("\n✅ QUSD deployed successfully!");
  console.log("Contract address:", address);
  console.log("\n📝 Update your .env.local file:");
  console.log(`NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS=${address}`);
  
  // Verify deployment
  const name = await qusd.name();
  const symbol = await qusd.symbol();
  const owner = await qusd.owner();
  
  console.log("\nContract details:");
  console.log("  Name:", name);
  console.log("  Symbol:", symbol);
  console.log("  Owner:", owner);
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

