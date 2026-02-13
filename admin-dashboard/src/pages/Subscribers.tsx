import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Subscribers() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    try {
      setError(null);
      const data = await api.getSubscribers();
      setSubscribers(data.subscribers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscribers');
      console.error('Error loading subscribers:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Subscribers</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {subscribers.map((sub) => (
            <li key={sub.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{sub.userEmail}</p>
                  <p className="text-sm text-gray-500">Tier: {sub.tier}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    sub.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {sub.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    Expires: {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {subscribers.length === 0 && !error && (
        <p className="text-gray-500 text-center py-8">No active subscribers</p>
      )}
    </div>
  );
}

