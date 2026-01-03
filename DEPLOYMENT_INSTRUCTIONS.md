# QieRemit Deployment Guide

This guide will help you deploy the entire QieRemit stack:
1.  **Database** (MongoDB Atlas)
2.  **Caching** (Upstash Redis)
3.  **Anomaly Engine** (Render)
4.  **Frontend Website** (Vercel)

---

## Step 1: Set up Cloud Databases

### 1. MongoDB Atlas (Database)
1.  Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2.  Create a **New Cluster** (Shared/Free Tier).
3.  In "Database Access", create a user (e.g., `qie_user`) and password.
4.  In "Network Access", allow access from anywhere (`0.0.0.0/0`).
5.  Click **Connect** -> **Drivers** -> Copy the connection string.
6.  Replace `<password>` with your actual password.
    *   *Save this as `MONGODB_URI` for later.*

### 2. Upstash (Redis)
1.  Go to [Upstash](https://upstash.com/) and create a free account.
2.  Create a new **Redis Database**.
3.  Scroll down to "Connect" and copy the `REDIS_URL` (starts with `redis://...`).
    *   *Save this as `REDIS_URL` for later.*

---

## Step 2: Deploy Anomaly Engine (Backend)

The "Brain" of your security system needs to run on a server. We will use **Render**.

1.  Push your code to **GitHub** if you haven't already.
2.  Go to [Render](https://render.com/) and create a free account.
3.  Click **New +** -> **Web Service**.
4.  Connect your GitHub repository.
5.  **Settings:**
    *   **Root Directory:** `anomaly-engine` (Important!)
    *   **Runtime:** Node
    *   **Build Command:** `npm install`
    *   **Start Command:** `npm start`
6.  **Environment Variables** (Add these):
    *   `MONGODB_URI`: (Paste your Atlas connection string)
    *   `REDIS_URL`: (Paste your Upstash connection string)
7.  Click **Create Web Service**.
8.  Once deployed, copy the **Service URL** (e.g., `https://anomaly-engine.onrender.com`).
    *   *Save this as `ANOMALY_SERVICE_URL`.*

---

## Step 3: Deploy Frontend (Website)

We will use **Vercel** for the main website.

1.  Go to [Vercel](https://vercel.com/) and login.
2.  Click **Add New...** -> **Project**.
3.  Import your GitHub repository.
4.  **Environment Variables:** Add the following (copy from your `.env.local` but update values):
    *   `NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS`: (Your Mainnet Contract Address)
    *   `NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS`: (Your Mainnet Contract Address)
    *   `MONGODB_URI`: (Your Atlas connection string)
    *   `NEXT_PUBLIC_MOCK_ORACLE_ADDRESS`: (Your Mainnet Oracle Address)
    *   `ANOMALY_SERVICE_URL`: (The Render URL from Step 2, e.g., `https://anomaly-engine.onrender.com`)
    *   *Note: You do not need private keys here.*
5.  Click **Deploy**.

---

## Step 4: Run Background Listeners

For the hackathon demo, the easiest way to run the listeners (which watch the blockchain for events) is **locally on your laptop**, connecting to the cloud database.

1.  Update your local `.env.local` file with the **Cloud** database credentials:
    ```env
    MONGODB_URI=mongodb+srv://... (Your Atlas URL)
    REDIS_URL=redis://... (Your Upstash URL)
    QIE_RPC_URL=https://rpc1mainnet.qie.digital/
    ```
2.  Open a terminal and run the Oracle Feeder:
    ```bash
    npx hardhat run scripts/oracle-feeder.ts --network qie
    ```
3.  Open another terminal and run the Cross-Border Listener:
    ```bash
    npx tsx scripts/cross-border-listener.ts
    ```

**Your website is now live!**
*   Users visit your Vercel URL.
*   The frontend talks to the Anomaly Engine on Render.
*   The Anomaly Engine saves data to MongoDB Atlas.
*   Your local scripts keep the Oracle updated and listen for transfers.
