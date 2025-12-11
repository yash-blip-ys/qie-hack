import { ethers } from 'ethers';

export const MOCK_ORACLE_ABI = [
  'function getPrice() view returns (int256)',
  'function decimals() view returns (uint8)',
];

export function formatOraclePrice(value: bigint, decimals: number = 18): number {
  return Number(ethers.formatUnits(value, decimals));
}
