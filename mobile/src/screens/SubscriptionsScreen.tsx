import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import AnimatedPressable from '../components/AnimatedPressable';

const GLASS = {
  borderColor: 'rgba(255, 255, 255, 0.2)',
  bgLight: 'rgba(255, 255, 255, 0.08)',
  blurIntensity: 60,
  borderRadius: 16,
};
const ACCENT = '#6A0DAD';
const ACCENT_LIGHT = '#8B2FC9';

const PREMIUM_FEATURES = [
  { emoji: '\uD83D\uDC65', name: 'Shared Expense Groups', premium: true },
  { emoji: '\uD83D\uDCCA', name: 'Advanced Statistics', premium: true },
  { emoji: '\uD83D\uDCE4', name: 'Export to CSV/JSON', premium: false },
  { emoji: '\uD83C\uDF99\uFE0F', name: 'Voice Input', premium: false },
  { emoji: '\uD83E\uDDFE', name: 'Receipt Scanning', premium: true },
  { emoji: '\uD83E\uDD16', name: 'AI Chat Assistant', premium: true },
  { emoji: '\uD83D\uDCCD', name: 'Location Tracking', premium: true },
  { emoji: '\uD83C\uDFC6', name: 'Savings Challenges', premium: false },
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

  const handleUpgrade = () => {
    Alert.alert(
      'Coming Soon',
      'Premium subscriptions will be available soon through the App Store and Google Play. Stay tuned!',
      [{ text: 'OK' }],
    );
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

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D0D' : colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)}>
          <LinearGradient
            colors={['#1A0030', '#2D004F', ACCENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>{'\u2B50'} Subscription</Text>
          </LinearGradient>
        </Animated.View>

        {loading ? (
          <View style={styles.loadingWrapper}>
            <GlassCard style={styles.loadingCard} tint={isDark ? 'dark' : 'light'}>
              <ActivityIndicator size="large" color={ACCENT} />
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
                    <LinearGradient
                      colors={[ACCENT, ACCENT_LIGHT]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.tierBadge}
                    >
                      <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                    </LinearGradient>
                  )}
                </View>

                {!isFree && (
                  <>
                    <View style={styles.planRow}>
                      <Text style={[styles.planRowLabel, { color: colors.textSecondary }]}>Status</Text>
                      <Text style={[styles.planRowValue, { color: isPremiumActive ? '#34C759' : '#FF9500' }]}>
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
                <Text style={styles.sectionTitle}>FEATURES</Text>
                {PREMIUM_FEATURES.map((feature, index) => (
                  <View key={feature.name}>
                    {index > 0 && <View style={styles.featureSeparator} />}
                    <View style={styles.featureRow}>
                      <View style={styles.featureInfo}>
                        <Text style={styles.featureEmoji}>{feature.emoji}</Text>
                        <Text style={[styles.featureName, { color: colors.text }]}>{feature.name}</Text>
                      </View>
                      <Text style={styles.featureIndicator}>
                        {feature.premium
                          ? (isFree ? '\uD83D\uDD12' : '\u2705')
                          : '\u2705'}
                      </Text>
                    </View>
                  </View>
                ))}
              </GlassCard>
            </Animated.View>

            {/* Action Button */}
            <Animated.View entering={FadeInDown.duration(500).delay(300)} style={[styles.sectionWrapper, { marginBottom: 40 }]}>
              {isFree && (
                <AnimatedPressable onPress={handleUpgrade} scaleValue={0.97}>
                  <LinearGradient
                    colors={[ACCENT, ACCENT_LIGHT]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionButtonText}>{'\u2B50'} Upgrade to Premium</Text>
                  </LinearGradient>
                </AnimatedPressable>
              )}

              {isPremiumActive && (
                <AnimatedPressable onPress={handleCancel} disabled={actionLoading} scaleValue={0.97}>
                  <BlurView
                    intensity={GLASS.blurIntensity}
                    tint={isDark ? 'dark' : 'light'}
                    style={[styles.cancelButton, actionLoading && { opacity: 0.6 }]}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#FF3B30" />
                    ) : (
                      <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
                    )}
                  </BlurView>
                </AnimatedPressable>
              )}

              {isPremiumCanceled && (
                <AnimatedPressable onPress={handleReactivate} disabled={actionLoading} scaleValue={0.97}>
                  <LinearGradient
                    colors={[ACCENT, ACCENT_LIGHT]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.actionButton, actionLoading && { opacity: 0.6 }]}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.actionButtonText}>Reactivate Subscription</Text>
                    )}
                  </LinearGradient>
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
    borderBottomLeftRadius: GLASS.borderRadius,
    borderBottomRightRadius: GLASS.borderRadius,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    color: ACCENT_LIGHT,
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
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionButton: {
    borderRadius: GLASS.borderRadius,
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
    borderRadius: GLASS.borderRadius,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    overflow: 'hidden',
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '700',
  },
});
