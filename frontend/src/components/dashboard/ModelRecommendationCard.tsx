import React from 'react';
import { Lightbulb } from 'lucide-react';
import type { ModelRecommendation } from '../../types';

interface ModelRecommendationCardProps {
  recommendation: ModelRecommendation;
}

const ModelRecommendationCard: React.FC<ModelRecommendationCardProps> = ({ recommendation }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 col-span-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-slate-400">
          <Lightbulb className="w-5 h-5" />
          <h3 className="font-medium text-sm uppercase tracking-wider">Model Recommendations</h3>
        </div>
        <div className="px-3 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-amber-500 uppercase">
          Hardware Tier: {recommendation.tier}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700 text-xs uppercase tracking-wider text-slate-500">
              <th className="pb-3 px-4 font-medium">Role</th>
              <th className="pb-3 px-4 font-medium">Model</th>
              <th className="pb-3 px-4 font-medium">Size</th>
              <th className="pb-3 px-4 font-medium">Target Use Case</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {recommendation.recommended_models.map((model, idx) => (
              <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors">
                <td className="py-3 px-4 text-slate-300 font-medium">{model.role}</td>
                <td className="py-3 px-4 font-mono text-amber-400">{model.model}</td>
                <td className="py-3 px-4 text-slate-400">{model.size}</td>
                <td className="py-3 px-4 text-slate-400">{model.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 p-3 bg-blue-950/20 border border-blue-900/50 rounded flex items-center gap-2 text-blue-400 text-sm">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        Note: Models not yet installed. Install Ollama to begin.
      </div>
    </div>
  );
};

export default ModelRecommendationCard;
