export interface Message {
  id: string;
  role: 'user' | 'model';
  text?: string;
  image?: string;
  timestamp: number;
  isLoading?: boolean;
}

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface BotSettings {
  botName: string;
  voiceName: VoiceName;
}

export interface ImageSettings {
  resolution: '1K' | '2K' | '4K';
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
}
