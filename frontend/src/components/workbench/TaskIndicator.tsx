import React from 'react';
import type { TaskClassification } from '../../types';

interface TaskIndicatorProps {
  classification: TaskClassification | null;
}

const getTaskColor = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('code') || t.includes('coding')) return 'bg-amber-900/40 text-amber-400 border-amber-800/50';
  if (t.includes('doc')) return 'bg-blue-900/40 text-blue-400 border-blue-800/50';
  if (t.includes('vision')) return 'bg-purple-900/40 text-purple-400 border-purple-800/50';
  if (t.includes('gen')) return 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50';
  return 'bg-slate-800 text-slate-300 border-slate-700';
};

const TaskIndicator: React.FC<TaskIndicatorProps> = ({ classification }) => {
  if (!classification) return null;

  return (
    <div className="flex justify-center w-full my-4 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-full shadow-sm max-w-3xl">
        <span className={`text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full border ${getTaskColor(classification.task_type)}`}>
          {classification.task_type === 'image_vision' ? 'IMAGE / VISION' : classification.task_type.toUpperCase().replace('_', ' ')}
        </span>
        <span className="text-xs text-slate-400 truncate max-w-md" title={classification.reason}>
          {classification.reason}
        </span>
        {classification.recommended_model && (
          <>
            <span className="text-slate-600 text-xs">•</span>
            <span className="text-xs font-mono text-slate-500">
              {classification.recommended_model}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default TaskIndicator;
