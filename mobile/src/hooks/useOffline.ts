import { useEffect, useState } from 'react';
import { subscribeOffline } from '../services/api';

/**
 * True while the app appears to be offline — i.e. the most recent API request
 * timed out or hit a network failure, and nothing has succeeded since. Driven
 * by the connectivity signal in services/api.ts.
 */
export function useOffline(): boolean {
  const [offline, setOffline] = useState(false);
  useEffect(() => subscribeOffline(setOffline), []);
  return offline;
}
