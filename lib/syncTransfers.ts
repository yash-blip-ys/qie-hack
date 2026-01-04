import { ethers } from 'ethers';
import connectDB from './db';
import TransferEvent from '../models/TransferEvent';
import { TREASURY_ABI } from './web3';
import { getRpcUrl, getChainId } from '@/config';

interface SyncOptions {
  fromBlock?: number;
  toBlock?: number;
  provider?: ethers.JsonRpcProvider | ethers.WebSocketProvider;
}

const TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS || process.env.TREASURY_CONTRACT_ADDRESS;
const RPC_URL = getRpcUrl();
const START_BLOCK = process.env.CROSS_BORDER_START_BLOCK
  ? parseInt(process.env.CROSS_BORDER_START_BLOCK, 10)
  : undefined;

async function probeRpc(url: string, expectedChainId: number): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const hex = data?.result;
    if (typeof hex !== 'string') return false;
    const got = Number.parseInt(hex, 16);
    return got === expectedChainId;
  } catch {
    return false;
  }
}

function getProvider(existing?: ethers.JsonRpcProvider | ethers.WebSocketProvider) {
  if (existing) return existing;
  if (!RPC_URL) {
    throw new Error('QIE RPC URL is not configured. Please set it via config.json or .env.');
  }
  const chainId = getChainId();
  return new ethers.JsonRpcProvider(RPC_URL, chainId);
}

export async function syncTreasuryEvents(options: SyncOptions = {}) {
  if (!TREASURY_ADDRESS) {
    throw new Error('Treasury contract address missing. Set NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS.');
  }

  await connectDB();

  const chainId = getChainId();
  const healthy = await probeRpc(RPC_URL, chainId);
  if (!healthy) {
    return { synced: 0, fromBlock: options.fromBlock ?? 0, toBlock: options.toBlock ?? 0, error: 'rpc_unreachable' };
  }

  const provider = getProvider(options.provider);
  const treasuryContract = new ethers.Contract(TREASURY_ADDRESS, TREASURY_ABI, provider);
  const latestBlock = options.toBlock ?? (await provider.getBlockNumber());

  let fromBlock = options.fromBlock;
  if (fromBlock === undefined) {
    const lastEvent = await TransferEvent.findOne().sort({ blockNumber: -1 }).lean();
    if (lastEvent) {
      fromBlock = lastEvent.blockNumber + 1;
    } else if (START_BLOCK !== undefined) {
      fromBlock = START_BLOCK;
    } else {
      fromBlock = Math.max(0, latestBlock - 5_000);
    }
  }

  if (fromBlock > latestBlock) {
    return { synced: 0, fromBlock, toBlock: latestBlock };
  }

  const crossBorderFilter = treasuryContract.filters.CrossBorderFulfillmentRequested();
  const swapFilter = treasuryContract.filters.NativeDeposited();

  const [crossBorderEvents, swapEvents] = await Promise.all([
    treasuryContract.queryFilter(crossBorderFilter, fromBlock, latestBlock),
    treasuryContract.queryFilter(swapFilter, fromBlock, latestBlock),
  ]);

  const blockTimestampCache = new Map<number, number>();
  const getTimestamp = async (blockNumber: number) => {
    if (blockTimestampCache.has(blockNumber)) {
      return blockTimestampCache.get(blockNumber)!;
    }
    const block = await provider.getBlock(blockNumber);
    const ts = block?.timestamp ?? Math.floor(Date.now() / 1000);
    blockTimestampCache.set(blockNumber, ts);
    return ts;
  };

  const operations = [];

  for (const event of crossBorderEvents) {
    const e: any = event as any;
    if (!e.args) continue;
    const [sender, recipient, amountQUSD, targetCurrency, timestamp] = e.args;
    operations.push({
      updateOne: {
        filter: { txHash: event.transactionHash },
        update: {
          $set: {
            sender: sender.toLowerCase(),
            recipient: recipient.toLowerCase(),
            amountQUSD: ethers.formatEther(amountQUSD),
            targetCurrency,
            blockNumber: event.blockNumber,
            timestamp: Number(timestamp) || (await getTimestamp(event.blockNumber)),
            chainId,
            type: 'cross-border',
            status: 'pending',
          },
        },
        upsert: true,
      },
    });
  }

  for (const event of swapEvents) {
    const e: any = event as any;
    if (!e.args) continue;
    const [depositor, amountQIE, amountQUSD] = e.args;
    operations.push({
      updateOne: {
        filter: { txHash: event.transactionHash },
        update: {
          $set: {
            sender: depositor.toLowerCase(),
            recipient: null,
            amountQUSD: ethers.formatEther(amountQUSD),
            targetCurrency: null,
            blockNumber: event.blockNumber,
            timestamp: await getTimestamp(event.blockNumber),
            chainId,
            type: 'swap',
            status: 'completed',
            metadata: {
              amountQIE: ethers.formatEther(amountQIE),
            },
          },
        },
        upsert: true,
      },
    });
  }

  if (operations.length > 0) {
    await TransferEvent.bulkWrite(operations, { ordered: false });
  }

  return {
    synced: operations.length,
    fromBlock,
    toBlock: latestBlock,
    crossBorderFound: crossBorderEvents.length,
    swapsFound: swapEvents.length,
  };
}

