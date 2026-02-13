import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// Note: This file must be imported early in the app lifecycle to register the task
// Import it in App.tsx or index.ts

const LOCATION_TASK_NAME = 'background-location-task';
const LOCATION_ENTRY_KEY = 'location_entry_';
let foregroundSubscription: Location.LocationSubscription | null = null;

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface LocationEntry {
  latitude: number;
  longitude: number;
  timestamp: Date;
  ruleId?: string;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if location is within any active rule
 */
async function checkLocationRules(
  latitude: number,
  longitude: number,
): Promise<{ ruleId?: string; locationType?: string } | null> {
  try {
    // Get auth token for API calls
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      console.warn('No auth token - cannot check location rules');
      return null;
    }

    const rules = await api.getLocationRules();
    
    for (const rule of rules) {
      if (!rule.isActive) continue;

      const distance = calculateDistance(
        rule.latitude,
        rule.longitude,
        latitude,
        longitude,
      );

      if (distance <= rule.radius) {
        return {
          ruleId: rule.id,
          locationType: rule.locationType,
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error checking location rules:', error);
    return null;
  }
}

/**
 * Store location entry when entering a geofence
 */
async function storeLocationEntry(
  latitude: number,
  longitude: number,
  ruleId: string,
): Promise<void> {
  try {
    const entry: LocationEntry = {
      latitude,
      longitude,
      timestamp: new Date(),
      ruleId,
    };
    await AsyncStorage.setItem(
      `${LOCATION_ENTRY_KEY}${ruleId}`,
      JSON.stringify(entry),
    );
    
    // Also send to backend (if authenticated)
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        await api.trackLocationEntry({
          latitude,
          longitude,
        });
      }
    } catch (apiError) {
      // Don't fail if API call fails - we still have local storage
      console.warn('Failed to track location entry in backend:', apiError);
    }
  } catch (error) {
    console.error('Error storing location entry:', error);
  }
}

/**
 * Check if user exited a geofence and send notification if needed
 */
async function checkLocationExit(
  latitude: number,
  longitude: number,
): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const entryKeys = allKeys.filter(key => key.startsWith(LOCATION_ENTRY_KEY));

    for (const key of entryKeys) {
      const entryData = await AsyncStorage.getItem(key);
      if (!entryData) continue;

      const entry: LocationEntry = JSON.parse(entryData);
      const ruleId = entry.ruleId;
      
      if (!ruleId) continue;

      // Get auth token for API calls
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        // If no token, we can't check rules, but we can still check exit based on stored entry
        // For now, skip this entry
        continue;
      }

      // Get the rule to check radius
      const rules = await api.getLocationRules();
      const rule = rules.find(r => r.id === ruleId);
      
      if (!rule) {
        await AsyncStorage.removeItem(key);
        continue;
      }

      const distance = calculateDistance(
        rule.latitude,
        rule.longitude,
        latitude,
        longitude,
      );

      // If outside the radius, user has exited
      if (distance > rule.radius) {
        const exitTime = new Date();
        const timeSpent = (exitTime.getTime() - new Date(entry.timestamp).getTime()) / (1000 * 60); // minutes

        // Check if user spent enough time
        if (timeSpent >= rule.minTimeSpent) {
          // Send notification
          await sendExpenseReminderNotification(rule.name || rule.locationType, timeSpent);
          
          // Track exit in backend (if authenticated)
          try {
            const token = await AsyncStorage.getItem('auth_token');
            if (token) {
              await api.trackLocationExit({
                latitude,
                longitude,
                entryTime: entry.timestamp,
              });
            }
          } catch (apiError) {
            // Don't fail if API call fails - notification was sent
            console.warn('Failed to track location exit in backend:', apiError);
          }
        }

        // Remove entry
        await AsyncStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error('Error checking location exit:', error);
  }
}

/**
 * Common handler for location updates (used by background task + foreground watcher)
 */
async function handleLocationUpdate(latitude: number, longitude: number): Promise<void> {
  // Check if entering a geofence
  const ruleMatch = await checkLocationRules(latitude, longitude);

  if (ruleMatch && ruleMatch.ruleId) {
    // Check if we already have an entry for this rule
    const existingEntry = await AsyncStorage.getItem(
      `${LOCATION_ENTRY_KEY}${ruleMatch.ruleId}`,
    );

    if (!existingEntry) {
      // New entry - store it
      await storeLocationEntry(latitude, longitude, ruleMatch.ruleId);
    }
  } else {
    // Not in any geofence - check if we exited one
    await checkLocationExit(latitude, longitude);
  }
}

/**
 * Send expense reminder notification
 */
async function sendExpenseReminderNotification(
  locationName: string,
  timeSpent: number,
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Expense Reminder',
        body: `Don't forget to log your expenses from ${locationName}! You spent ${Math.round(timeSpent)} minutes there.`,
        data: { type: 'expense_reminder', locationName },
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

/**
 * Background location task
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as any;
    const location = locations[0];

    if (location) {
      const { latitude, longitude } = location.coords;
      await handleLocationUpdate(latitude, longitude);
    }
  }
});

/**
 * Start background location tracking
 */
export async function startBackgroundLocationTracking(): Promise<boolean> {
  try {
    // Request notification permissions first
    const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
    if (notificationStatus !== 'granted') {
      console.warn('Notification permission not granted - reminders will not work');
    }

    // Request background location permission
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.error('Foreground location permission not granted');
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.error('Background location permission not granted');
      return false;
    }

    // Check if task is already registered
    const isTaskDefined = TaskManager.isTaskDefined(LOCATION_TASK_NAME);
    if (!isTaskDefined) {
      console.error('Location task not defined');
      return false;
    }

    // Start location updates
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000, // Update every minute
      distanceInterval: 50, // Update every 50 meters
      foregroundService: {
        notificationTitle: 'Expense Tracker',
        notificationBody: 'Tracking your location for expense reminders',
      },
    });

    console.log('Background location tracking started');
    return true;
  } catch (error) {
    console.error('Error starting background location tracking:', error);
    return false;
  }
}

/**
 * Foreground fallback (Expo Go friendly): track while the app is open.
 */
export async function startForegroundLocationTracking(): Promise<boolean> {
  try {
    // Request notification permissions (local notifications)
    const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
    if (notificationStatus !== 'granted') {
      console.warn('Notification permission not granted - reminders will not work');
    }

    // Foreground location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('Foreground location permission not granted');
      return false;
    }

    if (foregroundSubscription) {
      return true; // already running
    }

    foregroundSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000,
        distanceInterval: 50,
      },
      async (loc) => {
        const { latitude, longitude } = loc.coords;
        await handleLocationUpdate(latitude, longitude);
      },
    );

    console.log('Foreground location tracking started');
    return true;
  } catch (error) {
    console.error('Error starting foreground location tracking:', error);
    return false;
  }
}

export async function stopForegroundLocationTracking(): Promise<void> {
  try {
    if (foregroundSubscription) {
      foregroundSubscription.remove();
      foregroundSubscription = null;
      console.log('Foreground location tracking stopped');
    }
  } catch (error) {
    console.error('Error stopping foreground location tracking:', error);
  }
}

export function isForegroundLocationTrackingActive(): boolean {
  return foregroundSubscription !== null;
}

/**
 * Stop background location tracking
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    const isTaskRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTaskRunning) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('Background location tracking stopped');
    }
  } catch (error) {
    console.error('Error stopping background location tracking:', error);
  }
}

/**
 * Check if background location tracking is active
 */
export async function isBackgroundLocationTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch (error) {
    return false;
  }
}

