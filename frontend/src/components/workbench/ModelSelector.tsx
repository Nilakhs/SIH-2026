import React from 'react';
import type { AvailableModel, ModelStatus } from '../../types';

interface ModelSelectorProps {
  models: AvailableModel[];
  selectedModel: string;
  onSelect: (model: string) => void;
  status: ModelStatus | null;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ models, selectedModel, onSelect, status }) => {
  return (
    <div className="flex items-center justify-between w-full p-3 bg-slate-900 border-b border-slate-800">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status?.available ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium text-slate-300">
            {status?.available ? 'Ollama Connected' : 'Ollama Offline'}
          </span>
        </div>
        
        {!status?.available && (
          <span className="text-xs text-amber-500 bg-amber-900/20 px-2 py-1 rounded">
            Please ensure Ollama is running locally.
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400">Model:</span>
        {models.length === 0 ? (
          <span className="text-sm text-slate-500 italic">No models installed</span>
        ) : (
          <select 
            value={selectedModel} 
            onChange={(e) => onSelect(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-amber-500/50"
          >
            {models.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name} {m.size ? `(${m.size})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};

export default ModelSelector;
