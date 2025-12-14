// components/chatbot/Chatbot.tsx
"use client"; // Required for Next.js 13+ client components

import { useState, useRef, useEffect } from 'react';
import { FiSend, FiX, FiMessageSquare } from 'react-icons/fi';

type Message = {
  text: string;
  sender: 'user' | 'bot';
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hello! I'm QieRemit Assistant. Ask me about anomalies, KYC, or transactions. Example: 'Why was my transaction blocked?'",
      sender: 'bot'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hardcoded Q&A pairs
  const qaPairs: Record<string, string> = {
    "what is qieremit": "QieRemit is a borderless financial app for instant cross-border transfers using QUSD stablecoin on the QIE blockchain.",
    "what is qusd": "QUSD is a stablecoin pegged 1:1 to USD, designed for fast and low-cost global transactions on the QIE network.",
    "how does qieremit work": "QieRemit lets you swap QIE for QUSD and send it globally. We use real-time fraud detection to keep transactions secure.",
    "why was my transaction blocked": "Transactions are blocked when our system detects high risk (VPN usage, new wallets, or large amounts). This protects you from fraud.",
    "why is my kyc blocked": "KYC may be blocked if your documents are unclear or fail verification. Please resubmit high-quality photos of your government-issued ID.",
    "how to swap qie for qusd": "1. Connect your wallet\n2. Enter the QIE amount you want to swap\n3. Confirm the transaction\n4. Receive QUSD instantly in your wallet!",
    "how to send money globally": "1. Swap QIE for QUSD\n2. Enter recipient's wallet address\n3. Select target currency (INR, EUR, etc.)\n4. Confirm the transfer\nFees: 0.1%, arrival: instant!",
    "what are the fees": "QieRemit charges a 0.1% fee for cross-border transfers. Swapping QIE to QUSD is free!",
    "why do i need kyc": "KYC (Know Your Customer) is required to prevent fraud and comply with global financial regulations. It takes less than 2 minutes!",
    "how long do transfers take": "Transfers are instant when using QUSD. Traditional bank transfers may take 1-3 days, but we're much faster!",
    "is qieremit safe": "Yes! We use blockchain technology, real-time fraud detection, and end-to-end encryption to keep your funds and data secure."
  };

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { text: input, sender: 'user' }]);
    setInput('');
    setIsTyping(true);

    // Simulate bot typing delay
    setTimeout(() => {
      // Find matching question (case-insensitive)
      const lowerInput = input.toLowerCase();
      const matchedQuestion = Object.keys(qaPairs).find(question =>
        lowerInput.includes(question)
      );

      const reply = matchedQuestion
        ? qaPairs[matchedQuestion]
        : "I'm here to help with QieRemit! Try asking:\n- What is QUSD?\n- Why was my transaction blocked?\n- How do I send money globally?";

      setMessages(prev => [...prev, { text: reply, sender: 'bot' }]);
      setIsTyping(false);
    }, 800);
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

      {/* Chatbot modal (hidden by default) */}
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
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.sender === 'user'
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

            {isTyping && (
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
              Try: "Why was my transaction blocked?"
            </p>
          </div>
        </div>
      )}
    </>
  );
}
