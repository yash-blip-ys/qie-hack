YOUTUBE VIDEO LINK AT THE END 
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
NEXT_PUBLIC_MOCK_ORACLE_ADDRESS=<mock_oracle_contract_address>
REDIS_URL=<redis_connection_string_or_local_host>
ANOMALY_SERVICE_URL=http://localhost:4000
ADMIN_DASHBOARD_WEBHOOK_URL=<optional_admin_alert_webhook>
QIEDX_PAIR=<optional_qiedex_pair_address>
```

The application also reads `config/config.json` to determine the active network (default `qieTestnet`), RPC URLs, chain IDs, gas limits, and the placeholder `qiedexPair`. Update both `.env.local` and `config/config.json` together to switch between local, testnet, or future QIE deployments without editing individual files.

### Network & Config

`config/config.json` keeps a small catalog of supported networks and their QIE endpoints (RPC, explorer, chain ID) along with a `qiedexPair` placeholder. The scripts and UI automatically read the active network, so you can add a new entry (e.g., a staging or QIE testnet with actual pair addresses) and select it via the `DEFAULT_NETWORK` env variable.

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
- **Mock QIE Oracle + Currency Converter**: The dashboard polls `MockQieOracle` (deploy via `scripts/deploy-all.js`) and re-sizes FX rates for every currency card; update the price in one command with `npm run mock:oracle 1.05` during demos.
- **Redis-backed Queue**: The listener enqueues every cross-border swap into Redis before persisting to Mongo, so temporary Mongo outages don’t drop events.
- **QIEDEX Simulation**: `scripts/deploy-all.js` deploys `MockQieDex` and runs a representative swap to show how future QIEDEX integrations can be wired in.

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

## Anamoly Detection

- Our anomaly detection system mimics real-world fintech/Web3 risk engines by combining:
   - browser fingerprinting
   - IP reputation scoring
   - wallet behavior analysis
   - rule-based fraud heuristics
- Using
   - ✔ FingerprintJS (open-source)
   - ✔ AbuseIPDB API
   - ✔ Rule-based anomaly engine

- **API middleware**: New Next.js proxy routes under `/api/anomaly/*` forward client telemetry to `anomaly-engine`, normalize fingerprint data, and expose hooks for the dashboard (`/event`, `/alerts`, `/fingerprint`, `/webhook/status`, `/webhook/test`). The client-side helper in `lib/anomaly.ts` enriches every swap/send with fingerprint metadata, caches the verdict, and feeds the risk monitor card on the dashboard plus badges inside the transaction history list.
- **UI surface**: Each ledger entry now shows an anomaly badge, the dashboard risk monitor card displays the latest verdict, and `/dashboard/admin` summarizes queue alerts, shows verdict reasons, and lets you ping the configured webhook. A dedicated worker (`anomaly-engine/workers/alertWorker.js`, runnable via `npm run worker`) listens on Redis and posts high-risk hits to `ADMIN_DASHBOARD_WEBHOOK_URL`.

<br>

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
   The listener enqueues everything into Redis (`REDIS_URL` in `.env.local`). You can point it to a local Redis instance (e.g., `docker run -p 6379:6379 redis`) or any hosted queue to smooth over short outages.
3. The script performs a historical sync, then listens for new events, persisting them in the
   `TransferEvent` collection with live status updates.

Use the `/api/transfers` endpoint (GET with `address`, `page`, `limit`) to power dashboards or audit tools.
Trigger a manual sync by `POST`ing to the same route (optionally pass `fromBlock`/`toBlock`).
Use `npm run mock:oracle <price>` to bump the mocked FX feed and watch the Currency Converter + swap flows update instantly.

## 🧪 Mock QIE Ecosystem

- `scripts/deploy-all.js` deploys `MockQieOracle` and `MockQieDex`, prints their addresses, and even runs one mock swap so judges can see the QIEDEX flow without needing a real pair.
- `MockQieOracle` powers the UI rate badge and the converter input. Update it during a demo with `npm run mock:oracle 1.05` (or any price) and the dashboard immediately reflects the change.
- The config-driven `qiedexPair` entry behaves as an anchor for a future real QIEDEX testnet pair—replace the placeholder address in `config/config.json` with the official pair and the scripts will log/approve swaps against that contract instead of the mock.

## 🐳 Docker & Deployment

- The Next.js app and the anomaly middleware each ship with their own `Dockerfile`. The root `Dockerfile` runs a multi-stage build (`npm ci`, `npm run build`, `npm run start`), while `anomaly-engine/Dockerfile` boots the Express/Redis listener. Both containers read the same environment variables outlined above (plus `ANOMALY_SERVICE_URL` pointing at `http://anomaly-engine:4000`).
- `docker-compose.yml` ties the frontend, anomaly service, alert worker (`npm run worker`), Redis, and MongoDB together. All web traffic flows through the Next app, which uses `/api/anomaly/*` routes to talk to the middleware and shares the Redis queue URL with the worker so webhooks fire in real time.
- To launch everything locally:
   1. Add the usual `.env` entries (contracts, Mongo/Redis URLs, `ADMIN_DASHBOARD_WEBHOOK_URL`, etc.).
   2. Run `docker compose up --build` from the repo root.
   3. The Next app is available on `http://localhost:3000`, the middleware on `http://localhost:4000`, and the admin panel lives at `/dashboard/admin`.

Use `docker compose down` to stop the stack, or run `npm run worker` inside the `anomaly-engine` folder for ad-hoc webhook processing without Compose.

## 🧪 Testing & Validation

- Run `npx hardhat test` to cover the treasury flow plus the mock oracle sanity checks. The suite now exercises `MockQieOracle` so you can prove the mock feeds are trustworthy.
- Re-run `npm run listener` during local testing to ensure Redis-backed queue processing keeps the `TransferEvent` ledger aligned even if Mongo briefly goes offline.

## 🛠 Mainnet Configuration & Runbook

### Environment

Set the following in `.env.local`:

```
NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS=<QUSD address>
NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS=<Treasury address>
QIE_RPC_URL=https://rpc1mainnet.qie.digital
QIE_CHAIN_ID=1990
QIE_EXPLORER_URL=https://mainnet.qie.digital
DEFAULT_NETWORK=qie
MONGODB_URI=<MongoDB Atlas URI>
REDIS_URL=<Upstash Redis URL>
ANOMALY_SERVICE_URL=http://localhost:4000
```

Set the following in `.env` for Node scripts:

```
MONGODB_URI=<same as above>
REDIS_URL=<same as above>
QIE_RPC_URL=https://rpc1mainnet.qie.digital
QIE_CHAIN_ID=1990
QIE_EXPLORER_URL=https://mainnet.qie.digital
DEFAULT_NETWORK=qie
NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS=<Treasury address>
NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS=<QUSD address>
```

### Services

- Frontend: `npm run dev`
- Anomaly middleware: `cd anomaly-engine && npm start`
- Cross-border listener: `npm run listener`
- Oracle feeder: `npx tsx scripts/oracle-feeder.ts`

### Admin Console

- Overview `/admin`: Treasury balances, throughput, risk summary, explorer link
- Ledger `/admin/ledger`: Transaction table with explorer links and a “Sync Now” button that triggers `/api/transfers` POST to backfill events from chain

## ✅ KYC Enforcement

- New users must complete KYC before using Swap or Global Send
- The Dashboard shows an “Identity Verification” card linking to Blockpass:
  - `https://verify-with.blockpass.org/?clientId=financial_app_00065`
- The UI disables Swap and Send, shows a banner, and enforces checks in handlers until KYC is verified
- Verification status is read via `/api/user?address=<wallet>`; after success, `POST /api/user` with `{ walletAddress }` marks `isKycVerified=true`

## 🔎 Troubleshooting

- Explorer links not opening: verify `QIE_EXPLORER_URL` and contract addresses
- Admin not updating: ensure anomaly middleware and listener are running, then use “Sync Now”
- Wallet balances not reading: confirm wallet switched to QIE chain (1990) in MetaMask

## 🎬 Demo & Judges' Guide

- See `DEMOS.md` for the recommended Loom flow (wallet connect, mock oracle tuning, cross-border swap, queue output, and QIEDEX simulation). Follow the checklist to narrate how each component maps to the “DeFi Without Borders” story.

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

Built for Qie Hackathon 2025
https://youtu.be/W1ehS7JrYpM

