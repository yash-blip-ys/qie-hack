import { ethers } from 'ethers';

// Contract ABIs (simplified for hackathon - in production, import from artifacts)
export const QUSD_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

export const TREASURY_ABI = [
  "function depositNativeForStable() payable",
  "function executeCrossBorderTransfer(address recipient, uint256 amountQUSD, string targetCurrency)",
  "function qusdToken() view returns (address)",
  "event CrossBorderFulfillmentRequested(address indexed sender, address indexed recipient, uint256 amountQUSD, string targetCurrency, uint256 timestamp)",
  "event NativeDeposited(address indexed depositor, uint256 amountQIE, uint256 amountQUSD)",
];

export const ORACLE_ABI = [
  "function getPrice() view returns (int256)",
  "function setPrice(uint256 newPrice)",
  "event PriceUpdated(int256 indexed newPrice, uint256 timestamp)"
];

export function getProvider() {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
}

export function getContract(address: string, abi: any, signer: ethers.Signer) {
  return new ethers.Contract(address, abi, signer);
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatBalance(balance: bigint, decimals: number = 18): string {
  return ethers.formatUnits(balance, decimals);
}

export function parseAmount(amount: string, decimals: number = 18): bigint {
  return ethers.parseUnits(amount, decimals);
}

