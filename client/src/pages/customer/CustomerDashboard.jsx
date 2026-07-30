import { useState } from 'react';
import RentalList from './RentalList';
import CheckInOutForm from './CheckInOutForm';

export default function CustomerDashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-cat-bg p-8 text-white">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-extrabold text-cat-yellow mb-8">Customer Dashboard</h1>
        <CheckInOutForm onActionComplete={handleRefresh} />
        <RentalList refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
