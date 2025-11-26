# Smart Contract Deployment Guide

## Prerequisites

1. Install Hardhat and dependencies:
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
```

2. Set up your `.env.local` with:
   - `PRIVATE_KEY` - Your wallet private key for deployment
   - Network RPC URL (add to `hardhat.config.js`)

## Deployment Steps

### Step 1: Deploy QUSD Contract

Create a deployment script `scripts/deploy-qusd.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying QUSD with account:", deployer.address);

  const QUSD = await hre.ethers.getContractFactory("QUSD");
  const qusd = await QUSD.deploy(deployer.address); // Owner is deployer

  await qusd.waitForDeployment();
  const address = await qusd.getAddress();
  
  console.log("QUSD deployed to:", address);
  console.log("Update NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS in .env.local");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Run: `npx hardhat run scripts/deploy-qusd.js --network qie`

### Step 2: Deploy QieTreasury Contract

Create a deployment script `scripts/deploy-treasury.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const QUSD_ADDRESS = process.env.NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS;
  
  if (!QUSD_ADDRESS) {
    throw new Error("QUSD contract address not set in .env.local");
  }

  console.log("Deploying QieTreasury with account:", deployer.address);
  console.log("QUSD address:", QUSD_ADDRESS);

  const QieTreasury = await hre.ethers.getContractFactory("QieTreasury");
  const treasury = await QieTreasury.deploy(QUSD_ADDRESS, deployer.address);

  await treasury.waitForDeployment();
  const address = await treasury.getAddress();
  
  console.log("QieTreasury deployed to:", address);
  console.log("Update NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS in .env.local");
  
  // Transfer QUSD ownership to Treasury
  console.log("Transferring QUSD ownership to Treasury...");
  const QUSD = await hre.ethers.getContractAt("QUSD", QUSD_ADDRESS);
  await QUSD.transferOwnership(address);
  console.log("Ownership transferred!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Run: `npx hardhat run scripts/deploy-treasury.js --network qie`

### Step 3: Update Environment Variables

After deployment, update your `.env.local`:
```
NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS=<deployed_qusd_address>
NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS=<deployed_treasury_address>
```

## Verification

1. Check contract addresses on block explorer
2. Verify QUSD ownership was transferred to Treasury
3. Test depositNativeForStable() with a small amount
4. Test executeCrossBorderTransfer() with a small amount

## Important Notes

- **Security**: Never commit `.env.local` or private keys to version control
- **Gas**: Ensure your deployer wallet has enough native QIE for gas fees
- **Ownership**: Treasury contract must own QUSD to mint/burn tokens
- **Testing**: Test on testnet before mainnet deployment

