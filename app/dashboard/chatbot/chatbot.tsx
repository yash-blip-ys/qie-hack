// dashboard/chatbot/Chatbot.tsx
"use client";
import { useState, useRef, useEffect } from 'react';
import { FiSend, FiX, FiMessageSquare } from 'react-icons/fi';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Types
type Message = {
  text: string;
  sender: 'user' | 'bot';
};

type QAPair = {
  question: string;
  answer: string;
  keywords: string[];
};

// Stop words to ignore
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'how', 'why', 'what', 'is', 'are', 'was', 'were',
  'can', 'could', 'will', 'would', 'should', 'do', 'does', 'did', 'i', 'you', 'we', 'they',
  'he', 'she', 'it', 'me', 'my', 'mine', 'your', 'ours', 'his', 'her', 'its', 'their', 'them'
]);

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hello! I'm QieRemit Assistant. Ask me about transactions, KYC, fees, or security. Example: 'Why was my transaction blocked?'",
      sender: 'bot'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Gemini AI
  const genAI = new GoogleGenerativeAI(
    process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
  );

  // Q&A pairs with keywords for better matching
  // Expanded Q&A pairs with keywords for better matching
  const qaPairs: QAPair[] = [
    // Original questions
    {
      question: "what is qieremit",
      answer: "QieRemit is a borderless financial app for instant cross-border transfers using QUSD stablecoin on the QIE blockchain. It enables users to send money globally with ultra-low fees (0.1%) and sub-3-second settlement times.",
      keywords: ["qieremit", "what", "about", "platform", "app", "service"]
    },
    {
      question: "what is qusd",
      answer: "QUSD is a stablecoin pegged 1:1 to USD, designed for fast and low-cost global transactions on the QIE network. It's fully backed by reserves and audited regularly for transparency.",
      keywords: ["qusd", "stablecoin", "usd", "peg", "token", "currency"]
    },
    {
      question: "how does qieremit work",
      answer: "QieRemit works in 3 simple steps:\n1. Swap QIE for QUSD at a 1:1 ratio\n2. Send QUSD to any wallet globally\n3. Recipient can convert QUSD back to local currency or keep it as stablecoin.\nWe use real-time fraud detection and blockchain technology to ensure security.",
      keywords: ["work", "process", "steps", "how", "function", "mechanism"]
    },
    {
      question: "why was my transaction blocked",
      answer: "Transactions are blocked when our system detects high risk factors such as:\n- VPN/Proxy/TOR usage (IP reputation)\n- New wallets (<7 days old)\n- Unusually large transfer amounts\n- Suspicious browser fingerprints\nThis protects you and other users from fraud.",
      keywords: ["blocked", "transaction", "reject", "deny", "stop", "prevent", "fraud"]
    },
    {
      question: "why is my kyc blocked",
      answer: "KYC may be blocked due to:\n1. Unclear or low-quality document images\n2. Mismatched information (name/address)\n3. Suspicious activity patterns\n4. Failed liveness checks (if applicable)\nPlease resubmit high-quality photos of your government-issued ID and ensure all information matches.",
      keywords: ["kyc", "blocked", "verification", "document", "id", "rejected", "failed"]
    },
    {
      question: "how to swap qie for qusd",
      answer: "To swap QIE for QUSD:\n1. Connect your wallet (MetaMask/QIE Wallet)\n2. Go to the 'Swap' section\n3. Enter the QIE amount you want to convert\n4. Confirm the transaction\n5. Receive QUSD instantly in your wallet!\nFees: 0% for swaps, only network gas applies.",
      keywords: ["swap", "convert", "exchange", "qie", "qusd", "trade"]
    },
    {
      question: "how to send money globally",
      answer: "To send money globally with QieRemit:\n1. Swap QIE for QUSD (if needed)\n2. Go to 'Send Globally'\n3. Enter recipient's wallet address\n4. Select target currency (INR, EUR, GBP, etc.)\n5. Confirm the transfer\nFees: 0.1% for cross-border transfers\nArrival: Instant for QUSD, <24h for fiat conversions.",
      keywords: ["send", "global", "transfer", "money", "remittance", "international"]
    },
    {
      question: "what are the fees",
      answer: "QieRemit has the following fee structure:\n- Swapping QIE↔QUSD: FREE (only network gas)\n- Cross-border transfers: 0.1% fee\n- Fiat on/off ramps: Partner-dependent (typically 0.5-1%)\n- No hidden charges or subscription fees!",
      keywords: ["fees", "cost", "price", "charge", "expensive", "cheap"]
    },
    {
      question: "why do i need kyc",
      answer: "KYC (Know Your Customer) is required to:\n1. Prevent fraud and money laundering\n2. Comply with global financial regulations\n3. Protect users from scams\n4. Enable higher transaction limits\nThe process takes less than 2 minutes and only needs to be done once.",
      keywords: ["kyc", "verification", "why", "need", "require", "mandatory"]
    },
    {
      question: "how long do transfers take",
      answer: "Transfer speeds depend on the method:\n- QUSD transfers: INSTANT (blockchain confirmation)\n- Fiat conversions: 1-24 hours (partner dependent)\n- Cross-border QUSD: <5 seconds\nWe're significantly faster than traditional remittance services (1-5 days).",
      keywords: ["time", "long", "fast", "slow", "duration", "speed"]
    },
    {
      question: "is qieremit safe",
      answer: "Yes! QieRemit uses multiple security layers:\n1. Blockchain technology (immutable transactions)\n2. Real-time fraud detection (AI + rule-based)\n3. End-to-end encryption for all data\n4. Regular smart contract audits\n5. Compliance with global KYC/AML standards\nYour funds and data are protected by enterprise-grade security.",
      keywords: ["safe", "secure", "security", "protect", "risk", "trust"]
    },

    // New questions (20+ additions)
    {
      question: "what countries do you support",
      answer: "QieRemit currently supports transfers to/from:\n- India (INR)\n- Nigeria (NGN)\n- Philippines (PHP)\n- Kenya (KES)\n- UK (GBP)\n- Eurozone (EUR)\n- USA (USD)\nWe're adding new countries every month! Let us know if you need a specific country.",
      keywords: ["countries", "support", "available", "regions", "locations", "geography"]
    },
    {
      question: "what is the minimum transfer amount",
      answer: "Our minimum transfer amounts are:\n- QIE↔QUSD swaps: 1 QIE ($0.01)\n- Cross-border transfers: 10 QUSD ($10)\n- Fiat conversions: $5 equivalent\nThese minimums help cover network fees while keeping transfers affordable.",
      keywords: ["minimum", "amount", "limit", "smallest", "lowest"]
    },
    {
      question: "what is the maximum transfer limit",
      answer: "Transfer limits depend on your verification level:\n- Unverified: $1,000/month\n- Basic KYC: $10,000/month\n- Full KYC: $50,000/month\nFor higher limits, contact our support team with your use case.",
      keywords: ["maximum", "limit", "highest", "biggest", "large"]
    },
    {
      question: "how do i contact support",
      answer: "You can contact QieRemit support through:\n1. This chatbot (for instant answers)\n2. Email: support@qieremit.com\n3. Twitter: @QieRemit\n4. Our Discord community\nWe typically respond within 24 hours to all inquiries.",
      keywords: ["contact", "support", "help", "assistance", "reach", "email"]
    },
    {
      question: "can i cancel a transaction",
      answer: "Once confirmed on the blockchain, QUSD transactions cannot be canceled. However:\n- Pending transactions can be canceled in your wallet\n- For cross-border transfers, contact support immediately if you sent to the wrong address\n- Fiat conversions may be cancellable before processing\nAlways double-check recipient addresses!",
      keywords: ["cancel", "reverse", "undo", "mistake", "wrong", "error"]
    },
    {
      question: "what wallets do you support",
      answer: "QieRemit supports:\n1. MetaMask (recommended)\n2. QIE Wallet (native)\n3. WalletConnect (Trust Wallet, Rainbow, etc.)\n4. Ledger/Trezor (via WalletConnect)\nWe're working on adding more wallet options based on user demand.",
      keywords: ["wallets", "support", "compatible", "metamask", "qie", "trust"]
    },
    {
      question: "how do i get qusd",
      answer: "You can get QUSD in 3 ways:\n1. Swap QIE for QUSD in our app (1:1 ratio)\n2. Receive QUSD from another user\n3. Purchase through our fiat on-ramp partners (coming soon)\nQUSD is designed to maintain a stable 1:1 value with USD.",
      keywords: ["get", "obtain", "buy", "acquire", "receive", "purchase"]
    },
    {
      question: "what happens if qusd loses its peg",
      answer: "QUSD is fully backed by reserves and designed to maintain its 1:1 USD peg. In the unlikely event of depeg:\n1. Our smart contracts prevent minting if collateral falls below 100%\n2. Users can always redeem QUSD for QIE at 1:1 ratio\n3. We maintain transparent reserve audits\nHistorically, QUSD has maintained its peg within 0.1% variance.",
      keywords: ["peg", "lose", "value", "stable", "crash", "drop"]
    },
    {
      question: "can i use qusd for payments",
      answer: "Yes! QUSD is designed for:\n1. Cross-border remittances\n2. Merchant payments (integrations coming soon)\n3. DeFi applications on QIE chain\n4. Savings (stable value)\nWe're actively partnering with merchants to expand QUSD acceptance.",
      keywords: ["payments", "use", "spend", "merchant", "shop", "purchase"]
    },
    {
      question: "how do i check my transaction history",
      answer: "To check your transaction history:\n1. Go to the 'Transactions' tab in the dashboard\n2. Filter by date, type, or status\n3. Click any transaction for details\n4. Export your history as CSV for records\nAll transactions are also verifiable on the QIE blockchain explorer.",
      keywords: ["history", "transactions", "check", "view", "see", "past"]
    },
    {
      question: "what is the qie blockchain",
      answer: "QIE Blockchain is a next-gen Layer 1 with:\n- 25,000+ TPS (vs Ethereum's ~15 TPS)\n- ~3 second finality\n- 80% gas fee burn (deflationary)\n- EVM + Cosmos interoperability\n- MEV protection\nIt's designed for real-world adoption with low fees and high speed.",
      keywords: ["qie", "blockchain", "network", "chain", "layer1", "technology"]
    },
    {
      question: "how do i connect my wallet",
      answer: "To connect your wallet:\n1. Click 'Connect Wallet' in the top-right\n2. Choose your wallet (MetaMask/QIE Wallet)\n3. Approve the connection request\n4. Your wallet is now connected!\nNote: Always verify the contract address before approving transactions.",
      keywords: ["connect", "wallet", "link", "metamask", "qie", "approve"]
    },
    {
      question: "what is the qusd contract address",
      answer: "The current QUSD contract address is:\n`${process.env.NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS || '0xYourContractAddress'}`\nAlways verify this address in our official documentation or app before interacting.",
      keywords: ["contract", "address", "qusd", "token", "verify", "official"]
    },
    {
      question: "how do i add qusd to my wallet",
      answer: "To add QUSD to your wallet:\n1. Open your wallet (MetaMask/QIE Wallet)\n2. Go to 'Add Token'\n3. Enter the QUSD contract address:\n   ${process.env.NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS || '0xYourContractAddress'}\n4. Add the token\nQUSD will now appear in your wallet balance.",
      keywords: ["add", "wallet", "token", "qusd", "metamask", "qie"]
    },
    {
      question: "is there a mobile app",
      answer: "Our mobile app is currently in development! For now, you can:\n1. Use our web app on mobile (fully responsive)\n2. Add it to your home screen (PWA support)\n3. Join our waitlist for the native app launch\nWe expect to release iOS/Android apps in Q1 2025.",
      keywords: ["mobile", "app", "ios", "android", "phone", "waitlist"]
    },
    {
      question: "how do i get testnet qusd",
      answer: "To get testnet QUSD:\n1. Go to our faucet: [QIE Testnet Faucet](#)\n2. Enter your wallet address\n3. Request test QIE\n4. Swap QIE for QUSD in our app\nTestnet QUSD is for testing only and has no real value.",
      keywords: ["testnet", "faucet", "test", "qusd", "request", "free"]
    },
    {
      question: "what is the difference between qie and qusd",
      answer: "QIE and QUSD serve different purposes:\n- *QIE: Native blockchain token (volatile price, used for gas, staking)\n- **QUSD*: Stablecoin (pegged 1:1 to USD, used for payments/remittances)\nThink of QIE as 'Ether' and QUSD as 'USDC' on the QIE network.",
      keywords: ["difference", "qie", "qusd", "compare", "vs", "token"]
    },
    {
      question: "can i stake qie or qusd",
      answer: "Currently:\n- *QIE: Can be staked for network rewards (APR ~8-12%)\n- **QUSD*: Not stakable (it's a stablecoin)\nWe're exploring QUSD staking pools with partner protocols. Stay tuned for updates!",
      keywords: ["stake", "rewards", "apr", "interest", "earn", "yield"]
    },
    {
      question: "how do i report a problem",
      answer: "To report a problem:\n1. Use this chatbot (describe your issue)\n2. Email: support@qieremit.com\n3. Twitter DM: @QieRemit\nInclude:\n- Transaction hash (if applicable)\n- Screenshots\n- Wallet address\nWe resolve most issues within 24 hours.",
      keywords: ["report", "problem", "issue", "bug", "error", "help"]
    },
    {
      question: "what is your refund policy",
      answer: "Our refund policy:\n- *Blockchain transactions: Irreversible (by design)\n- **Failed transactions: Refunded automatically\n- **Fiat conversions: Refundable if processing fails\n- **Fraudulent transactions*: Investigated case-by-case\nAlways double-check addresses before sending!",
      keywords: ["refund", "policy", "money", "return", "failed", "mistake"]
    }
  ];

  // Preprocess keywords for faster matching
  const processedQAPairs = qaPairs.map(pair => ({
    ...pair,
    keywords: [...pair.keywords, ...pair.question.split(' ')],
  }));

  // Extract key phrases and match to best Q&A pair
  const getBestMatch = (userInput: string) => {
    const lowerInput = userInput.toLowerCase();
    const tokens = lowerInput
      .split(/[ ,.!?]+/)
      .filter(token => token.length > 2 && !STOP_WORDS.has(token));

    if (tokens.length === 0) {
      return { answer: null, confidence: 0 };
    }

    // Score each Q&A pair
    const scoredPairs = processedQAPairs.map(pair => {
      let score = 0;
      const questionTokens = pair.question.split(/[ ,.!?]+/);

      // Exact question match
      if (lowerInput.includes(pair.question)) {
        return { ...pair, confidence: 1 };
      }

      // Keyword matching
      pair.keywords.forEach(keyword => {
        if (tokens.includes(keyword)) score += 0.5;
      });

      // Partial question matching
      questionTokens.forEach(token => {
        if (tokens.includes(token)) score += 0.3;
      });

      // Normalize score
      const confidence = Math.min(1, score / (pair.keywords.length * 0.5));
      return { ...pair, confidence };
    });

    // Sort by confidence and pick best match
    const bestMatch = scoredPairs.sort((a, b) => b.confidence - a.confidence)[0];
    return bestMatch.confidence > 0.3
      ? { answer: bestMatch.answer, confidence: bestMatch.confidence }
      : { answer: null, confidence: 0 };
  };

  // Call Gemini AI as fallback
  const callGeminiAI = async (question: string) => {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      return "I'm currently unable to answer that. Please try rephrasing or ask a different question.";
    }

    try {
      setIsGeminiLoading(true);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

      const prompt = `
You are QieRemit Assistant, an AI helper for QieRemit, a blockchain-based remittance platform.

*About QieRemit:*
- Platform for instant cross-border transfers using QUSD (a USD-pegged stablecoin).
- Built on QIE Blockchain: 25K TPS, ~3s settlement, EVM + Cosmos compatible.
- Features: 0.1% fees, fraud detection, KYC compliance, real-time tracking.

*Rules:*
1. ONLY answer about QieRemit, QUSD, QIE Blockchain, or cross-border transfers.
2. If unrelated, respond: "I can only answer about QieRemit. Try asking about transactions or QUSD."
3. Keep answers under 150 words. Use bullet points for steps.
4. Focus on user benefits: speed, cost, security.
5. For technical terms, explain simply.

*Example Answers:*
- Q: "How fast are transfers?"
  A: "QieRemit transfers settle in ~3 seconds using QIE Blockchain. Cross-border QUSD transfers are instant."

- Q: "Is QUSD safe?"
  A: "Yes! QUSD is fully backed 1:1 by USD reserves and audited regularly. All transfers use blockchain security."

*Question:*
"${question}"
`;


      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setIsGeminiLoading(false);
      return text;
    } catch (error) {
      console.error("Gemini AI error:", error);
      setIsGeminiLoading(false);
      return "Sorry, I encountered an error while processing your request. Please try again later.";
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { text: input, sender: 'user' }]);
    setInput('');
    setIsTyping(true);

    // Try to find a matching Q&A pair
    const { answer, confidence } = getBestMatch(input);

    if (answer) {
      // Found a good match
      setTimeout(() => {
        setMessages(prev => [...prev, { text: answer, sender: 'bot' }]);
        setIsTyping(false);
      }, 800);
    } else {
      // No good match - use Gemini AI as fallback
      try {
        const geminiResponse = await callGeminiAI(input);
        setMessages(prev => [...prev, { text: geminiResponse, sender: 'bot' }]);
      } catch (error) {
        setMessages(prev => [...prev, {
          text: "I couldn't find an answer to that. Try asking about QieRemit, QUSD, transactions, or KYC.",
          sender: 'bot'
        }]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <>
      {/* Chatbot button (always visible) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300"
        aria-label="Open chat"
      >
        <FiMessageSquare size={24} />
      </button>

      {/* Chatbot modal */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-80 h-[400px] bg-white rounded-lg shadow-xl flex flex-col border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                🤖
              </div>
              <h3 className="font-semibold">QieRemit Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 transition"
              aria-label="Close chat"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Messages container */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                >
                  {msg.text.split('\n').map((line, i) => (
                    <p key={i} className="mb-1">{line}</p>
                  ))}
                </div>
              </div>
            ))}

            {(isTyping || isGeminiLoading) && (
              <div className="flex justify-start mb-3">
                <div className="bg-gray-200 text-gray-800 p-3 rounded-lg rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="p-3 border-t border-gray-200 bg-white rounded-b-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about QieRemit..."
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"
                aria-label="Send message"
              >
                <FiSend size={20} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              Try: &ldquo;Why was my transaction blocked?&rdquo;
            </p>
          </div>
        </div>
      )}
    </>
  );
}
