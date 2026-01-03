'use client';

import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const transactions = [
  "💸 500 QUSD sent to India 🇮🇳",
  "🚀 New user joined from Kenya 🇰🇪",
  "⚡ QUSD Minted: $1,000",
  "💎 Large Transfer: 5,000 QUSD to UK 🇬🇧",
  "🛡️ Audit Passed: Contract Verified",
  "🌍 50+ Countries Supported",
  "💰 10,000 QUSD Liquidity Added",
  "🇧🇷 200 QUSD sent to Brazil",
];

export default function LiveTicker({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-full overflow-hidden bg-black/20 border-t border-b border-white/5 backdrop-blur-md", className)}>
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#020617] to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#020617] to-transparent z-10" />
      
      <div className="flex">
        <motion.div
          className="flex gap-8 py-4 whitespace-nowrap"
          animate={{
            x: [0, -1000],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 20,
              ease: "linear",
            },
          }}
        >
          {[...transactions, ...transactions, ...transactions].map((tx, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-cyan-100/80 backdrop-blur-sm"
            >
              {tx}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
