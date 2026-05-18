import React from 'react';

interface KPIcardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  status?: 'green' | 'red' | 'blue' | 'yellow';
}

const statusColors = {
  green: 'bg-green-500 dark:bg-green-400',
  red: 'bg-red-500 dark:bg-red-400',
  blue: 'bg-blue-500 dark:bg-blue-400',
  yellow: 'bg-yellow-500 dark:bg-yellow-400',
};

const KPIcard: React.FC<KPIcardProps> = ({ title, value, unit, trend, status }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{value}</span>
            {unit && <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>}
          </div>
        </div>
        {status && (
          <div className={`h-3 w-3 rounded-full ${statusColors[status]} flex-shrink-0 mt-1`} aria-hidden="true" />
        )}
      </div>
      
      {trend && (
        <div className="mt-3 flex items-center text-xs font-medium">
          <span className={trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
          <span className="text-gray-500 dark:text-gray-400 ml-1">vs last period</span>
        </div>
      )}
    </div>
  );
};

export default KPIcard;
