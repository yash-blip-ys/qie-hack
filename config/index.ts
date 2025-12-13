/// <reference types="node" />

import config from './config.json';

type NetworkNames = keyof typeof config.networks;

export interface NetworkConfig {
  label: string;
  rpcUrl: string;
  wsRpcUrl?: string;
  explorer: string;
  chainId: number;
  gasLimit: number;
  qiedexPair?: string;
  notes?: string;
}

const DEFAULT_NETWORK = process.env.DEFAULT_NETWORK || config.defaultNetwork;

function resolveNetworkName(name?: string): NetworkNames {
  const networkName = (name || DEFAULT_NETWORK) as NetworkNames;
  if (!config.networks[networkName]) {
    throw new Error(`Unknown network ${networkName}. Available: ${Object.keys(config.networks).join(', ')}`);
  }
  return networkName;
}

export function getNetworkConfig(name?: string): NetworkConfig {
  const networkName = resolveNetworkName(name);
  return config.networks[networkName];
}

export function getRpcUrl(name?: string) {
  return process.env.QIE_RPC_URL || getNetworkConfig(name).rpcUrl;
}

export function getWsRpcUrl(name?: string) {
  return process.env.QIE_WS_RPC_URL || getNetworkConfig(name).wsRpcUrl || '';
}

export function getChainId(name?: string) {
  return Number(process.env.QIE_CHAIN_ID || getNetworkConfig(name).chainId);
}

export function getExplorerUrl(name?: string) {
  return process.env.QIE_EXPLORER_URL || getNetworkConfig(name).explorer;
}

export function getGasLimit(name?: string) {
  return Number(process.env.QIE_GAS_LIMIT || getNetworkConfig(name).gasLimit);
}

export function getQieDexPair(name?: string) {
  return process.env.QIEDX_PAIR || getNetworkConfig(name).qiedexPair;
}

export const DEFAULT_NETWORK_NAME = DEFAULT_NETWORK;
