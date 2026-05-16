import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric Cards */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Model</p>
          <p className="text-2xl font-bold mt-1">XGBoost v2.1</p>
          <div className="mt-2 text-xs text-green-600 flex items-center">
            <span>Accuracy: 94.2%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Drift Status</p>
          <p className="text-2xl font-bold mt-1 text-green-600">Stable</p>
          <div className="mt-2 text-xs text-gray-500 flex items-center">
            <span>Last checked: 2 hours ago</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Requests</p>
          <p className="text-2xl font-bold mt-1">12,450</p>
          <div className="mt-2 text-xs text-blue-600 flex items-center">
            <span>+12% from last week</span>
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-96 flex flex-col items-center justify-center text-gray-500">
        <p className="text-lg font-medium">Concept Drift Over Time</p>
        <p className="text-sm">Chart placeholder - Integration with Chart.js or Recharts needed</p>
        <div className="w-full max-w-lg h-40 bg-gray-100 dark:bg-gray-700 mt-4 rounded-lg flex items-center justify-center">
          <span className="text-xs text-gray-400">Waveform Visualization</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
