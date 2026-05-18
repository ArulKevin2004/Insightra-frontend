import React from 'react';
import KPIcard from '../components/dashboard/KPIcard';
import PredictionChart from '../components/dashboard/PredictionChart';
import StatusWidget from '../components/dashboard/StatusWidget';
import ModelCard from '../components/dashboard/ModelCard';

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prediction Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Monitor model performance and traffic forecasts.</p>
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIcard
          title="Current Prediction"
          value="1,450"
          unit="TPS"
          trend={{ value: '12%', isPositive: true }}
          status="green"
        />
        <KPIcard
          title="Actual Traffic"
          value="1,520"
          unit="TPS"
          trend={{ value: '8%', isPositive: true }}
          status="green"
        />
        <KPIcard
          title="Forecast Accuracy"
          value="95.4"
          unit="%"
          trend={{ value: '0.5%', isPositive: true }}
          status="green"
        />
        <KPIcard
          title="Running Model"
          value="SARIMA_v1"
          status="blue"
        />
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PredictionChart />
        </div>
        
        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <StatusWidget
            title="System Status"
            items={[
              { label: 'API Gateway', value: 'Operational', status: 'success' },
              { label: 'Inference Engine', value: 'Operational', status: 'success' },
              { label: 'Data Pipeline', value: 'Operational', status: 'success' },
              { label: 'Latency', value: '24ms', status: 'success' },
            ]}
          />
          
          <StatusWidget
            title="Prediction Status"
            items={[
              { label: 'Last Prediction', value: '10:45:00', status: 'info' },
              { label: 'Next Run', value: '10:50:00', status: 'info' },
              { label: 'Drift Status', value: 'Stable', status: 'success' },
              { label: 'Anomalies Detected', value: '0', status: 'success' },
            ]}
          />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ModelCard
          name="SARIMA"
          version="v1.0.4"
          status="active"
          health={98}
          lastUpdated="2 hours ago"
        />
        <ModelCard
          name="XGBoost"
          version="v2.1.0"
          status="training"
          health={85}
          lastUpdated="In progress"
        />
        <ModelCard
          name="LSTM"
          version="v0.9.2"
          status="inactive"
          health={0}
          lastUpdated="3 days ago"
        />
      </div>
    </div>
  );
};

export default Dashboard;
