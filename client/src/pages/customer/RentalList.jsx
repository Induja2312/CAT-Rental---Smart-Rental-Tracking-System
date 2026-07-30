import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function RentalList({ refreshTrigger }) {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRentals = async () => {
      try {
        const { data } = await api.get('/api/rentals/mine');
        setRentals(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRentals();
  }, [refreshTrigger]);

  const downloadReport = () => {
    const token = localStorage.getItem('token');
    const a = document.createElement('a');
    a.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/rentals/mine/report`;
    // Fetch as blob so we can attach the auth header
    fetch(a.href, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = 'rental-report.pdf';
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  if (loading) return <div className="text-white p-4">Loading rentals...</div>;

  return (
    <div className="bg-cat-surface border border-cat-border p-6 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-cat-yellow">My Active Rentals</h2>
        <button
          onClick={downloadReport}
          className="bg-cat-yellow text-cat-black font-bold px-4 py-2 rounded hover:bg-yellow-500 transition text-sm"
        >
          Download Report
        </button>
      </div>
      {rentals.length === 0 ? (
        <p className="text-gray-400">No active rentals.</p>
      ) : (
        <div className="space-y-4">
          {rentals.map(rental => {
            const isOverdue = rental.status === 'overdue';
            const dueSoon = !isOverdue && new Date(rental.checkOutDate) - new Date() < 24 * 60 * 60 * 1000 && rental.status === 'ongoing';
            
            return (
              <div key={rental._id} className="p-4 bg-cat-bg border border-cat-border rounded flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-white text-lg">{rental.equipmentId?.type || 'Unknown'} <span className="text-sm font-normal text-gray-400">({rental.equipmentId?.equipmentId || 'N/A'})</span></h3>
                  <p className="text-sm text-gray-400">Check-in: {new Date(rental.checkInDate).toLocaleDateString()}</p>
                  { rental.status !== 'returned' && <p className="text-sm text-gray-400">Expected Return: {new Date(rental.checkOutDate).toLocaleDateString()}</p> }
                  { rental.status === 'returned' && <p className="text-sm text-gray-400">Returned On: {new Date(rental.actualReturnDate).toLocaleDateString()}</p> }
                </div>
                <div>
                  {isOverdue && <span className="px-3 py-1 bg-cat-red text-white text-xs font-bold rounded-full">OVERDUE</span>}
                  {dueSoon && <span className="px-3 py-1 bg-cat-yellow text-cat-black text-xs font-bold rounded-full">DUE SOON</span>}
                  {!isOverdue && !dueSoon && rental.status === 'ongoing' && <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">ON TIME</span>}
                  {rental.status === 'returned' && <span className="px-3 py-1 bg-gray-600 text-white text-xs font-bold rounded-full">RETURNED</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
