import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle, Wrench, AlertTriangle, ChevronDown, ChevronRight, FileText, Play, Terminal } from 'lucide-react';
import type { AgentEvent } from '../api/client';
import SandboxSecurityPanel from '../components/sandbox/SandboxSecurityPanel';

const Agents: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const endOfEventsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfEventsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const runAgent = async () => {
    if (!prompt.trim() || isRunning) return;

    setEvents([]);
    setFinalAnswer(null);
    setSources([]);
    setIsRunning(true);

    try {
      const response = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to start agent');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // The last element might be incomplete
        buffer = lines.pop() || '';

        for (const block of lines) {
          const line = block.trim();
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const event = JSON.parse(dataStr) as AgentEvent;
              setEvents(prev => [...prev, event]);
              
              if (event.type === 'final') {
                if (event.answer) setFinalAnswer(event.answer);
                if (event.sources) setSources(event.sources);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err: any) {
      setEvents(prev => [...prev, { type: 'error', error: err.message || 'Unknown error' }]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-200">
      {/* Top: Input Area */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-4xl mx-auto space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 mb-2">Agent Workflow</h1>
            <p className="text-slate-400 text-sm">Describe a complex task for the agent to execute.</p>
          </div>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Analyze the critical equipment issues in the inspection report..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 resize-none min-h-[100px] text-sm text-slate-200 placeholder-slate-500"
              disabled={isRunning}
            />
            <button
              onClick={runAgent}
              disabled={!prompt.trim() || isRunning}
              className="absolute right-4 bottom-4 flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-md transition-colors font-medium text-sm"
            >
              <Play className="w-4 h-4" />
              Run Agent
            </button>
          </div>
        </div>
      </div>

      {/* Middle: Execution Trace */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
        <div className="max-w-4xl mx-auto space-y-4">
          {events.length > 0 && (
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
              Execution Trace
            </div>
          )}
          
          <div className="space-y-3">
            {events.map((event, idx) => {
              if (event.type === 'agent_step') {
                return (
                  <div key={idx} className="flex items-center gap-3 text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-lg">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{event.step || 'Processing step...'}</span>
                  </div>
                );
              }
              if (event.type === 'tool_call') {
                if (event.tool === 'PYTHON_SANDBOX') {
                  return (
                    <div key={idx} className="ml-6 space-y-3">
                      <div className="flex items-center gap-3 text-amber-400 bg-amber-950/20 border border-amber-900/30 p-3 rounded-lg">
                        <Terminal className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">Executing Python code in sandbox...</span>
                      </div>
                      <SandboxSecurityPanel />
                      {event.code && (
                        <details className="bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-sm text-slate-300 cursor-pointer">
                          <summary className="font-semibold text-slate-400 p-2">Generated Python Code</summary>
                          <pre className="p-2 overflow-x-auto font-mono text-xs text-sky-300 mt-2 bg-slate-950 rounded">
                            {event.code}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                }
                return (
                  <div key={idx} className="flex items-center gap-3 text-amber-400 bg-amber-950/20 border border-amber-900/30 p-3 rounded-lg ml-6">
                    <Wrench className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">Running tool: <span className="font-mono bg-amber-900/40 px-1.5 py-0.5 rounded text-amber-300">{event.tool}</span></span>
                  </div>
                );
              }
              if (event.type === 'tool_result') {
                if (event.tool === 'PYTHON_SANDBOX') {
                  return (
                    <div key={idx} className="ml-10 space-y-2 bg-slate-900 border border-slate-700 rounded-lg p-4">
                      <div className="text-sm font-semibold text-slate-400 mb-2">Execution Output</div>
                      {event.stdout && (
                        <div>
                          <span className="text-xs text-slate-500 uppercase">Stdout</span>
                          <pre className="p-2 overflow-x-auto font-mono text-xs text-slate-300 bg-slate-950 rounded mt-1">
                            {event.stdout}
                          </pre>
                        </div>
                      )}
                      {event.stderr && (
                        <div className="mt-2">
                          <span className="text-xs text-red-500/80 uppercase">Stderr</span>
                          <pre className="p-2 overflow-x-auto font-mono text-xs text-red-400 bg-slate-950 rounded mt-1">
                            {event.stderr}
                          </pre>
                        </div>
                      )}
                      {event.exit_code !== undefined && (
                        <div className="mt-2 text-xs text-slate-500">
                          Exit Code: <span className={event.exit_code === 0 ? "text-emerald-400" : "text-red-400"}>{event.exit_code}</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <div key={idx} className="flex items-center gap-3 text-slate-400 bg-slate-900/50 border border-slate-800 p-3 rounded-lg ml-10">
                    <span className="text-xs font-mono truncate">Result: {event.status || 'Success'}</span>
                  </div>
                );
              }
              if (event.type === 'error') {
                return (
                  <div key={idx} className="flex items-center gap-3 text-red-400 bg-red-950/20 border border-red-900/30 p-3 rounded-lg">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">Error: {event.error}</span>
                  </div>
                );
              }
              return null;
            })}
            {isRunning && (
              <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                Agent is thinking...
              </div>
            )}
            <div ref={endOfEventsRef} />
          </div>

          {/* Bottom: Final Answer */}
          {finalAnswer && (
            <div className="mt-8 pt-8 border-t border-slate-800">
              <div className="text-sm font-semibold uppercase tracking-wider text-amber-500 mb-4">
                Final Answer
              </div>
              <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
                <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200">
                  {finalAnswer}
                </div>

                {sources && sources.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-800">
                    <button 
                      onClick={() => setSourcesOpen(!sourcesOpen)}
                      className="flex items-center text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      {sourcesOpen ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                      Sources ({sources.length})
                    </button>
                    
                    {sourcesOpen && (
                      <div className="mt-4 space-y-3">
                        {sources.map((source, idx) => (
                          <div key={idx} className="bg-slate-950/50 rounded border border-slate-800 overflow-hidden">
                            <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                              <div className="flex items-center text-xs text-slate-300 font-medium truncate">
                                <FileText className="w-3 h-3 mr-1.5 text-emerald-500" />
                                <span className="truncate">{source.filename}</span>
                                {source.metadata && (
                                  <>
                                    <span className="mx-2 text-slate-600">•</span>
                                    <span className="text-slate-400 font-mono">{source.metadata}</span>
                                  </>
                                )}
                              </div>
                              {source.score !== undefined && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700 font-mono">
                                  {(source.score * 100).toFixed(1)}%
                                </span>
                              )}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Agents;
