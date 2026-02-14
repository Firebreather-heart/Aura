import React from 'react';
import { Settings, X, User, Volume2, Check } from 'lucide-react';
import { BotSettings, VoiceName } from '../types';
import { VOICES } from '../constants';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BotSettings;
  onUpdate: (newSettings: BotSettings) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-white">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-2 text-indigo-400">
            <Settings className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Companion Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Bot Name */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <User className="w-4 h-4" />
              Bot Name
            </label>
            <input 
              type="text" 
              value={settings.botName}
              onChange={(e) => onUpdate({ ...settings, botName: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-slate-500"
              placeholder="Name your companion..."
            />
          </div>

          {/* Voice Selection */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Volume2 className="w-4 h-4" />
              Voice Selection
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {VOICES.map((voice) => (
                <button
                  key={voice}
                  onClick={() => onUpdate({ ...settings, voiceName: voice })}
                  className={`relative px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 border flex items-center justify-center gap-2 ${
                    settings.voiceName === voice
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:bg-slate-700'
                  }`}
                >
                  {voice}
                  {settings.voiceName === voice && (
                    <div className="absolute top-1 right-1">
                       <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_5px_rgba(129,140,248,0.8)]"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 bg-slate-800/50 border-t border-slate-700 flex justify-end">
            <button 
                onClick={onClose}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-6 rounded-xl transition-all shadow-lg shadow-indigo-900/20 flex items-center gap-2"
            >
                <Check className="w-4 h-4" />
                Done
            </button>
        </div>
      </div>
    </div>
  );
};