import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, ImageSettings } from "../types";
import { TEXT_MODEL, IMAGE_MODEL_FLASH, IMAGE_MODEL_PRO, SYSTEM_INSTRUCTION, API_KEY } from "../constants";

// Helper to get a fresh instance
const getAIClient = () => {
  return new GoogleGenAI({ apiKey: API_KEY });
};

export const sendMessage = async (
  history: Message[],
  newMessage: string
): Promise<string> => {
  const ai = getAIClient();
  
  // Convert history to format expected by Chat
  // We exclude the current message being sent from the history initialization
  const chat = ai.chats.create({
    model: TEXT_MODEL,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
    history: history
      .filter((msg) => msg.text && !msg.image) // Only text history for the chat context
      .map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text || '' }],
      })),
  });

  const response: GenerateContentResponse = await chat.sendMessage({
    message: newMessage,
  });

  return response.text || "I'm not sure what to say.";
};

export const generateImage = async (
  prompt: string,
  settings: ImageSettings
): Promise<{ imageUrl: string; caption: string }> => {
  const ai = getAIClient();
  
  const isHighRes = settings.resolution !== '1K';
  // Use Pro model for 2K/4K, Flash for 1K (default)
  const model = isHighRes ? IMAGE_MODEL_PRO : IMAGE_MODEL_FLASH;

  const imageConfig: any = {
    aspectRatio: settings.aspectRatio,
  };

  // imageSize is only supported by the Pro model
  if (isHighRes) {
    imageConfig.imageSize = settings.resolution;
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        {
          text: prompt,
        },
      ],
    },
    config: {
      imageConfig,
    },
  });

  let imageUrl = "";
  let caption = "";

  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        imageUrl = `data:image/png;base64,${base64EncodeString}`;
      } else if (part.text) {
        caption = part.text;
      }
    }
  }

  if (!imageUrl) {
    throw new Error("No image generated.");
  }

  return { imageUrl, caption };
};