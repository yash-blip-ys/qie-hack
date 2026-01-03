import hre from 'hardhat';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const configPath = resolve(__dirname, '../config/config.json');
const configJson = JSON.parse(readFileSync(configPath, 'utf-8'));
const selectedNetwork = process.env.DEFAULT_NETWORK || configJson.defaultNetwork;
const networkConfig =
  configJson.networks[selectedNetwork] ?? configJson.networks[configJson.defaultNetwork];

const DEFAULT_DECIMALS = 18;

async function main() {
  const oracleAddress =
    process.env.NEXT_PUBLIC_MOCK_ORACLE_ADDRESS || process.env.MOCK_ORACLE_ADDRESS;
  if (!oracleAddress) {
    throw new Error('Please set NEXT_PUBLIC_MOCK_ORACLE_ADDRESS or MOCK_ORACLE_ADDRESS in your .env.local');
  }

  const priceArg = process.argv[2] || process.env.MOCK_ORACLE_PRICE;
  if (!priceArg) {
    throw new Error('Please pass the price you want to set (e.g., npm run mock:oracle 1.05)');
  }

  const decimals = Number(process.env.MOCK_ORACLE_DECIMALS || networkConfig?.oracleDecimals || DEFAULT_DECIMALS);
  const price = (hre as any).ethers.parseUnits(priceArg, decimals);

  const MockOracle = await (hre as any).ethers.getContractFactory('MockQieOracle');
  const oracle = MockOracle.attach(oracleAddress);
  const tx = await oracle.setPrice(price);
  await tx.wait();

  console.log(`📡 Mock oracle ${oracleAddress} updated to ${priceArg} (decimals=${decimals})`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
