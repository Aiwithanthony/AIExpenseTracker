import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from '../components/AppText';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import {
  UsersThree,
  ChartBar,
  Export,
  Microphone,
  Receipt,
  Robot,
  MapPin,
  Trophy,
  Lock,
  CheckCircle,
  Star,
} from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import AnimatedPressable from '../components/AnimatedPressable';

const BENTO_RADIUS = 18;

const PREMIUM_FEATURES = [
  { Icon: UsersThree, name: 'Shared Expense Groups', premium: true },
  { Icon: ChartBar, name: 'Advanced Statistics', premium: true },
  { Icon: Export, name: 'Export to CSV/JSON', premium: false },
  { Icon: Microphone, name: 'Voice Input', premium: false },
  { Icon: Receipt, name: 'Receipt Scanning', premium: true },
  { Icon: Robot, name: 'AI Chat Assistant', premium: true },
  { Icon: MapPin, name: 'Location Tracking', premium: true },
  { Icon: Trophy, name: 'Savings Challenges', premium: false },
];

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  tier: string;
  expiresAt: string | null;
}

export default function SubscriptionsScreen() {
  const { colors, isDark } = useTheme();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await api.getSubscriptionStatus();
      setStatus(data);
    } catch (error: any) {
      setStatus({ hasActiveSubscription: false, tier: 'free', expiresAt: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const isFree = !status?.hasActiveSubscription && status?.tier !== 'premium';
  const isPremiumActive = status?.hasActiveSubscription && status?.tier === 'premium';
  const isPremiumCanceled = !status?.hasActiveSubscription && status?.tier === 'premium';

  const handleUpgrade = async () => {
    setActionLoading(true);
    try {
      // Open Stripe hosted Checkout in an in-app browser. Premium is activated
      // server-side by the webhook; we re-check status when the browser closes.
      const { url } = await api.createStripeCheckout();
      await WebBrowser.openBrowserAsync(url);
      await loadStatus();
    } catch (error: any) {
      const message: string = error?.message || '';
      if (message.toLowerCase().includes('not configured')) {
        Alert.alert(
          'Payments Unavailable',
          'Premium checkout is not configured yet. Please try again later.',
        );
      } else {
        Alert.alert('Error', message || 'Could not start checkout. Please try again.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your Premium subscription? You will retain access until the end of your billing period.',
      [
        { text: 'Keep Premium', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.cancelSubscription();
              await loadStatus();
              Alert.alert('Subscription Canceled', 'Your premium access will continue until the end of your billing period.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel subscription');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleReactivate = async () => {
    setActionLoading(true);
    try {
      await api.reactivateSubscription();
      await loadStatus();
      Alert.alert('Welcome Back!', 'Your Premium subscription has been reactivated.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reactivate subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const cardBg = colors.card;
  const inputBg = colors.inputBg;
  const borderColor = colors.border;
  const separatorColor = colors.border;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)}>
          <View style={[styles.header, { backgroundColor: colors.background }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Star size={26} color={colors.primary} weight="fill" />
              <Text style={[styles.headerTitle, { color: colors.text }]}>Subscription</Text>
            </View>
          </View>
        </Animated.View>

        {loading ? (
          <View style={styles.loadingWrapper}>
            <GlassCard style={styles.loadingCard} tint={isDark ? 'dark' : 'light'}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading plan...</Text>
            </GlassCard>
          </View>
        ) : (
          <>
            {/* Current Plan Card */}
            <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.sectionWrapper}>
              <GlassCard style={styles.planCard} tint={isDark ? 'dark' : 'light'}>
                <View style={styles.planHeader}>
                  <Text style={[styles.planLabel, { color: colors.textSecondary }]}>CURRENT PLAN</Text>
                  {isFree ? (
                    <View style={[styles.tierBadge, styles.freeBadge]}>
                      <Text style={styles.freeBadgeText}>FREE</Text>
                    </View>
                  ) : (
                    <View
                      style={[styles.tierBadge, { backgroundColor: colors.primary }]}
                    >
                      <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                    </View>
                  )}
                </View>

                {!isFree && (
                  <>
                    <View style={styles.planRow}>
                      <Text style={[styles.planRowLabel, { color: colors.textSecondary }]}>Status</Text>
                      <Text style={[styles.planRowValue, { color: isPremiumActive ? colors.success : '#FF9500' }]}>
                        {isPremiumActive ? 'Active' : 'Canceled'}
                      </Text>
                    </View>
                    <View style={styles.planRow}>
                      <Text style={[styles.planRowLabel, { color: colors.textSecondary }]}>
                        {isPremiumActive ? 'Renews' : 'Access Until'}
                      </Text>
                      <Text style={[styles.planRowValue, { color: colors.text }]}>
                        {formatDate(status?.expiresAt ?? null)}
                      </Text>
                    </View>
                  </>
                )}
              </GlassCard>
            </Animated.View>

            {/* Premium Features */}
            <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.sectionWrapper}>
              <GlassCard style={styles.featuresCard} tint={isDark ? 'dark' : 'light'}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>FEATURES</Text>
                {PREMIUM_FEATURES.map((feature, index) => (
                  <View key={feature.name}>
                    {index > 0 && <View style={[styles.featureSeparator, { backgroundColor: separatorColor }]} />}
                    <View style={styles.featureRow}>
                      <View style={styles.featureInfo}>
                        <View style={{ marginRight: 12 }}>
                          <feature.Icon size={22} color={colors.primary} weight="duotone" />
                        </View>
                        <Text style={[styles.featureName, { color: colors.text }]}>{feature.name}</Text>
                      </View>
                      {feature.premium && isFree ? (
                        <Lock size={18} color={colors.textTertiary} weight="duotone" />
                      ) : (
                        <CheckCircle size={18} color={colors.success} weight="duotone" />
                      )}
                    </View>
                  </View>
                ))}
              </GlassCard>
            </Animated.View>

            {/* Action Button */}
            <Animated.View entering={FadeInDown.duration(500).delay(300)} style={[styles.sectionWrapper, { marginBottom: 40 }]}>
              {isFree && (
                <AnimatedPressable onPress={handleUpgrade} disabled={actionLoading} scaleValue={0.97}>
                  <View
                    style={[styles.actionButton, { backgroundColor: colors.primary }, actionLoading && { opacity: 0.6 }]}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Star size={20} color="#FFFFFF" weight="fill" />
                        <Text style={styles.actionButtonText}>Upgrade to Premium</Text>
                      </View>
                    )}
                  </View>
                </AnimatedPressable>
              )}

              {isPremiumActive && (
                <AnimatedPressable onPress={handleCancel} disabled={actionLoading} scaleValue={0.97}>
                  <View
                    style={[
                      styles.cancelButton,
                      {
                        backgroundColor: cardBg,
                        borderColor: 'rgba(255, 59, 48, 0.3)',
                      },
                      actionLoading && { opacity: 0.6 },
                    ]}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#FF3B30" />
                    ) : (
                      <Text style={[styles.cancelButtonText, { color: colors.error }]}>Cancel Subscription</Text>
                    )}
                  </View>
                </AnimatedPressable>
              )}

              {isPremiumCanceled && (
                <AnimatedPressable onPress={handleReactivate} disabled={actionLoading} scaleValue={0.97}>
                  <View
                    style={[styles.actionButton, { backgroundColor: colors.primary }, actionLoading && { opacity: 0.6 }]}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.actionButtonText}>Reactivate Subscription</Text>
                    )}
                  </View>
                </AnimatedPressable>
              )}
            </Animated.View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  loadingWrapper: {
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  loadingCard: {
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionWrapper: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  planCard: {
    padding: 20,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  tierBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  freeBadge: {
    backgroundColor: 'rgba(142, 142, 147, 0.3)',
  },
  freeBadgeText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
  },
  planRowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  planRowValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  featuresCard: {
    padding: 16,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  featureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  featureEmoji: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  featureName: {
    fontSize: 15,
    fontWeight: '500',
  },
  featureIndicator: {
    fontSize: 18,
  },
  featureSeparator: {
    height: StyleSheet.hairlineWidth,
  },
  actionButton: {
    borderRadius: BENTO_RADIUS,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  cancelButton: {
    borderRadius: BENTO_RADIUS,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
});
