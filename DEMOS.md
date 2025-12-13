# Demo Checklist: QieRemit Deep Dive

## 1. Prep your environment
- Copy `.env.local.example` to `.env.local` and fill in at least:
  - `NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS`
  - `NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS`
  - `NEXT_PUBLIC_MOCK_ORACLE_ADDRESS`
  - `REDIS_URL` (or `redis://127.0.0.1:6379` for local)
  - `QIE_RPC_URL` / `QIE_WS_RPC_URL` pointing at the QIE testnet (or your local node)
  - `QIEDX_PAIR` (optional but helpful to show real pair wiring)
- Start Redis (`docker run -p 6379:6379 redis` or `redis-server`), which powers the listener queue.
- (`npm install` already done)

## 2. Start services
1. `npm run dev` – keep the Next.js app running while recording.
2. `npm run listener` – show it booting, performing a historical sync, and printing `Queue processed` logs after each event.
3. Optional: run `npm run mock:oracle 1.05` to seed the currency converter with a 5% premium; you can repeat this mid-demo to emphasize the live FX feed.

## 3. Recording scope (suggested order)
1. **Landing page**: highlight the hero copy (“Borderless financial freedom”) and click “Launch App”. Mention that the app speaks directly to the QIE chain via the shared `config/config.json` and `.env.local` combo.
2. **Wallet connect**: show MetaMask connecting, landing on `/dashboard`, and the balances populating with native QIE and minted QUSD.
3. **Currency converter**: mention the live rate badge coming from `MockQieOracle` and the ability to push new rates with `npm run mock:oracle`. Run the command live or show it in a terminal to emphasize real-time refresh.
4. **Swap QIE → QUSD**: submit a small swap, wait for confirmation, and highlight the toast + updated balances.
5. **Mock QIEDex**: point the camera at the `scripts/deploy-all.js` terminal output (from your latest deployment) showing the `MockQieDex` address and the simulated swap log; mention that this mirrors what a future QIEDEX testnet integration would look like.
6. **Cross-border send**: fill recipient + amount, set a currency (e.g., EUR), and execute the transfer. Switch to the listener terminal to prove Redis queued the event and Mongo eventually stores the row (look for `Queue processed` + `Cross-border request queued`).
7. **Data rights**: open the privacy card, export the JSON, and show the delete modal to indicate feasibility.
8. **Wrap-up**: mention Redis queue resilience, mock oracle, config-driven networks, and the Loom-worthy `DEMOS.md` checklist.

## 4. Narrative hooks for judges
- Remind judges that `MockQieOracle` simulates paid FX feeds, but later you can swap in QIE Oracles by pointing `NEXT_PUBLIC_MOCK_ORACLE_ADDRESS` at a real feed.
- Emphasize that `MockQieDex` and the config `qiedexPair` field let you drop in any QIEDEX testnet pair once it's available.
- Highlight the Redis queue as the guardrail for compliance logs; even if Mongo blips, the queue keeps incoming transfers durable.
*** End of DEMOS.md
