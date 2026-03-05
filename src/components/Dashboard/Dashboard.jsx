import React from 'react';
import AppHeader from '../Shared/AppHeader';

const Dashboard = ({ user }) => {
  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col overflow-hidden">
      
      <AppHeader
        title="Dashboard"
        isDashboard={true}
        onDashboard={() => {}}
        userEmail={user?.email}
      />
      
      <div className="flex-1 w-full overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 mb-4">
            🏀 Welcome to StatStream!
          </h2>
          <p className="text-gray-600 mb-8">
            Dashboard is working! Next we'll add teams and games.
          </p>
          
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
            <h3 className="text-xl font-bold mb-2">✅ What's Working:</h3>
            <ul className="space-y-2 text-gray-700">
              <li>✅ Authentication</li>
              <li>✅ Supabase connection</li>
              <li>✅ AppHeader with logo</li>
              <li>✅ Dashboard layout</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;