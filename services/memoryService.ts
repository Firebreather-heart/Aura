import { BotSettings, VoiceName } from "../types";
import { DEFAULT_BOT_NAME, DEFAULT_VOICE } from "../constants";

export interface UserMemory {
  facts: string[];
  lastInteraction: number;
  interactionCount: number;
  settings?: BotSettings;
}

const STORAGE_KEY = 'aura_memory_v1';

export const MemoryService = {
  getMemory(): UserMemory {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("Failed to load memory", e);
    }
    
    return {
      facts: [],
      lastInteraction: 0,
      interactionCount: 0
    };
  },

  getSettings(): BotSettings {
    const memory = this.getMemory();
    return memory.settings || { botName: DEFAULT_BOT_NAME, voiceName: DEFAULT_VOICE };
  },

  saveSettings(settings: BotSettings) {
    const memory = this.getMemory();
    memory.settings = settings;
    this.saveMemory(memory);
  },

  saveFact(fact: string) {
    const memory = this.getMemory();
    if (!memory.facts.includes(fact)) {
      memory.facts.push(fact);
      this.saveMemory(memory);
      return true;
    }
    return false;
  },

  updateInteraction() {
    const memory = this.getMemory();
    memory.lastInteraction = Date.now();
    memory.interactionCount += 1;
    this.saveMemory(memory);
  },

  saveMemory(memory: UserMemory) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  },

  getContextPrompt(): string {
    const memory = this.getMemory();
    const settings = this.getSettings();
    const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';
    
    let context = `Current Context:\n- Time: ${timeOfDay}\n- Interaction Count: ${memory.interactionCount}\n`;
    
    if (memory.facts.length > 0) {
      context += `\nThings you remember about your partner (the user):\n${memory.facts.map(f => `- ${f}`).join('\n')}\n`;
    } else {
      context += `\nThis is your first conversation. Be charming and ask for their name.\n`;
    }

    if (memory.lastInteraction > 0) {
      const daysAgo = Math.floor((Date.now() - memory.lastInteraction) / (1000 * 60 * 60 * 24));
      if (daysAgo > 7) {
        context += `\nIt has been ${daysAgo} days since you last spoke. Say you missed them.\n`;
      } else if (daysAgo === 0) {
        context += `\nYou just spoke earlier today.\n`;
      }
    }

    return context;
  }
};