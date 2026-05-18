import React from 'react';

interface StatusItem {
  label: string;
  value: string;
  status?: 'success' | 'warning' | 'danger' | 'info';
}

interface StatusWidgetProps {
  title: string;
  items: StatusItem[];
}

const statusColors = {
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  danger: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
};

const StatusWidget: React.FC<StatusWidgetProps> = ({ title, items }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">{item.label}</span>
            <span className={`font-medium ${item.status ? statusColors[item.status] : 'text-gray-900 dark:text-white'}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatusWidget;
