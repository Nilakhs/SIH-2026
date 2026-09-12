import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, AvailableModel, ModelStatus, TaskClassification, ChatStreamChunk } from '../types';
import { fetchModelStatus, fetchAvailableModels, classifyTask } from '../api/client';
import ModelSelector from '../components/workbench/ModelSelector';
import ChatMessageItem from '../components/workbench/ChatMessage';
import TaskIndicator from '../components/workbench/TaskIndicator';
import { Image as ImageIcon, X, ShieldCheck } from 'lucide-react';

const Workbench: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [taskClassification, setTaskClassification] = useState<TaskClassification | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ file: File; preview: string; base64: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('Image file size must be less than 20MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAttachedImage({
        file,
        preview: result,
        base64: result
      });
      // Trigger instant task classification preview
      classifyTask(input.trim(), true).then(classification => {
        setTaskClassification(classification);
      }).catch(() => {});
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeAttachedImage = () => {
    setAttachedImage(null);
    if (!input.trim()) {
      setTaskClassification(null);
    } else {
      classifyTask(input.trim(), false).then(setTaskClassification).catch(() => {});
    }
  };

  const sendMessage = async () => {
    const hasImage = !!attachedImage;
    const promptText = input.trim();
    if ((!promptText && !hasImage) || isStreaming) return;
    
    const currentImage = attachedImage;
    const effectiveContent = promptText || "Analyze this image and describe the important components or information visible in it.";

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: effectiveContent,
      timestamp: new Date().toISOString(),
      images: currentImage ? [currentImage.base64] : undefined,
      imagePreview: currentImage ? currentImage.preview : undefined,
    };
    
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setAttachedImage(null);
    setIsStreaming(true);
    setTaskClassification(null);
    
    // Classify task
    let currentClassification: TaskClassification | undefined = undefined;
    try {
      const classification = await classifyTask(userMsg.content, hasImage);
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
      model: hasImage ? (currentClassification?.recommended_model || 'moondream') : (selectedModel || undefined),
      taskType: currentClassification?.task_type || (hasImage ? 'image_vision' : undefined),
    };
    
    setMessages(prev => [...prev, assistantMsg]);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ 
            role: m.role, 
            content: m.content,
            images: m.images
          })),
          model: hasImage ? undefined : (selectedModel || undefined),
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
                  "Analyze this image and identify visible components...",
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
                  {taskClassification?.task_type === 'document_analysis' 
                    ? 'Searching local knowledge base...' 
                    : taskClassification?.task_type === 'image_vision'
                    ? 'Running local vision model (Ollama)...'
                    : 'Generating response...'}
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>
      
      <div className="p-4 bg-slate-950 border-t border-slate-900">
        <div className="max-w-4xl mx-auto">
          {/* IMAGE PREVIEW CARD */}
          {attachedImage && (
            <div className="mb-3 flex items-center gap-3 p-2.5 bg-slate-900/90 border border-purple-800/60 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2">
              <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shrink-0">
                <img src={attachedImage.preview} alt="Attachment thumbnail" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Image Attachment</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 flex items-center gap-1 font-mono">
                    <ShieldCheck className="w-3 h-3" /> LOCAL AIR-GAPPED
                  </span>
                </div>
                <p className="text-xs text-slate-300 truncate font-mono mt-0.5">{attachedImage.file.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">{(attachedImage.file.size / 1024).toFixed(1)} KB • Routes to Vision Model</p>
              </div>
              <button 
                type="button"
                onClick={removeAttachedImage}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 relative">
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/png,image/jpeg,image/jpg,image/webp" 
              onChange={handleImageSelect} 
              className="hidden" 
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              className="h-12 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/50 text-slate-300 hover:text-purple-300 rounded-lg transition-colors flex items-center gap-2 text-xs font-medium shrink-0 disabled:opacity-50"
              title="Attach image (PNG, JPG, WEBP)"
            >
              <ImageIcon className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Attach Image</span>
            </button>

            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={attachedImage ? "Ask a question about this image (e.g. 'What components can you identify?')..." : "Send a message... (Shift+Enter for new line)"}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 resize-none overflow-hidden text-sm text-slate-200 placeholder-slate-500"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
                disabled={isStreaming}
              />
              <button
                onClick={sendMessage}
                disabled={(!input.trim() && !attachedImage) || isStreaming}
                className="absolute right-2 bottom-2 p-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded transition-colors"
                title="Send query"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workbench;
