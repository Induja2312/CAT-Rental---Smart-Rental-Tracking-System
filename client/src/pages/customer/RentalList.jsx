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

  if (loading) return <div className="text-zinc-500 p-4 text-xs font-mono">Loading rentals...</div>;

  return (
    <div className="bg-white border border-zinc-200 p-5 rounded-md shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b border-zinc-200 pb-4">
        <h2 className="text-base font-bold text-zinc-900 uppercase tracking-wide">My Active Rentals</h2>
        <button
          onClick={downloadReport}
          className="bg-[#FFC500] hover:bg-[#e6b000] text-black font-extrabold text-xs uppercase tracking-wider px-4 min-h-[40px] rounded-md border-b-2 border-black/20 transition"
        >
          Download Report
        </button>
      </div>
      {rentals.length === 0 ? (
        <p className="text-zinc-500 text-xs font-mono">No active rentals.</p>
      ) : (
        <div className="space-y-3">
          {rentals.map(rental => {
            const isOverdue = rental.status === 'overdue';
            const dueSoon = !isOverdue && new Date(rental.checkOutDate) - new Date() < 24 * 60 * 60 * 1000 && rental.status === 'ongoing';

            return (
              <div key={rental._id} className="p-4 bg-zinc-50 border border-zinc-200 rounded-md flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm">
                    {rental.equipmentId?.type || 'Unknown'}{' '}
                    <span className="text-xs font-mono font-normal text-zinc-500">({rental.equipmentId?.equipmentId || 'N/A'})</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Check-in: {new Date(rental.checkInDate).toLocaleDateString()}</p>
                  {rental.status !== 'returned' && <p className="text-xs text-zinc-500">Expected Return: {new Date(rental.checkOutDate).toLocaleDateString()}</p>}
                  {rental.status === 'returned' && <p className="text-xs text-zinc-500">Returned On: {new Date(rental.actualReturnDate).toLocaleDateString()}</p>}
                </div>
                <div>
                  {isOverdue && <span className="px-2.5 py-0.5 bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5] text-[10px] font-bold rounded uppercase tracking-wider">OVERDUE</span>}
                  {dueSoon && <span className="px-2.5 py-0.5 bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] text-[10px] font-bold rounded uppercase tracking-wider">DUE SOON</span>}
                  {!isOverdue && !dueSoon && rental.status === 'ongoing' && <span className="px-2.5 py-0.5 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] text-[10px] font-bold rounded uppercase tracking-wider">ON TIME</span>}
                  {rental.status === 'returned' && <span className="px-2.5 py-0.5 bg-zinc-100 text-zinc-600 border border-zinc-300 text-[10px] font-bold rounded uppercase tracking-wider">RETURNED</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
