import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Settings, BrainCircuit, AudioLines, X, Sparkles, AlertCircle } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { LiveClient } from './services/liveClient';
import { AudioVisualizer } from './components/AudioVisualizer';
import { SettingsDialog } from './components/SettingsDialog';
import { MemoryService } from './services/memoryService';
import { BotSettings } from './types';
import { DEFAULT_BOT_NAME, DEFAULT_VOICE } from './constants';

const App: React.FC = () => {
  // State for the initial user gesture (required by browsers for AudioContext)
  const [hasStarted, setHasStarted] = useState(false);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isRemembering, setIsRemembering] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [botSettings, setBotSettings] = useState<BotSettings>({
    botName: DEFAULT_BOT_NAME,
    voiceName: DEFAULT_VOICE
  });

  const clientRef = useRef<LiveClient | null>(null);

  useEffect(() => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered:', registration))
        .catch(error => console.log('SW registration failed:', error));
    }

    // Load settings from memory
    const savedSettings = MemoryService.getSettings();
    setBotSettings(savedSettings);

    // Initialize client
    clientRef.current = new LiveClient();
    clientRef.current.onVolume = (vol) => setVolume(vol);
    clientRef.current.onClose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        setVolume(0);
    };
    clientRef.current.onMemoryUpdate = () => {
      setIsRemembering(true);
      setTimeout(() => setIsRemembering(false), 2000);
    };
    clientRef.current.onError = (msg) => {
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(null), 5000);
    };

    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  const handleSettingsUpdate = (newSettings: BotSettings) => {
    setBotSettings(newSettings);
    MemoryService.saveSettings(newSettings);
  };

  const handleConnect = async () => {
    if (!clientRef.current) return;
    
    setErrorMessage(null); // Clear previous errors
    
    try {
      if (isConnected) {
        clientRef.current.disconnect();
        setIsConnected(false);
        setVolume(0);
      } else {
        setIsConnecting(true);
        // Ensure we pass the latest settings
        await clientRef.current.connect(botSettings);
        setIsConnected(true);
      }
    } catch (e: any) {
      console.error("Connection failed", e);
      setIsConnected(false);
      setErrorMessage("Unable to connect. Please try again.");
    } finally {
        setIsConnecting(false);
    }
  };

  // One-time start handler to satisfy AudioContext policy and auto-connect
  const handleInitialStart = async () => {
    setHasStarted(true);
    await handleConnect();
  };

  // Initial Splash Screen to get user gesture
  if (!hasStarted) {
    return (
      <div 
        onClick={handleInitialStart}
        className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col items-center justify-center cursor-pointer select-none"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 opacity-80 z-0"></div>
        
        <div className="z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
           <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
           </div>
           
           <div className="text-center space-y-2">
             <h1 className="text-3xl font-bold tracking-tight">Meet {botSettings.botName}</h1>
             <p className="text-indigo-300/80">Tap anywhere to start the conversation</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white font-sans overflow-hidden relative selection:bg-indigo-500/30">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 opacity-80 z-0 pointer-events-none"></div>

      {/* Header */}
      <header className="flex-none p-6 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg border border-white/10 relative overflow-hidden group">
            <span className="text-white font-bold text-lg relative z-10">
              {botSettings.botName.charAt(0).toUpperCase()}
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wide">{botSettings.botName}</h1>
            <p className="text-xs text-indigo-300 font-medium tracking-wider uppercase flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
              {isConnected ? 'Connected' : isConnecting ? 'Waking up...' : 'Offline'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Memory Indicator */}
          <div className={`transition-all duration-500 flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-sm ${isRemembering ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
            <BrainCircuit className="w-3.5 h-3.5 text-indigo-300" />
            <span className="text-[10px] text-indigo-200 font-medium uppercase tracking-widest">Memory Saved</span>
          </div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all backdrop-blur-sm border border-white/5"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Visualizer Area */}
      <main className="flex-1 flex flex-col items-center justify-center z-10 relative">
        <div className={`transition-all duration-1000 ${isConnected || isConnecting ? 'opacity-100 scale-100' : 'opacity-40 grayscale scale-95'}`}>
           <AudioVisualizer isActive={isConnected || isConnecting} volume={volume} />
        </div>
        
        {!isConnected && !isConnecting && !errorMessage && (
          <div className="absolute mt-40 text-center animate-fade-in px-4">
             <p className="text-lg text-indigo-200/60 font-light tracking-wide">
               <span className="text-indigo-200 font-normal">{botSettings.botName}</span> is sleeping...
             </p>
          </div>
        )}

        {isConnecting && (
          <div className="absolute mt-40 text-center animate-pulse px-4">
             <p className="text-lg text-indigo-200/80 font-light tracking-wide">
               Waking up...
             </p>
          </div>
        )}
        
        {/* Error Message Toast */}
        {errorMessage && (
          <div className="absolute mt-48 animate-in fade-in slide-in-from-bottom-4 duration-300 px-4">
             <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md">
                <AlertCircle className="w-4 h-4" />
                {errorMessage}
             </div>
          </div>
        )}
      </main>

      {/* Controls Footer */}
      <footer className="flex-none pb-12 pt-4 px-8 z-10">
        <div className="max-w-md mx-auto flex items-center justify-center gap-8 relative">
          
          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)} 
            disabled={!isConnected}
            className={`p-4 rounded-full transition-all duration-300 border border-transparent ${
              !isConnected 
                ? 'opacity-0 pointer-events-none scale-75'
                : isMuted 
                  ? 'bg-slate-800 text-red-400 border-red-500/30' 
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Connect / Disconnect Main Button */}
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className={`relative p-8 rounded-full shadow-2xl transition-all duration-500 transform hover:scale-105 group ${
              isConnected || isConnecting
                ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white ring-4 ring-red-500/20 shadow-red-900/30' 
                : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white ring-4 ring-indigo-500/20 shadow-indigo-900/40 animate-pulse-slow'
            }`}
          >
            {isConnected || isConnecting ? (
              <X className="w-8 h-8" />
            ) : (
              <AudioLines className="w-8 h-8" />
            )}
            
            {/* Glow Effect */}
            <div className={`absolute inset-0 rounded-full blur-xl transition-opacity duration-500 -z-10 ${isConnected || isConnecting ? 'bg-red-500/40' : 'bg-indigo-500/40 group-hover:bg-indigo-500/60'}`}></div>
          </button>
          
           {/* Placeholder to balance layout */}
           <div className="w-[58px]"></div>

        </div>
      </footer>
      
      <SettingsDialog 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        settings={botSettings}
        onUpdate={handleSettingsUpdate}
      />

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          50% { transform: scale(1.02); box-shadow: 0 0 20px 0 rgba(99, 102, 241, 0.2); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite ease-in-out;
        }
      `}</style>
      <Analytics />
    </div>
  );
};

export default App;
