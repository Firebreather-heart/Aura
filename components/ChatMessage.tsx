import React from 'react';
import { Message } from '../types';
import { User, Sparkles, Image as ImageIcon } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex w-full mb-6 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Avatar */}
        <div
          className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
            isUser
              ? 'bg-indigo-600 text-white'
              : 'bg-emerald-500 text-white'
          }`}
        >
          {isUser ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        </div>

        {/* Message Bubble */}
        <div
          className={`flex flex-col overflow-hidden rounded-2xl shadow-sm ${
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'
          }`}
        >
          {message.image ? (
            <div className="flex flex-col">
               <div className="relative">
                 <img
                    src={message.image}
                    alt="Generated content"
                    className="w-full h-auto object-cover max-h-[500px]"
                    loading="lazy"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-md">
                    <ImageIcon className="w-3 h-3" />
                    Generated
                  </div>
               </div>
              {message.text && (
                 <div className="p-4 pt-3 text-sm border-t border-black/10">
                   {message.text}
                 </div>
              )}
            </div>
          ) : (
            <div className="p-4 leading-relaxed whitespace-pre-wrap">
               {message.isLoading ? (
                  <div className="flex gap-1.5 items-center h-6">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                  </div>
               ) : (
                 message.text
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};