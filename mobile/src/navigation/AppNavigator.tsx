import React, { useCallback, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Platform, Alert } from 'react-native';
import { Text } from '../components/AppText';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  createNavigationContainerRef,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Linking from 'expo-linking';
import { BlurView } from 'expo-blur';
import {
  House,
  CalendarBlank,
  UsersThree,
  GearSix,
  Microphone,
} from 'phosphor-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import AnimatedPressable from '../components/AnimatedPressable';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import EditExpenseScreen from '../screens/EditExpenseScreen';
import VoiceInputScreen from '../screens/VoiceInputScreen';
import ReceiptScanScreen from '../screens/ReceiptScanScreen';
import ChatScreen from '../screens/ChatScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import GeolocationScreen from '../screens/GeolocationScreen';
import GroupsScreen from '../screens/GroupsScreen';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import AddGroupExpenseScreen from '../screens/AddGroupExpenseScreen';
import SettleUpScreen from '../screens/SettleUpScreen';
import InviteMembersScreen from '../screens/InviteMembersScreen';
import GroupExpenseDetailScreen from '../screens/GroupExpenseDetailScreen';
import GroupActivityScreen from '../screens/GroupActivityScreen';
import GroupAnalyticsScreen from '../screens/GroupAnalyticsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Ref used to navigate imperatively after handling an incoming invite deep link.
export const navigationRef = createNavigationContainerRef();

/** Extract the invite token from expensetracker://invite/<token> or https://.../invite/<token>. */
function extractInviteToken(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const segments = [parsed.hostname, parsed.path]
      .filter(Boolean)
      .join('/')
      .split('/')
      .filter(Boolean);
    const idx = segments.indexOf('invite');
    if (idx >= 0 && segments[idx + 1]) {
      return decodeURIComponent(segments[idx + 1]);
    }
    return null;
  } catch {
    return null;
  }
}

/** Placeholder screen for the center tab slot — never actually shown. */
function VoiceTabPlaceholder() {
  return null;
}

/**
 * Floating center action button (raised accent circle) that opens the Voice
 * input screen directly instead of switching tabs. navigate('VoiceInput')
 * bubbles from the tab navigator up to the parent stack.
 */
function VoiceTabButton() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start' }}>
      <AnimatedPressable
        onPress={() => navigation.navigate('VoiceInput')}
        scaleValue={0.9}
      >
        <View
          style={{
            marginTop: -24,
            width: 62,
            height: 62,
            borderRadius: 31,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            ...Platform.select({
              ios: {
                shadowColor: '#5E4A36',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.3,
                shadowRadius: 9,
              },
              android: { elevation: 8 },
            }),
          }}
          accessibilityRole="button"
          accessibilityLabel="Add expense by voice"
        >
          <Microphone size={28} color="#fefefe" weight="fill" />
        </View>
      </AnimatedPressable>
    </View>
  );
}

function MainTabs() {
  const { isDark, colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={90}
            tint={isDark ? 'dark' : 'light'}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderTopWidth: 0.5,
              borderTopColor: colors.border,
            }}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Nunito_600SemiBold',
          letterSpacing: 0.1,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <House size={24} color={color} weight="duotone" />
          ),
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarScreen}
        options={{
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color }) => (
            <CalendarBlank size={24} color={color} weight="duotone" />
          ),
        }}
      />
      <Tab.Screen
        name="VoiceTab"
        component={VoiceTabPlaceholder}
        options={{
          tabBarLabel: () => null,
          tabBarButton: () => <VoiceTabButton />,
        }}
      />
      <Tab.Screen
        name="GroupsTab"
        component={GroupsScreen}
        options={{
          tabBarLabel: 'Groups',
          tabBarIcon: ({ color }) => (
            <UsersThree size={24} color={color} weight="duotone" />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => (
            <GearSix size={24} color={color} weight="duotone" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { isDark, colors } = useTheme();

  // Invite deep links: when a token arrives, accept it (if signed in) and open
  // the group. If signed out, remember it and process right after login.
  const pendingInviteRef = useRef<string | null>(null);

  const acceptInvite = useCallback(async (token: string) => {
    try {
      const group: any = await api.acceptGroupInvite(token);
      if (navigationRef.isReady() && group?.id) {
        (navigationRef as any).navigate('GroupDetail', { groupId: group.id });
      }
      Alert.alert('Joined', 'You have joined the group.');
    } catch (error: any) {
      Alert.alert('Invite', error?.message || 'Could not accept this invite.');
    }
  }, []);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      const token = extractInviteToken(url);
      if (!token) return;
      if (user) {
        acceptInvite(token);
      } else {
        pendingInviteRef.current = token;
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => sub.remove();
  }, [user, acceptInvite]);

  useEffect(() => {
    if (user && pendingInviteRef.current) {
      const token = pendingInviteRef.current;
      pendingInviteRef.current = null;
      acceptInvite(token);
    }
  }, [user, acceptInvite]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontFamily: 'Nunito_600SemiBold',
            color: colors.text,
          },
          headerShadowVisible: false,
        }}
      >
        {!user ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Expenses"
              component={ExpensesScreen}
              options={{ title: 'Transactions' }}
            />
            <Stack.Screen
              name="AddExpense"
              component={AddExpenseScreen}
              options={{ title: 'Add Transaction' }}
            />
            <Stack.Screen
              name="EditExpense"
              component={EditExpenseScreen}
              options={{ title: 'Edit Expense' }}
            />
            <Stack.Screen
              name="VoiceInput"
              component={VoiceInputScreen}
              options={{ title: 'Voice Input' }}
            />
            <Stack.Screen
              name="ReceiptScan"
              component={ReceiptScanScreen}
              options={{ title: 'Scan Receipt' }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ title: 'AI Assistant' }}
            />
            <Stack.Screen
              name="Statistics"
              component={StatisticsScreen}
              options={{ title: 'Statistics' }}
            />
            <Stack.Screen
              name="Geolocation"
              component={GeolocationScreen}
              options={{ title: 'Geolocation' }}
            />
            <Stack.Screen
              name="Subscriptions"
              component={SubscriptionsScreen}
              options={{ title: 'Subscription' }}
            />
            <Stack.Screen
              name="GroupDetail"
              component={GroupDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddGroupExpense"
              component={AddGroupExpenseScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SettleUp"
              component={SettleUpScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="InviteMembers"
              component={InviteMembersScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="GroupExpenseDetail"
              component={GroupExpenseDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="GroupActivity"
              component={GroupActivityScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="GroupAnalytics"
              component={GroupAnalyticsScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
