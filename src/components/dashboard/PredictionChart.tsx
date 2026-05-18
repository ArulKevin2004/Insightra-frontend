import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import yahooData from '../../data/yahooData.json';

const PredictionChart: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-96">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Traffic Forecast</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Predicted vs Actual Traffic (Yahoo Dataset)</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <span className="h-3 w-3 bg-blue-500 rounded-full mr-2"></span>
            Actual
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <span className="h-3 w-3 bg-green-500 rounded-full mr-2"></span>
            Predicted
          </div>
        </div>
      </div>
      <div className="w-full h-[calc(100%-3rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={yahooData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#9CA3AF" opacity={0.2} />
            <XAxis
              dataKey="time"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value.toFixed(2)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                borderColor: '#374151',
                borderRadius: '0.5rem',
                color: '#F9FAFB',
              }}
              labelStyle={{ color: '#9CA3AF' }}
              itemStyle={{ color: '#F9FAFB' }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0, fill: '#3B82F6' }}
              name="Actual"
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#10B981"
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0, fill: '#10B981' }}
              name="Predicted"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PredictionChart;
