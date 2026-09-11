import React from 'react';
import { Activity } from 'lucide-react';
import type { ServiceInfo } from '../../types';

interface ServiceStatusCardProps {
  services: ServiceInfo[];
}

const ServiceStatusCard: React.FC<ServiceStatusCardProps> = ({ services }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6 text-slate-400">
        <Activity className="w-5 h-5" />
        <h3 className="font-medium text-sm uppercase tracking-wider">Local Services</h3>
      </div>
      
      <div className="grid gap-3">
        {services.map((service) => (
          <div key={service.name} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${service.status === 'running' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
              <span className="text-slate-200 font-medium">{service.name}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-xs uppercase tracking-wider font-bold ${service.status === 'running' ? 'text-emerald-500' : 'text-red-500'}`}>
                {service.status}
              </span>
              <span className="text-xs font-mono text-slate-500 mt-1">{service.endpoint}</span>
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <div className="text-slate-500 text-sm font-mono p-4 text-center">No services detected</div>
        )}
      </div>
    </div>
  );
};

export default ServiceStatusCard;
