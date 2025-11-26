import 'dotenv/config';
import { ethers } from 'ethers';
import connectDB from '../lib/db';
import TransferEvent from '../models/TransferEvent';
import { TREASURY_ABI } from '../lib/web3';
import { syncTreasuryEvents } from '../lib/syncTransfers';

async function bootstrapProvider() {
  const wsUrl = process.env.QIE_WS_RPC_URL;
  const httpUrl = process.env.QIE_RPC_URL || process.env.NEXT_PUBLIC_QIE_RPC_URL;

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
  await TransferEvent.updateOne(
    { txHash: log.transactionHash },
    {
      $set: {
        sender: sender.toLowerCase(),
        recipient: recipient.toLowerCase(),
        amountQUSD: ethers.formatEther(amountQUSD),
        targetCurrency,
        blockNumber: log.blockNumber,
        timestamp: Number(timestamp),
        chainId: Number(process.env.QIE_CHAIN_ID || 1938),
        type: 'cross-border',
        status: 'pending',
      },
    },
    { upsert: true }
  );
  console.log(
    `📬 Cross-border request stored: ${sender} -> ${recipient} | ${ethers.formatEther(amountQUSD)} QUSD`
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
  await TransferEvent.updateOne(
    { txHash: log.transactionHash },
    {
      $set: {
        sender: depositor.toLowerCase(),
        recipient: null,
        amountQUSD: ethers.formatEther(amountQUSD),
        targetCurrency: null,
        blockNumber: log.blockNumber,
        timestamp,
        chainId: Number(process.env.QIE_CHAIN_ID || 1938),
        type: 'swap',
        status: 'completed',
        metadata: {
          amountQIE: ethers.formatEther(amountQIE),
        },
      },
    },
    { upsert: true }
  );
  console.log(`💱 Swap stored: ${depositor} swapped ${ethers.formatEther(amountQIE)} QIE`);
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

  contract.on(
    'CrossBorderFulfillmentRequested',
    async (sender, recipient, amountQUSD, targetCurrency, timestamp, event) => {
      await persistCrossBorder(sender, recipient, amountQUSD, targetCurrency, timestamp, event);
    }
  );

  contract.on('NativeDeposited', async (depositor, amountQIE, amountQUSD, event) => {
    await persistSwap(depositor, amountQIE, amountQUSD, event);
  });

  process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down listener...');
    provider.destroy?.();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Listener crashed:', error);
  process.exit(1);
});

