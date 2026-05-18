import React from 'react';

interface ModelCardProps {
  name: string;
  version: string;
  status: 'active' | 'inactive' | 'training';
  health: number; // percentage
  lastUpdated: string;
}

const statusColors = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  training: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

const ModelCard: React.FC<ModelCardProps> = ({ name, version, status, health, lastUpdated }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Version {version}</p>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500 dark:text-gray-400">Model Health</span>
            <span className="font-medium text-gray-900 dark:text-white">{health}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${health}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
          <span>Last updated</span>
          <span>{lastUpdated}</span>
        </div>
      </div>
    </div>
  );
};

export default ModelCard;
