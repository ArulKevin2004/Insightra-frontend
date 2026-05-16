import React from 'react';

const Models: React.FC = () => {
  const models = [
    { name: 'XGBoost v2.1', status: 'Active', accuracy: '94.2%', drift: 'Low' },
    { name: 'Random Forest v1.0', status: 'Shadow', accuracy: '92.5%', drift: 'Low' },
    { name: 'LSTM v0.5', status: 'Retired', accuracy: '89.1%', drift: 'High' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold">Model Registry</h3>
        </div>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {models.map((model) => (
            <li key={model.name} className="px-6 py-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">{model.name}</p>
                <div className="flex space-x-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    model.status === 'Active' ? 'bg-green-100 text-green-800' :
                    model.status === 'Shadow' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {model.status}
                  </span>
                  <span className="text-xs text-gray-500">Drift: {model.drift}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{model.accuracy}</p>
                <p className="text-xs text-gray-500">Accuracy</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Models;
