import hre from "hardhat";
import * as dotenv from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env.local") });

async function main() {
  const oracleAddress = process.env.NEXT_PUBLIC_MOCK_ORACLE_ADDRESS;
  if (!oracleAddress) {
    throw new Error("NEXT_PUBLIC_MOCK_ORACLE_ADDRESS not set in .env.local");
  }

  console.log(`🔌 Connecting to Oracle at ${oracleAddress}...`);

  // We can use getContractAt since we are in Hardhat environment
  const oracle = await (hre as any).ethers.getContractAt("MockQieOracle", oracleAddress);
  
  console.log("✅ Connected to MockQieOracle");

  // Simulation loop
  console.log("🚀 Starting price feed simulation (Simulated Market Data)...");
  
  // Initial price: $1.00
  let currentPrice = 1.0; 
  
  while (true) {
    try {
      // Simulate random fluctuation (-5% to +5%) to make it visible
      const fluctuation = (Math.random() * 0.10) - 0.05; 
      currentPrice = currentPrice * (1 + fluctuation);
      
      // Ensure price stays in realistic bounds for demo
      if (currentPrice < 0.5) currentPrice = 0.5;
      if (currentPrice > 5.0) currentPrice = 5.0;

      // Format to 18 decimals
      const priceWei = (hre as any).ethers.parseUnits(currentPrice.toFixed(4), 18);
      
      console.log(`Updating price to $${currentPrice.toFixed(4)}...`);
      
      const tx = await oracle.setPrice(priceWei);
      console.log(`   Tx Hash: ${tx.hash}`);
      await tx.wait();
      
      console.log(`✅ Price updated on-chain!`);
    } catch (error) {
      console.error("❌ Error updating price:", error);
    }

    // Wait 15 seconds
    await new Promise(r => setTimeout(r, 15000));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
