import 'dotenv/config';
import { ethers } from 'ethers';
import connectDB, {
  enqueueTransferEvent,
  dequeueTransferEvent,
  getRedisClient,
  RedisQueuePayload,
} from '../lib/db';
import TransferEvent from '../models/TransferEvent';
import { TREASURY_ABI } from '../lib/web3';
import { syncTreasuryEvents } from '../lib/syncTransfers';
import { getRpcUrl, getWsRpcUrl, getChainId } from '@/config';

async function bootstrapProvider() {
  const wsUrl = getWsRpcUrl();
  const httpUrl = getRpcUrl();

  if (wsUrl) {
    console.log('🔌 Using WebSocket provider for real-time events');
    return new ethers.WebSocketProvider(wsUrl);
  }
  if (!httpUrl) {
    throw new Error('QIE_RPC_URL or QIE_WS_RPC_URL must be defined for the listener.');
  }
  console.log('🔌 Using HTTP provider with polling for events');
  const provider = new ethers.JsonRpcProvider(httpUrl);
  provider.pollingInterval = 10_000;
  return provider;
}

async function persistCrossBorder(
  sender: string,
  recipient: string,
  amountQUSD: bigint,
  targetCurrency: string,
  timestamp: bigint,
  log: ethers.EventLog
) {
  const payload: RedisQueuePayload = {
    txHash: log.transactionHash,
    type: 'cross-border',
    sender: sender.toLowerCase(),
    recipient: recipient.toLowerCase(),
    amountQUSD: ethers.formatEther(amountQUSD),
    targetCurrency,
    blockNumber: log.blockNumber,
    timestamp: Number(timestamp) || Math.floor(Date.now() / 1000),
    chainId: getChainId(),
    metadata: {},
  };

  await enqueueTransferEvent(payload);
  console.log(
    `📬 Cross-border request queued: ${sender} -> ${recipient} | ${ethers.formatEther(amountQUSD)} QUSD`
  );
}

async function persistSwap(
  depositor: string,
  amountQIE: bigint,
  amountQUSD: bigint,
  log: ethers.EventLog
) {
  const provider = log.runner?.provider || log.provider;
  let timestamp = Math.floor(Date.now() / 1000);
  if (provider && 'getBlock' in provider) {
    const block = await provider.getBlock(log.blockNumber);
    timestamp = block?.timestamp ?? timestamp;
  }
  const payload: RedisQueuePayload = {
    txHash: log.transactionHash,
    type: 'swap',
    sender: depositor.toLowerCase(),
    recipient: null,
    amountQUSD: ethers.formatEther(amountQUSD),
    targetCurrency: null,
    blockNumber: log.blockNumber,
    timestamp,
    chainId: getChainId(),
    metadata: {
      amountQIE: ethers.formatEther(amountQIE),
    },
  };

  await enqueueTransferEvent(payload);
  console.log(`💱 Swap queued: ${depositor} swapped ${ethers.formatEther(amountQIE)} QIE`);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function persistQueuedEvent(payload: RedisQueuePayload) {
  await connectDB();
  const status = payload.type === 'swap' ? 'completed' : 'pending';
  await TransferEvent.updateOne(
    { txHash: payload.txHash },
    {
      $set: {
        sender: payload.sender,
        recipient: payload.recipient,
        amountQUSD: payload.amountQUSD,
        targetCurrency: payload.targetCurrency,
        blockNumber: payload.blockNumber,
        timestamp: payload.timestamp,
        chainId: payload.chainId,
        type: payload.type,
        status,
        metadata: payload.metadata,
      },
    },
    { upsert: true }
  );
  console.log(`🧾 Queue processed: ${payload.type} @ ${payload.txHash}`);
}

async function startQueueProcessor() {
  console.log('▶️ Starting Redis queue processor');
  while (true) {
    try {
      const payload = await dequeueTransferEvent(5);
      if (!payload) {
        continue;
      }
      await persistQueuedEvent(payload);
    } catch (error: any) {
      console.error('Queue processor error:', error);
      await wait(2000);
    }
  }
}

async function main() {
  await connectDB();
  const treasuryAddress =
    process.env.NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS || process.env.TREASURY_CONTRACT_ADDRESS;

  if (!treasuryAddress) {
    throw new Error('Treasury contract address missing. Set NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS.');
  }

  const provider = await bootstrapProvider();
  const contract = new ethers.Contract(treasuryAddress, TREASURY_ABI, provider);

  console.log('⏱️  Performing historical sync before listening...');
  await syncTreasuryEvents({ provider: provider });
  console.log('✅ Historical sync complete. Listening for new events...\n');

  void startQueueProcessor();

  contract.on(
    'CrossBorderFulfillmentRequested',
    async (sender, recipient, amountQUSD, targetCurrency, timestamp, event) => {
      await persistCrossBorder(sender, recipient, amountQUSD, targetCurrency, timestamp, event);
    }
  );

  contract.on('NativeDeposited', async (depositor, amountQIE, amountQUSD, event) => {
    await persistSwap(depositor, amountQIE, amountQUSD, event);
  });

  const redisClient = getRedisClient();
  process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down listener...');
    provider.destroy?.();
    redisClient.disconnect();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Listener crashed:', error);
  process.exit(1);
});

