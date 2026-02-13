import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  FadeInDown,
} from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import AnimatedPressable from '../components/AnimatedPressable';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 200;
const HEADER_MIN_HEIGHT = 120;

// Design system tokens from .interface-design/system.md
const GLASS = {
  borderColor: 'rgba(255, 255, 255, 0.2)',
  borderColorStrong: 'rgba(255, 255, 255, 0.3)',
  bgLight: 'rgba(255, 255, 255, 0.08)',
  bgMedium: 'rgba(255, 255, 255, 0.12)',
  bgDark: 'rgba(0, 0, 0, 0.2)',
  blurIntensity: 60,
  borderRadius: 16,
};

const ACCENT = '#6A0DAD';
const ACCENT_LIGHT = '#8B2FC9';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animated scroll value for parallax header
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // Parallax header animation: shrinks and fades on scroll
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
      [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
      'clamp'
    );
    return { height };
  });

  const greetingAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 60],
      [1, 0],
      'clamp'
    );
    const translateY = interpolate(
      scrollY.value,
      [0, 60],
      [0, -15],
      'clamp'
    );
    return { opacity, transform: [{ translateY }] };
  });

  const subtitleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 40],
      [1, 0],
      'clamp'
    );
    return { opacity };
  });

  // Reload stats when screen comes into focus (e.g., returning from AddExpenseScreen)
  useFocusEffect(
    React.useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    try {
      const data = await api.getExpenseStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  // Get time-appropriate greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Gradient colors based on theme
  const headerGradient = isDark
    ? ['#0D0221', '#1A0533', ACCENT] as const
    : ['#1A0533', '#2D1052', ACCENT_LIGHT] as const;

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.background }]}>
      {/* Animated Gradient Header */}
      <Animated.View style={[styles.headerWrapper, headerAnimatedStyle]}>
        <LinearGradient
          colors={headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
            <View style={styles.headerContent}>
              <View style={styles.headerTextBlock}>
                <Animated.Text style={[styles.greeting, greetingAnimatedStyle]}>
                  {getGreeting()},
                </Animated.Text>
                <Animated.Text style={[styles.userName, greetingAnimatedStyle]}>
                  {user?.name || 'User'}
                </Animated.Text>
                <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>
                  Track your expenses easily
                </Animated.Text>
              </View>

              {/* Settings button with glass effect */}
              <AnimatedPressable
                onPress={() => navigation.navigate('Settings')}
                scaleValue={0.9}
              >
                <BlurView
                  intensity={40}
                  tint="light"
                  style={styles.settingsButton}
                >
                  <Text style={styles.settingsIcon}>{'\u2699\uFE0F'}</Text>
                </BlurView>
              </AnimatedPressable>
            </View>
          </SafeAreaView>

          {/* Decorative gradient orbs for depth */}
          <View style={styles.orbContainer}>
            <View style={[styles.orb, styles.orbPrimary]} />
            <View style={[styles.orb, styles.orbSecondary]} />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Scrollable Content */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: HEADER_MAX_HEIGHT },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
            progressViewOffset={HEADER_MAX_HEIGHT}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Section */}
        {loading ? (
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.loadingContainer}
          >
            <GlassCard
              intensity={GLASS.blurIntensity}
              tint={isDark ? 'dark' : 'light'}
              style={styles.loadingCard}
            >
              <ActivityIndicator size="large" color={ACCENT} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading your finances...
              </Text>
            </GlassCard>
          </Animated.View>
        ) : stats ? (
          <Animated.View
            entering={FadeInDown.duration(500).delay(100)}
            style={styles.statsSection}
          >
            {/* Income & Expense Row */}
            <View style={styles.statsRow}>
              <GlassCard
                intensity={GLASS.blurIntensity}
                tint={isDark ? 'dark' : 'light'}
                onPress={() => navigation.navigate('AddExpense', { type: 'income' })}
                style={[styles.statCard, { backgroundColor: GLASS.bgLight }]}
              >
                <View style={styles.statIconRow}>
                  <View style={[styles.statIconBadge, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
                    <Text style={styles.statIconText}>{'\u2191'}</Text>
                  </View>
                </View>
                <Text style={[styles.statLabel, { color: colors.text, opacity: 1 }]}>
                  Income
                </Text>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  +{stats.totalIncome?.toFixed(2) || '0.00'}
                </Text>
                <Text style={[styles.statCurrency, { color: colors.textSecondary }]}>
                  {user?.currency || 'USD'}
                </Text>
              </GlassCard>

              <GlassCard
                intensity={GLASS.blurIntensity}
                tint={isDark ? 'dark' : 'light'}
                onPress={() => navigation.navigate('AddExpense', { type: 'expense' })}
                style={[styles.statCard, { backgroundColor: GLASS.bgLight }]}
              >
                <View style={styles.statIconRow}>
                  <View style={[styles.statIconBadge, { backgroundColor: 'rgba(255, 59, 48, 0.15)' }]}>
                    <Text style={styles.statIconText}>{'\u2193'}</Text>
                  </View>
                </View>
                <Text style={[styles.statLabel, { color: colors.text, opacity: 1 }]}>
                  Expenses
                </Text>
                <Text style={[styles.statValue, { color: colors.error }]}>
                  -{stats.totalExpenses?.toFixed(2) || '0.00'}
                </Text>
                <Text style={[styles.statCurrency, { color: colors.textSecondary }]}>
                  {user?.currency || 'USD'}
                </Text>
              </GlassCard>
            </View>

            {/* Net Amount Card */}
            <GlassCard
              intensity={GLASS.blurIntensity}
              tint={isDark ? 'dark' : 'light'}
              onPress={() => navigation.navigate('Expenses')}
              style={[
                styles.netCard,
                {
                  backgroundColor: GLASS.bgMedium,
                  borderColor: (stats.netAmount || 0) >= 0
                    ? 'rgba(52, 199, 89, 0.3)'
                    : 'rgba(255, 59, 48, 0.3)',
                },
              ]}
            >
              <View style={styles.netCardInner}>
                <View>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Net Balance
                  </Text>
                  <Text
                    style={[
                      styles.netValue,
                      {
                        color: (stats.netAmount || 0) >= 0
                          ? colors.success
                          : colors.error,
                      },
                    ]}
                  >
                    {(stats.netAmount || 0) >= 0 ? '+' : ''}
                    {stats.netAmount?.toFixed(2) || '0.00'}{' '}
                    {user?.currency || 'USD'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.netBadge,
                    {
                      backgroundColor: (stats.netAmount || 0) >= 0
                        ? 'rgba(52, 199, 89, 0.15)'
                        : 'rgba(255, 59, 48, 0.15)',
                    },
                  ]}
                >
                  <Text style={styles.netBadgeText}>
                    {(stats.netAmount || 0) >= 0 ? '\u25B2' : '\u25BC'}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>
        ) : (
          /* Empty state when no stats */
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.statsSection}
          >
            <GlassCard
              intensity={GLASS.blurIntensity}
              tint={isDark ? 'dark' : 'light'}
              style={[styles.emptyCard, { backgroundColor: GLASS.bgLight }]}
            >
              <Text style={styles.emptyIcon}>{'\uD83D\uDCB0'}</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No transactions yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Add your first transaction to see your stats
              </Text>
            </GlassCard>
          </Animated.View>
        )}

        {/* Primary Action Buttons */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(200)}
          style={styles.actionsSection}
        >
          {/* Add Transaction - Primary CTA */}
          <AnimatedPressable
            onPress={() => navigation.navigate('AddExpense')}
            scaleValue={0.97}
          >
            <LinearGradient
              colors={[ACCENT, ACCENT_LIGHT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryActionButton}
            >
              <Text style={styles.primaryActionIcon}>+</Text>
              <Text style={styles.primaryActionText}>Add Transaction</Text>
            </LinearGradient>
          </AnimatedPressable>

          {/* View Transactions - Secondary CTA */}
          <AnimatedPressable
            onPress={() => navigation.navigate('Expenses')}
            scaleValue={0.97}
          >
            <BlurView
              intensity={GLASS.blurIntensity}
              tint={isDark ? 'dark' : 'light'}
              style={[
                styles.secondaryActionButton,
                { backgroundColor: GLASS.bgLight },
              ]}
            >
              <Text style={styles.secondaryActionIcon}>{'\uD83D\uDCCB'}</Text>
              <Text style={[styles.secondaryActionText, { color: colors.text }]}>
                Transactions
              </Text>
              <Text style={[styles.actionArrow, { color: colors.textSecondary }]}>
                {'\u203A'}
              </Text>
            </BlurView>
          </AnimatedPressable>
        </Animated.View>

        {/* Quick Tools Section */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(300)}
          style={styles.toolsSection}
        >
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Quick Tools
          </Text>

          <View style={styles.toolsGrid}>
            {/* Voice Input */}
            <GlassCard
              intensity={GLASS.blurIntensity}
              tint={isDark ? 'dark' : 'light'}
              onPress={() => navigation.navigate('VoiceInput')}
              style={[styles.toolCard, { backgroundColor: GLASS.bgLight }]}
            >
              <View style={[styles.toolIconContainer, { backgroundColor: 'rgba(106, 13, 173, 0.15)' }]}>
                <Text style={styles.toolIcon}>{'\uD83C\uDFA4'}</Text>
              </View>
              <Text style={[styles.toolLabel, { color: colors.text }]}>Voice</Text>
              <Text style={[styles.toolSublabel, { color: colors.textSecondary }]}>
                Speak it
              </Text>
            </GlassCard>

            {/* Receipt Scan */}
            <GlassCard
              intensity={GLASS.blurIntensity}
              tint={isDark ? 'dark' : 'light'}
              onPress={() => navigation.navigate('ReceiptScan')}
              style={[styles.toolCard, { backgroundColor: GLASS.bgLight }]}
            >
              <View style={[styles.toolIconContainer, { backgroundColor: 'rgba(0, 122, 255, 0.15)' }]}>
                <Text style={styles.toolIcon}>{'\uD83D\uDCF8'}</Text>
              </View>
              <Text style={[styles.toolLabel, { color: colors.text }]}>Receipt</Text>
              <Text style={[styles.toolSublabel, { color: colors.textSecondary }]}>
                Scan it
              </Text>
            </GlassCard>

            {/* AI Assistant */}
            <GlassCard
              intensity={GLASS.blurIntensity}
              tint={isDark ? 'dark' : 'light'}
              onPress={() => navigation.navigate('Chat')}
              style={[styles.toolCard, { backgroundColor: GLASS.bgLight }]}
            >
              <View style={[styles.toolIconContainer, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
                <Text style={styles.toolIcon}>{'\uD83E\uDD16'}</Text>
              </View>
              <Text style={[styles.toolLabel, { color: colors.text }]}>AI Chat</Text>
              <Text style={[styles.toolSublabel, { color: colors.textSecondary }]}>
                Ask me
              </Text>
            </GlassCard>

            {/* Statistics */}
            <GlassCard
              intensity={GLASS.blurIntensity}
              tint={isDark ? 'dark' : 'light'}
              onPress={() => navigation.navigate('Statistics')}
              style={[styles.toolCard, { backgroundColor: GLASS.bgLight }]}
            >
              <View style={[styles.toolIconContainer, { backgroundColor: 'rgba(255, 159, 10, 0.15)' }]}>
                <Text style={styles.toolIcon}>{'\uD83D\uDCCA'}</Text>
              </View>
              <Text style={[styles.toolLabel, { color: colors.text }]}>Stats</Text>
              <Text style={[styles.toolSublabel, { color: colors.textSecondary }]}>
                Insights
              </Text>
            </GlassCard>
          </View>
        </Animated.View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },

  // ─── Header ────────────────────────────────────────────────────────
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  headerGradient: {
    flex: 1,
    position: 'relative',
  },
  headerSafeArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  headerTextBlock: {
    flex: 1,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  settingsIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },

  // Decorative orbs for visual depth
  orbContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: -1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbPrimary: {
    width: 200,
    height: 200,
    top: -60,
    right: -40,
    backgroundColor: 'rgba(106, 13, 173, 0.3)',
  },
  orbSecondary: {
    width: 150,
    height: 150,
    bottom: -30,
    left: -20,
    backgroundColor: 'rgba(91, 82, 255, 0.2)',
  },

  // ─── Scroll ────────────────────────────────────────────────────────
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  // ─── Stats ─────────────────────────────────────────────────────────
  statsSection: {
    marginTop: 10,
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    minHeight: 100,
    justifyContent: 'center',
  },
  statIconRow: {
    marginBottom: 6,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statCurrency: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  // Net balance card
  netCard: {
    borderWidth: 1.5,
  },
  netCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  netBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  netBadgeText: {
    fontSize: 18,
  },

  // ─── Loading State ─────────────────────────────────────────────────
  loadingContainer: {
    marginTop: 16,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },

  // ─── Empty State ───────────────────────────────────────────────────
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },

  // ─── Action Buttons ────────────────────────────────────────────────
  actionsSection: {
    marginTop: 12,
    gap: 8,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: GLASS.borderRadius,
    gap: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryActionIcon: {
    fontSize: 22,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: GLASS.borderRadius,
    borderWidth: 1,
    borderColor: GLASS.borderColor,
    overflow: 'hidden',
    gap: 10,
  },
  secondaryActionIcon: {
    fontSize: 18,
  },
  secondaryActionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  actionArrow: {
    fontSize: 24,
    fontWeight: '300',
  },

  // ─── Quick Tools ───────────────────────────────────────────────────
  toolsSection: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toolCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  toolIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  toolIcon: {
    fontSize: 20,
  },
  toolLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  toolSublabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },

  // ─── Spacing ───────────────────────────────────────────────────────
  bottomSpacer: {
    height: 100,
  },
});
