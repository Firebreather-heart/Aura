import { GoogleGenAI, LiveServerMessage, FunctionDeclaration, Tool, Type, Modality } from "@google/genai";
import { LIVE_MODEL, SYSTEM_INSTRUCTION, API_KEY } from "../constants";
import { MemoryService } from "./memoryService";
import { BotSettings } from "../types";

// Using string literals for types to avoid potential runtime Enum issues
const rememberTool: FunctionDeclaration = {
  name: 'remember',
  description: 'Call this function when the user tells you a new fact about themselves that should be remembered long-term (e.g. name, hobby, favorite color, pet, life event). Do not use for trivial things.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      fact: {
        type: Type.STRING,
        description: 'The concise fact to store.',
      },
    },
    required: ['fact'],
  },
};

export class LiveClient {
  private ai: GoogleGenAI | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  
  // Audio Queue Management
  private scheduledSources: AudioBufferSourceNode[] = [];
  private nextStartTime: number = 0;
  // processingId ensures we don't play audio chunks that finished decoding after an interruption occurred
  private processingId: number = 0;
  
  private isConnected: boolean = false;
  private session: any = null;
  
  public onVolume: (volume: number) => void = () => {};
  public onClose: () => void = () => {};
  public onMemoryUpdate: () => void = () => {};
  public onError: (error: string) => void = () => {};

  constructor() {
    // Client initialized in connect to ensure fresh API key
  }

  async connect(settings: BotSettings) {
    if (this.isConnected) return;

    this.ai = new GoogleGenAI({ apiKey: API_KEY });

    // 1. Prepare Audio Contexts
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    try {
      if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
      if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();
    } catch (e) {
      console.warn("Could not resume audio contexts", e);
    }

    this.outputNode = this.outputAudioContext.createGain();
    this.outputNode.connect(this.outputAudioContext.destination);

    // 2. Get Media Stream
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 3. Prepare System Instruction
    const memoryContext = MemoryService.getContextPrompt();
    const identityInstruction = `Your name is ${settings.botName}. You are a human, not an AI.`;
    const fullSystemInstruction = `${identityInstruction}\n${SYSTEM_INSTRUCTION}\n\n${memoryContext}\n\nIMPORTANT: You must initiate the conversation. Say hello immediately.`;

    // 4. Config without Google Search to prevent Internal Error
    const tools: Tool[] = [{ functionDeclarations: [rememberTool] }];

    // 5. Connect to Live API
    try {
        const sessionPromise = this.ai.live.connect({
            model: LIVE_MODEL,
            callbacks: {
                onopen: () => {
                    this.isConnected = true;
                    this.startInputStreaming(stream, sessionPromise);
                    MemoryService.updateInteraction();
                },
                onmessage: (message: LiveServerMessage) => {
                    this.handleMessage(message, sessionPromise);
                },
                onclose: () => {
                    this.disconnect();
                },
                onerror: (e) => {
                    console.error("Live API Error:", e);
                    this.disconnect();
                    this.onError("Connection error occurred.");
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voiceName } },
                },
                systemInstruction: fullSystemInstruction,
                tools: tools,
            },
        });
        
        this.session = await sessionPromise;
    } catch (e) {
        console.error("Connection failed:", e);
        this.disconnect();
        this.onError("Failed to connect.");
    }
  }

  private startInputStreaming(stream: MediaStream, sessionPromise: Promise<any>) {
    if (!this.inputAudioContext) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
    // Optimized buffer size for latency (2048)
    this.processor = this.inputAudioContext.createScriptProcessor(2048, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isConnected) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate Volume
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolume(rms * 5); 

      // Create blob and send
      const pcmBlob = this.createBlob(inputData);
      
      sessionPromise.then((session) => {
        if (this.isConnected) {
          session.sendRealtimeInput({ media: pcmBlob });
        }
      });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage, sessionPromise: Promise<any>) {
    // 1. Handle Interruption (Barge-in)
    if (message.serverContent?.interrupted) {
       this.stopAllAudio();
    }

    // 2. Handle Audio Response
    if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
      const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
      const currentProcessId = this.processingId;
      await this.playAudio(base64Audio, currentProcessId);
    }

    // 3. Handle Function Calls
    if (message.toolCall) {
      for (const fc of message.toolCall.functionCalls) {
        if (fc.name === 'remember') {
          const fact = (fc.args as any).fact;
          if (fact) {
            MemoryService.saveFact(fact);
            this.onMemoryUpdate();
            
            sessionPromise.then((session) => {
              session.sendToolResponse({
                functionResponses: [{
                  id: fc.id,
                  name: fc.name,
                  response: { result: "Fact saved successfully." }
                }]
              });
            });
          }
        }
      }
    }
  }

  private async playAudio(base64String: string, processId: number) {
    if (!this.outputAudioContext || !this.outputNode) return;

    const audioData = this.decode(base64String);
    const rms = Math.sqrt(audioData.reduce((acc, val) => acc + val * val, 0) / audioData.length);
    this.onVolume(rms * 5);

    const audioBuffer = await this.decodeAudioData(audioData, this.outputAudioContext);
    
    if (processId !== this.processingId) {
      return;
    }

    const source = this.outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputNode);

    const startTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;
    
    this.scheduledSources.push(source);
    
    source.onended = () => {
        this.scheduledSources = this.scheduledSources.filter(s => s !== source);
    };
  }

  private stopAllAudio() {
    this.processingId++;
    this.scheduledSources.forEach(source => {
        try { source.stop(); } catch (e) {}
    });
    this.scheduledSources = [];
    if (this.outputAudioContext) {
        this.nextStartTime = this.outputAudioContext.currentTime;
    }
  }

  disconnect() {
    this.isConnected = false;
    this.stopAllAudio();
    
    if (this.inputSource) {
      this.inputSource.disconnect();
      this.inputSource = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.outputNode) {
      this.outputNode.disconnect();
      this.outputNode = null;
    }
    
    if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
    
    this.onClose();
  }

  private createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      let val = data[i];
      if (val > 1) val = 1;
      if (val < -1) val = -1;
      int16[i] = val * 32767;
    }
    return {
      data: this.encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const sampleRate = 24000;
    const numChannels = 1;
    const frameCount = dataInt16.length / numChannels;
    
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  }
}