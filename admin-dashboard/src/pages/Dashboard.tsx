import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, type Stats } from '../services/api';

const CARDS: { key: keyof Stats; label: string; prefix?: string }[] = [
  { key: 'totalUsers', label: 'Total Users' },
  { key: 'activeSubscribers', label: 'Active Subscribers' },
  { key: 'totalRevenue', label: 'Total Revenue', prefix: '$' },
  { key: 'expensesLogged', label: 'Expenses Logged' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          setError('Your account does not have admin access.');
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load stats.');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return <div className="text-gray-500">Loading…</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => {
          const value = stats?.[card.key] ?? 0;
          const display =
            card.key === 'totalRevenue'
              ? `${card.prefix ?? ''}${Number(value).toFixed(2)}`
              : String(value);
          return (
            <div key={card.key} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="text-2xl font-bold text-gray-900">{display}</div>
                <div className="mt-2 text-sm font-medium text-gray-500 truncate">
                  {card.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
