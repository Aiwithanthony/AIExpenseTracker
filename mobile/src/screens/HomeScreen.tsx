import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  FadeInDown,
} from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import AnimatedPressable from '../components/AnimatedPressable';
import CategoryIcon from '../components/CategoryIcon';
import {
  Wallet,
  WifiSlash,
  CurrencyDollar,
  Microphone,
  Camera,
  Robot,
  ChartBar,
  TrendUp,
  TrendDown,
} from 'phosphor-react-native';
import { useCachedFetch } from '../hooks/useCachedFetch';
import { useOffline } from '../hooks/useOffline';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BENTO_GAP = 10;
const BENTO_RADIUS = 18;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - BENTO_GAP) / 2;


export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { expenses } = useData();
  const offline = useOffline();

  // Cached: renders the last stats instantly and refreshes silently on focus.
  // Two scopes in one fetch: all-time (hero balance) + current month (Spent/
  // Saved cards and the spending bar) — otherwise those numbers grow forever.
  // The month is baked into the cache key so a month rollover starts fresh.
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const { data: homeStats, loading, refreshing, error, refresh: onRefresh } = useCachedFetch<any>(
    `stats:home:${monthKey}`,
    async () => {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const [allTime, month] = await Promise.all([
        api.getExpenseStats(),
        api.getExpenseStats(start.toISOString(), end.toISOString()),
      ]);
      return { allTime, month };
    },
  );
  const stats = homeStats?.month;      // month scope: Spent/Saved + spending bar
  const allTime = homeStats?.allTime;  // all-time scope: hero total balance

  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const greetingAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 50], [1, 0], 'clamp');
    const translateY = interpolate(scrollY.value, [0, 50], [0, -10], 'clamp');
    return { opacity, transform: [{ translateY }] };
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatAmount = (val: number | undefined) => {
    if (val == null) return '0.00';
    if (Math.abs(val) >= 10000) {
      return `${(val / 1000).toFixed(1)}k`;
    }
    return val.toFixed(2);
  };

  const currency = user?.currency || 'USD';
  const net = allTime?.netAmount || 0;      // hero: overall balance
  const monthNet = stats?.netAmount || 0;   // Saved card: this month's net
  const positive = net >= 0;

  // Distinct segment hues for the category bar (theme-adaptive via tint text tokens)
  const segmentColors = [colors.primary, colors.tintWarmText, colors.tintCoolText, colors.textTertiary];
  const topCategories: Array<{ name: string; amount: number; percentage: number }> =
    (stats?.topCategories || []).slice(0, 3);
  const otherPct = Math.max(
    0,
    100 - topCategories.reduce((sum, c) => sum + (c.percentage || 0), 0),
  );
  const segments = [
    ...topCategories.map((c, i) => ({ name: c.name, pct: c.percentage || 0, color: segmentColors[i] })),
    ...(otherPct > 0.5 && topCategories.length > 0
      ? [{ name: 'Other', pct: otherPct, color: segmentColors[3] }]
      : []),
  ];

  const recent = (expenses || []).slice(0, 3);

  const displayAmount = (exp: any): number => {
    const v = exp.convertedCurrency === currency && exp.convertedAmount != null
      ? exp.convertedAmount
      : exp.amount;
    const n = typeof v === 'string' ? parseFloat(v) : Number(v);
    return isNaN(n) ? 0 : n;
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Warm greeting header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <Animated.View style={[styles.header, greetingAnimatedStyle]}>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {getGreeting()}
            </Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.name || 'User'}
            </Text>
            {offline && (
              <View style={[styles.offlinePill, { backgroundColor: colors.tintWarm }]}>
                <WifiSlash size={12} color={colors.tintWarmText} weight="bold" />
                <Text style={[styles.offlinePillText, { color: colors.tintWarmText }]}>
                  Offline
                </Text>
              </View>
            )}
          </View>
          <AnimatedPressable
            onPress={() => navigation.navigate('SettingsTab')}
            scaleValue={0.9}
          >
            <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          </AnimatedPressable>
        </Animated.View>
      </SafeAreaView>

      {/* Bento grid */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Animated.View entering={FadeInDown.duration(400)}>
            <GlassCard tint={isDark ? 'dark' : 'light'} style={styles.loadingCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading your finances...
              </Text>
            </GlassCard>
          </Animated.View>
        ) : stats ? (
          <>
            {/* Hero: total balance on solid accent */}
            <Animated.View entering={FadeInDown.duration(400).delay(60)}>
              <AnimatedPressable
                onPress={() => navigation.navigate('Expenses')}
                scaleValue={0.98}
              >
                <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
                  <Text style={styles.heroLabel}>TOTAL BALANCE</Text>
                  <Text style={styles.heroValue}>
                    {positive ? '' : '−'}
                    {formatAmount(Math.abs(net))}
                    <Text style={styles.heroCurrency}>  {currency}</Text>
                  </Text>
                  <View style={[styles.heroChip, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                    {positive ? (
                      <TrendUp size={14} color="#FFFFFF" weight="bold" />
                    ) : (
                      <TrendDown size={14} color="#FFFFFF" weight="bold" />
                    )}
                    <Text style={styles.heroChipText}>Transactions</Text>
                  </View>
                </View>
              </AnimatedPressable>
            </Animated.View>

            {/* Spent / Saved tinted pair — scoped to the current month */}
            <Animated.View entering={FadeInDown.duration(400).delay(110)}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 10 }]}>
                THIS MONTH
              </Text>
            </Animated.View>
            <Animated.View
              entering={FadeInDown.duration(400).delay(130)}
              style={styles.bentoRow}
            >
              {/* Display-only summary stats — not tappable (a summary number
                  shouldn't open a create/detail screen). */}
              <View style={styles.bentoHalf}>
                <View style={[styles.tintCard, { backgroundColor: colors.tintWarm }]}>
                  <Text style={[styles.tintLabel, { color: colors.tintWarmText }]}>Spent</Text>
                  <Text style={[styles.tintValue, { color: colors.tintWarmText }]}>
                    {formatAmount(stats.totalExpenses)}
                  </Text>
                  <Text style={[styles.tintSub, { color: colors.tintWarmText }]}>{currency}</Text>
                </View>
              </View>

              <View style={styles.bentoHalf}>
                <View style={[styles.tintCard, { backgroundColor: colors.tintCool }]}>
                  <Text style={[styles.tintLabel, { color: colors.tintCoolText }]}>Saved</Text>
                  <Text style={[styles.tintValue, { color: colors.tintCoolText }]}>
                    {formatAmount(monthNet)}
                  </Text>
                  <Text style={[styles.tintSub, { color: colors.tintCoolText }]}>{currency}</Text>
                </View>
              </View>
            </Animated.View>

            {/* Spending breakdown */}
            {segments.length > 0 && (
              <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                <AnimatedPressable
                  onPress={() => navigation.navigate('Statistics')}
                  scaleValue={0.98}
                >
                  <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Spending</Text>
                    <View style={[styles.segmentTrack, { backgroundColor: colors.inputBg }]}>
                      {segments.map((seg, i) => (
                        <View
                          key={seg.name}
                          style={{
                            flex: Math.max(seg.pct, 2),
                            backgroundColor: seg.color,
                            borderTopLeftRadius: i === 0 ? 6 : 0,
                            borderBottomLeftRadius: i === 0 ? 6 : 0,
                            borderTopRightRadius: i === segments.length - 1 ? 6 : 0,
                            borderBottomRightRadius: i === segments.length - 1 ? 6 : 0,
                          }}
                        />
                      ))}
                    </View>
                    <View style={styles.legendWrap}>
                      {segments.map((seg) => (
                        <View key={seg.name} style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                          <Text style={[styles.legendText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {seg.name} {Math.round(seg.pct)}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </AnimatedPressable>
              </Animated.View>
            )}

            {/* Recent transactions */}
            {recent.length > 0 && (
              <Animated.View entering={FadeInDown.duration(400).delay(260)}>
                <View style={styles.recentHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RECENT</Text>
                  <AnimatedPressable onPress={() => navigation.navigate('Expenses')} scaleValue={0.95}>
                    <Text style={[styles.seeAll, { color: colors.primary }]}>See all {'›'}</Text>
                  </AnimatedPressable>
                </View>
                <View style={[styles.recentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {recent.map((exp: any, i: number) => {
                    const isIncome = exp.type === 'income';
                    return (
                      <AnimatedPressable
                        key={exp.id}
                        onPress={() => navigation.navigate('EditExpense', { expenseId: exp.id, expense: exp })}
                        scaleValue={0.98}
                      >
                        <View style={[
                          styles.recentRow,
                          i < recent.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
                        ]}>
                          <View style={[styles.recentEmoji, { backgroundColor: isIncome ? colors.tintCool : colors.tintWarm }]}>
                            {isIncome ? (
                              <Wallet size={22} color={colors.tintCoolText} weight="duotone" />
                            ) : (
                              <CategoryIcon name={exp.category?.name} size={22} color={colors.tintWarmText} />
                            )}
                          </View>
                          <View style={styles.recentInfo}>
                            <Text style={[styles.recentName, { color: colors.text }]} numberOfLines={1}>
                              {exp.description}
                            </Text>
                            <Text style={[styles.recentSub, { color: colors.textTertiary }]} numberOfLines={1}>
                              {exp.merchant || exp.category?.name || 'Uncategorized'}
                            </Text>
                          </View>
                          <Text style={[styles.recentAmount, { color: isIncome ? colors.success : colors.text }]}>
                            {isIncome ? '+' : '−'}{formatAmount(displayAmount(exp))}
                          </Text>
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </Animated.View>
            )}
          </>
        ) : error ? (
          <Animated.View entering={FadeInDown.duration(400)}>
            <GlassCard tint={isDark ? 'dark' : 'light'} style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <WifiSlash size={44} color={colors.textTertiary} weight="duotone" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Can't reach the server
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Your data is safe — check that the backend is running and your
                phone is on the same Wi-Fi, then pull down to retry.
              </Text>
            </GlassCard>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(400)}>
            <GlassCard tint={isDark ? 'dark' : 'light'} style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <CurrencyDollar size={44} color={colors.primary} weight="duotone" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Start tracking your money
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Your income, expenses, and insights will appear here
              </Text>
            </GlassCard>
          </Animated.View>
        )}

        {/* Add transaction */}
        <Animated.View entering={FadeInDown.duration(400).delay(320)}>
          <AnimatedPressable
            onPress={() => navigation.navigate('AddExpense')}
            scaleValue={0.97}
          >
            <View style={[styles.primaryAction, { backgroundColor: colors.primary }]}>
              <Text style={styles.primaryActionIcon}>+</Text>
              <Text style={styles.primaryActionText}>Add Transaction</Text>
            </View>
          </AnimatedPressable>
        </Animated.View>

        {/* Quick tools */}
        <Animated.View entering={FadeInDown.duration(400).delay(380)}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 10 }]}>
            QUICK TOOLS
          </Text>
          <View style={styles.toolsGrid}>
            {[
              { Icon: Microphone, label: 'Voice', sub: 'Speak it', bg: colors.tintWarm, fg: colors.tintWarmText, screen: 'VoiceInput' },
              { Icon: Camera, label: 'Receipt', sub: 'Scan it', bg: `${colors.primary}1A`, fg: colors.primary, screen: 'ReceiptScan' },
              { Icon: Robot, label: 'AI Chat', sub: 'Ask me', bg: colors.tintCool, fg: colors.tintCoolText, screen: 'Chat' },
              { Icon: ChartBar, label: 'Stats', sub: 'Insights', bg: colors.pill, fg: colors.pillText, screen: 'Statistics' },
            ].map((tool) => (
              <AnimatedPressable
                key={tool.screen}
                onPress={() => navigation.navigate(tool.screen)}
                scaleValue={0.95}
                style={styles.toolCardWrapper}
              >
                <View style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.toolIconContainer, { backgroundColor: tool.bg }]}>
                    <tool.Icon size={24} color={tool.fg} weight="duotone" />
                  </View>
                  <Text style={[styles.toolLabel, { color: colors.text }]}>{tool.label}</Text>
                  <Text style={[styles.toolSublabel, { color: colors.textTertiary }]}>
                    {tool.sub}
                  </Text>
                </View>
              </AnimatedPressable>
            ))}
          </View>
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>
    </View>
  );
}

const warmShadow = Platform.select({
  ios: {
    shadowColor: '#5E4A36',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
  },
  offlinePillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTextBlock: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fefefe',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // Hero (solid accent balance card)
  heroCard: {
    borderRadius: BENTO_RADIUS,
    padding: 20,
    marginBottom: BENTO_GAP,
    ...Platform.select({
      ios: {
        shadowColor: '#5E4A36',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
      },
      android: { elevation: 5 },
    }),
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.75)',
  },
  heroValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#ffffff',
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  heroCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  heroChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 14,
  },
  heroChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Bento row
  bentoRow: {
    flexDirection: 'row',
    gap: BENTO_GAP,
    marginBottom: BENTO_GAP,
  },
  bentoHalf: {
    flex: 1,
  },

  // Tinted stat cards (Spent / Saved)
  tintCard: {
    borderRadius: BENTO_RADIUS,
    padding: 16,
    minHeight: 104,
    justifyContent: 'center',
    ...warmShadow,
  },
  tintLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.85,
  },
  tintValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  tintSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.7,
  },

  // Spending breakdown
  breakdownCard: {
    borderRadius: BENTO_RADIUS,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: BENTO_GAP,
    ...warmShadow,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  segmentTrack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    gap: 2,
  },
  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Recent
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
  },
  recentCard: {
    borderRadius: BENTO_RADIUS,
    borderWidth: 0.5,
    marginBottom: BENTO_GAP,
    overflow: 'hidden',
    ...warmShadow,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  recentEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentEmojiText: {
    fontSize: 18,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  recentAmount: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Loading
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginBottom: BENTO_GAP,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },

  // Empty
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    marginBottom: BENTO_GAP,
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

  // Primary action
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#5E4A36',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  primaryActionIcon: {
    fontSize: 22,
    fontWeight: '300',
    color: '#ffffff',
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },

  // Quick tools
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginLeft: 4,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BENTO_GAP,
  },
  toolCardWrapper: {
    width: CARD_WIDTH,
  },
  toolCard: {
    borderRadius: BENTO_RADIUS,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    minHeight: 110,
    ...warmShadow,
  },
  toolIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  toolIcon: {
    fontSize: 20,
  },
  toolLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  toolSublabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  bottomSpacer: {
    height: 100,
  },
});
