import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/contexts/Web3Provider";
import { Toaster } from "react-hot-toast";
import ConsentBanner from "@/components/compliance/ConsentBanner";
import Chatbot from "./dashboard/chatbot/chatbot";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QieRemit - Borderless Financial App",
  description: "Send money globally on the Qie blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3Provider>
          {children}
          <Chatbot />
          <ConsentBanner />
          <Toaster position="top-right" />
        </Web3Provider>
      </body>
    </html>
  );
}

