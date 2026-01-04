import hre from "hardhat";
import * as dotenv from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ethers } from "ethers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env.local") });

// Configuration
const UPDATE_INTERVAL_MS = 60000; // Update every 1 minute
const PRICE_DEVIATION_THRESHOLD = 0.01; // 1% deviation required to trigger update
const DEFAULT_PRICE = 0.05; // Fallback price if API fails ($0.05)

// API Endpoints for QIE price (replace with actual if available)
// Example: CoinGecko, XT.com, etc.
const PRICE_API_URL = process.env.QIE_PRICE_API_URL || "https://api.coingecko.com/api/v3/simple/price?ids=qie-blockchain&vs_currencies=usd";

async function fetchRealPrice(): Promise<number | null> {
  try {
    const response = await fetch(PRICE_API_URL);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    const data = await response.json();
    // Adjust based on actual API response structure
    // CoinGecko: { "qie-blockchain": { "usd": 0.045 } }
    const price = data["qie-blockchain"]?.usd; 
    
    if (typeof price === 'number') {
      return price;
    }
    
    // Fallback logic for other APIs...
    return null;
  } catch (error) {
    console.warn("⚠️  Failed to fetch from API, checking secondary sources...");
    return null;
  }
}

async function main() {
  const oracleAddress = process.env.NEXT_PUBLIC_MOCK_ORACLE_ADDRESS;
  if (!oracleAddress) {
    throw new Error("NEXT_PUBLIC_MOCK_ORACLE_ADDRESS not set in .env.local");
  }

  // Get signer
  const [signer] = await hre.ethers.getSigners();
  console.log(`🤖 Oracle Feeder Service Started`);
  console.log(`📍 Oracle Address: ${oracleAddress}`);
  console.log(`🔑 Feeder Address: ${signer.address}`);
  console.log(`⏱️  Update Interval: ${UPDATE_INTERVAL_MS / 1000}s`);

  // Connect to contract
  const oracle = await (hre as any).ethers.getContractAt("MockQieOracle", oracleAddress, signer);

  let lastPrice = 0;

  // Main Loop
  while (true) {
    try {
      let currentPrice = await fetchRealPrice();

      if (!currentPrice) {
        console.warn(`⚠️  Could not fetch real price. Using simulated movement for demo purposes.`);
        // Simulation fallback (Random Walk)
        const fluctuation = (Math.random() * 0.05) - 0.025; // +/- 2.5%
        currentPrice = (lastPrice || DEFAULT_PRICE) * (1 + fluctuation);
      }

      console.log(`\n📉 Market Price: $${currentPrice.toFixed(6)}`);

      // Check on-chain price
      const onChainPriceWei = await oracle.getPrice();
      const onChainPrice = parseFloat(ethers.formatUnits(onChainPriceWei, 18));
      
      console.log(`🔗 On-Chain Price: $${onChainPrice.toFixed(6)}`);

      const deviation = Math.abs((currentPrice - onChainPrice) / onChainPrice);
      
      if (deviation > PRICE_DEVIATION_THRESHOLD || lastPrice === 0) {
        console.log(`⚡ Deviation ${(deviation * 100).toFixed(2)}% > ${PRICE_DEVIATION_THRESHOLD * 100}%. Updating...`);
        
        const priceWei = ethers.parseUnits(currentPrice.toFixed(6), 18);
        const tx = await oracle.setPrice(priceWei);
        console.log(`✅ Tx Sent: ${tx.hash}`);
        await tx.wait();
        console.log(`🎉 Price Updated!`);
        
        lastPrice = currentPrice;
      } else {
        console.log(`zzz Price stable (deviation ${(deviation * 100).toFixed(2)}%). Skipping update.`);
      }

    } catch (error) {
      console.error("❌ Critical Error in Feeder Loop:", error);
    }

    // Wait
    await new Promise(r => setTimeout(r, UPDATE_INTERVAL_MS));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
