'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { 
  Calculator, 
  Calendar, 
  CreditCard, 
  Settings, 
  Smile, 
  User,
  LayoutDashboard,
  Send,
  RefreshCw,
  LifeBuoy,
  Search
} from 'lucide-react';

export default function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center border-b border-white/10 px-4">
          <Search className="w-5 h-5 text-gray-500 mr-2" />
          <Command.Input 
            placeholder="Type a command or search..."
            className="w-full h-14 bg-transparent text-white placeholder:text-gray-500 focus:outline-none text-lg"
          />
        </div>
        
        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="p-4 text-center text-gray-500">No results found.</Command.Empty>

          <Command.Group heading="Actions" className="text-gray-500 text-xs font-medium mb-2 px-2">
            <Command.Item
              onSelect={() => {
                setOpen(false);
                router.push('/dashboard?action=send');
              }}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white cursor-pointer aria-selected:bg-white/10 aria-selected:text-white transition-colors group"
            >
              <div className="p-2 rounded-md bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 group-aria-selected:bg-cyan-500/20">
                <Send className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Send Money</span>
            </Command.Item>
            
            <Command.Item
              onSelect={() => {
                setOpen(false);
                router.push('/dashboard?action=swap');
              }}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white cursor-pointer aria-selected:bg-white/10 aria-selected:text-white transition-colors group"
            >
              <div className="p-2 rounded-md bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20 group-aria-selected:bg-violet-500/20">
                <RefreshCw className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Swap QIE/QUSD</span>
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Navigation" className="text-gray-500 text-xs font-medium mb-2 px-2 mt-2">
            <Command.Item
              onSelect={() => {
                setOpen(false);
                router.push('/dashboard');
              }}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white cursor-pointer aria-selected:bg-white/10 aria-selected:text-white transition-colors group"
            >
              <LayoutDashboard className="w-4 h-4 text-gray-400 group-hover:text-white group-aria-selected:text-white" />
              <span className="text-sm font-medium">View Dashboard</span>
            </Command.Item>
            
            <Command.Item
              onSelect={() => {
                setOpen(false);
                // In a real app, this might go to a support page
                router.push('#support');
              }}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white cursor-pointer aria-selected:bg-white/10 aria-selected:text-white transition-colors group"
            >
              <LifeBuoy className="w-4 h-4 text-gray-400 group-hover:text-white group-aria-selected:text-white" />
              <span className="text-sm font-medium">Contact Support</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
        
        <div className="border-t border-white/10 px-4 py-2 flex items-center justify-between text-xs text-gray-500 bg-white/5">
          <div className="flex gap-2">
            <span>Navigate</span>
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-400">↓</kbd>
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-400">↑</kbd>
          </div>
          <div className="flex gap-2">
            <span>Select</span>
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-400">↵</kbd>
          </div>
        </div>
      </div>
    </Command.Dialog>
  );
}
