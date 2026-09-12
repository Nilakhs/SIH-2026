import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, AvailableModel, ModelStatus, TaskClassification, ChatStreamChunk } from '../types';
import { fetchModelStatus, fetchAvailableModels, classifyTask } from '../api/client';
import ModelSelector from '../components/workbench/ModelSelector';
import ChatMessageItem from '../components/workbench/ChatMessage';
import TaskIndicator from '../components/workbench/TaskIndicator';
import VoiceInput from '../components/VoiceInput';

const Workbench: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [taskClassification, setTaskClassification] = useState<TaskClassification | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const init = async () => {
      try {
        const status = await fetchModelStatus();
        setModelStatus(status);
        if (status.available) {
          const mods = await fetchAvailableModels();
          setModels(mods);
          if (mods.length > 0) {
            setSelectedModel(mods[0].name);
          }
        }
      } catch (err) {
        console.error("Failed to fetch models", err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);
    setTaskClassification(null);
    
    // Classify task
    let currentClassification: TaskClassification | undefined = undefined;
    try {
      const classification = await classifyTask(userMsg.content);
      setTaskClassification(classification);
      currentClassification = classification;
    } catch (e) {
      console.error('Task classification failed:', e);
    }
    
    // Create placeholder assistant message
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      model: selectedModel || undefined,
      taskType: currentClassification?.task_type,
    };
    
    setMessages(prev => [...prev, assistantMsg]);
    
    try {
      const token = localStorage.getItem('sovereign_token');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          model: selectedModel || undefined,
          stream: true,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: `Error: ${errorData.detail || errorData.error || 'Failed to get response'}`,
          };
          return updated;
        });
        setIsStreaming(false);
        return;
      }
      
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const chunk = JSON.parse(data) as ChatStreamChunk;
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + chunk.content,
                  model: chunk.model || last.model,
                  taskType: chunk.task_type || last.taskType,
                  sources: chunk.sources || last.sources,
                };
                return updated;
              });
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: `Error: Unable to connect to the AI backend. Is Ollama running?`,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-200">
      <ModelSelector 
        models={models}
        selectedModel={selectedModel}
        onSelect={setSelectedModel}
        status={modelStatus}
      />
      
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto flex flex-col min-h-full">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 mt-12">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-700">
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-100 mb-2">Sovereign AI Workbench</h1>
              <p className="text-slate-400 mb-8 max-w-md">Your local AI assistant. All processing happens on this machine.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {[
                  "Write a python script to parse logs...",
                  "Explain how quantum computing works...",
                  "Summarize the latest trends in AI...",
                  "Help me debug this React component..."
                ].map((prompt, i) => (
                  <button 
                    key={i} 
                    onClick={() => setInput(prompt)}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-lg text-left hover:bg-slate-800 hover:border-slate-700 transition-colors text-sm text-slate-300"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <ChatMessageItem key={msg.id} message={msg} />
              ))}
              
              {isStreaming && taskClassification && (
                <TaskIndicator classification={taskClassification} />
              )}
              
              {isStreaming && (
                <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  {taskClassification?.task_type === 'document_analysis' ? 'Searching local knowledge base...' : 'Generating response...'}
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>
      
      <div className="p-4 bg-slate-950 border-t border-slate-900">
        <div className="max-w-4xl mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Send a message... (Shift+Enter for new line)"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-24 py-3 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 resize-none overflow-hidden text-sm text-slate-200 placeholder-slate-500"
            rows={1}
            style={{ minHeight: '48px', maxHeight: '120px' }}
            disabled={isStreaming}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <VoiceInput
              onTranscript={(text) => setInput(prev => prev ? `${prev} ${text}` : text)}
              disabled={isStreaming}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              className="p-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workbench;
