# QieRemit - Borderless Financial App

A Web3 full-stack application built for the Qie blockchain hackathon. QieRemit enables borderless financial transfers using the QUSD stablecoin.

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS with glassmorphism effects
- **Icons**: Lucide React
- **Database**: MongoDB with Mongoose
- **Blockchain**: Ethers.js v6
- **Smart Contracts**: Solidity ^0.8.20

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- MetaMask or compatible Web3 wallet
- MongoDB Atlas account (or local MongoDB)
- Hardhat (for contract deployment)

## 🔧 Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_WALLET_CONNECT_ID=<placeholder>
MONGODB_URI=<your_mongodb_connection_string>
NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS=<qusd_contract_address>
NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS=<treasury_contract_address>
PRIVATE_KEY=<your_wallet_private_key_for_deployment_OPTIONAL>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Deploy Smart Contracts

The contracts are located in the `/contracts` folder:

- `QUSD.sol` - ERC20 stablecoin token
- `QieTreasury.sol` - Core treasury contract for swaps and transfers

**Deployment Steps:**

1. Set up Hardhat (if not already done):
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

2. Install OpenZeppelin contracts:
```bash
npm install @openzeppelin/contracts
```

3. Deploy contracts in this order:
   - First deploy `QUSD.sol` (owner should be your deployer address)
   - Then deploy `QieTreasury.sol` (pass QUSD contract address and owner)

4. Update `.env.local` with the deployed contract addresses

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 Features

### Landing Page
- Modern, high-converting landing page
- "Launch App" button that connects wallet and redirects to dashboard

### Dashboard
- **Wallet Connection**: Connect MetaMask/Web3 wallet
- **Balance Display**: Shows native QIE and QUSD balances
- **KYC Verification**: Simulated KYC check that saves to MongoDB
- **Swap QIE for QUSD**: Deposit native QIE and receive QUSD tokens
- **Send Globally**: Execute cross-border transfers with target currency selection
- **Paginated Ledger**: Server-side transaction history sourced from on-chain events
- **Data Rights Controls**: Export/delete off-chain profile data instantly

## 📁 Project Structure

```
qiehack/
├── contracts/              # Solidity smart contracts
│   ├── QUSD.sol
│   └── QieTreasury.sol
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── db/connect/    # MongoDB connection helper
│   │   └── user/          # User KYC endpoints
│   ├── dashboard/         # Main dashboard page
│   ├── layout.tsx          # Root layout with providers
│   └── page.tsx            # Landing page
├── contexts/              # React contexts
│   └── Web3Provider.tsx    # Web3 wallet integration
├── lib/                   # Utilities
│   ├── mongodb.ts         # MongoDB connection
│   └── web3.ts            # Web3 helpers
└── package.json
```

## 🔐 Smart Contract Details

### QUSD.sol
- Standard ERC20 token
- Mintable/burnable by owner (Treasury contract)
- Name: "Qie Stable USD", Symbol: "QUSD"

### QieTreasury.sol
- `depositNativeForStable()`: Swap native QIE for QUSD (1:1 rate)
- `executeCrossBorderTransfer()`: Burn QUSD and emit event for off-chain processing
- Owner can withdraw native QIE

## 🛰️ Cross-Border Event Listener

Run the lightweight relayer to mirror on-chain `CrossBorderFulfillmentRequested` and `NativeDeposited`
events into MongoDB for compliance, dashboards, and off-chain fulfillment queues.

1. Configure the following in `.env.local` (or your shell):
   ```
   QIE_RPC_URL=https://rpc-main1.qie.org
   # Optional websocket endpoint for realtime updates
   QIE_WS_RPC_URL=wss://rpc-main1.qie.org/ws
   NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS=<treasury_address>
   ```
2. Run the listener:
   ```bash
   npm run listener
   ```
3. The script performs a historical sync, then listens for new events, persisting them in the
   `TransferEvent` collection with live status updates.

Use the `/api/transfers` endpoint (GET with `address`, `page`, `limit`) to power dashboards or audit tools.
Trigger a manual sync by `POST`ing to the same route (optionally pass `fromBlock`/`toBlock`).

## 🎨 UI/UX Features

- Dark fintech theme (slate-950 background)
- Blue/cyan gradient accents
- Glassmorphism effects
- Responsive design
- Toast notifications for user feedback
- Loading states for all async operations

## 🚨 Important Notes

- Contract addresses must be set in `.env.local` before using swap/send features
- MongoDB connection is cached to prevent cold start issues
- KYC is simulated for hackathon purposes
- Cross-border transfers emit events that would be processed by an off-chain oracle in production

## 📝 License

Built for Qie Hackathon 2024

