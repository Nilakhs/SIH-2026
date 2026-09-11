import React, { useState } from 'react';
import type { ChatMessage } from '../../types';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessage;
}

const ChatMessageItem: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [sourcesOpen, setSourcesOpen] = useState(false);
  
  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[85%] rounded-lg p-4 border ${
          isUser 
            ? 'bg-amber-900/30 border-amber-500/30 text-amber-50 rounded-br-sm' 
            : 'bg-slate-800 border-slate-700 text-slate-200 rounded-bl-sm'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {message.role}
          </span>
          <span className="text-xs font-mono text-slate-600">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          {message.model && !isUser && (
            <span className="ml-auto text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
              {message.model}
            </span>
          )}
          {message.taskType && !isUser && (
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-400 border border-emerald-800/50">
              {message.taskType}
            </span>
          )}
        </div>
        
        <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed mb-3">
          {message.content}
        </div>
        
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <button 
              onClick={() => setSourcesOpen(!sourcesOpen)}
              className="flex items-center text-xs font-medium text-slate-400 hover:text-slate-300 transition-colors"
            >
              {sourcesOpen ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
              Sources ({message.sources.length})
            </button>
            
            {sourcesOpen && (
              <div className="mt-3 space-y-3">
                {message.sources.map((source, idx) => (
                  <div key={idx} className="bg-slate-900/50 rounded border border-slate-700/50 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-700/50 flex items-center justify-between">
                      <div className="flex items-center text-xs text-slate-300 font-medium truncate">
                        <FileText className="w-3 h-3 mr-1.5 text-emerald-500" />
                        <span className="truncate">{source.filename}</span>
                        <span className="mx-2 text-slate-600">•</span>
                        <span className="text-slate-400 font-mono">{source.metadata}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700 font-mono">
                        {(source.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="px-3 py-2 text-xs text-slate-400 font-mono line-clamp-3 leading-relaxed">
                      {source.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageItem;
