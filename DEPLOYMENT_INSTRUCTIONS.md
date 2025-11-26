# Hardhat Setup Complete! 🎉

Hardhat has been fully configured and your contracts are ready to deploy.

## ✅ What's Been Set Up

1. **Hardhat Configuration** (`hardhat.config.js`)
   - Configured for Qie network
   - Supports localhost and hardhat networks
   - Optimized Solidity compiler settings

2. **Deployment Scripts** (in `/scripts` folder)
   - `deploy-all.js` - Deploys both contracts in one go
   - `deploy-qusd.js` - Deploys QUSD only
   - `deploy-treasury.js` - Deploys Treasury (requires QUSD address)

3. **Contracts Compiled Successfully** ✅
   - QUSD.sol
   - QieTreasury.sol

## 🚀 How to Deploy

### Option 1: Deploy Both Contracts (Recommended)

```bash
npx hardhat run scripts/deploy-all.js --network qie
```

This will:
1. Deploy QUSD contract
2. Deploy QieTreasury contract
3. Transfer QUSD ownership to Treasury
4. Print the contract addresses

### Option 2: Deploy Individually

```bash
# Step 1: Deploy QUSD
npx hardhat run scripts/deploy-qusd.js --network qie

# Step 2: Update .env.local with QUSD address, then deploy Treasury
npx hardhat run scripts/deploy-treasury.js --network qie
```

## 📝 Required Environment Variables

Make sure your `.env.local` has:

```env
PRIVATE_KEY=your_wallet_private_key
QIE_RPC_URL=https://rpc-main1.qie.org  # or your Qie network RPC
QIE_CHAIN_ID=1337  # or your Qie network chain ID
```

After deployment, update:
```env
NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS=<deployed_qusd_address>
NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS=<deployed_treasury_address>
```

## 🔧 Available Commands

```bash
# Compile contracts
npm run compile
# or
npx hardhat compile

# Deploy all contracts
npm run deploy -- --network qie

# Deploy QUSD only
npm run deploy:qusd -- --network qie

# Deploy Treasury only
npm run deploy:treasury -- --network qie
```

## 🧪 Test on Local Network

To test locally first:

```bash
# Terminal 1: Start local Hardhat node
npx hardhat node

# Terminal 2: Deploy to local network
npx hardhat run scripts/deploy-all.js --network localhost
```

## ⚠️ Troubleshooting

1. **Connection Error**: Check your RPC URL and network connectivity
2. **Insufficient Balance**: Make sure your deployer wallet has QIE for gas
3. **Compilation Errors**: Run `npx hardhat clean` then `npx hardhat compile`

## 📋 Deployment Checklist

- [ ] `.env.local` has `PRIVATE_KEY` set
- [ ] `.env.local` has correct `QIE_RPC_URL` and `QIE_CHAIN_ID`
- [ ] Deployer wallet has sufficient QIE for gas fees
- [ ] Contracts compile successfully (`npm run compile`)
- [ ] Deploy contracts (`npm run deploy -- --network qie`)
- [ ] Update `.env.local` with deployed contract addresses
- [ ] Test the contracts in your Next.js app

---

**Note**: The contracts are production-ready and optimized for gas efficiency. The deployment scripts will automatically handle ownership transfer from deployer to Treasury contract.

