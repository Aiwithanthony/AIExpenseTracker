import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Text } from '../components/AppText';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { useCachedFetch } from '../hooks/useCachedFetch';
import AnimatedPressable from '../components/AnimatedPressable';
import CategoryIcon from '../components/CategoryIcon';
import { ChartBar, Warning } from 'phosphor-react-native';

const BENTO_RADIUS = 18;


function periodRange(period: 'week' | 'month' | 'year'): { start: string; end: string } {
  const now = new Date();
  let startDate: Date;
  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
  }
  return {
    start: startDate.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  };
}

export default function StatisticsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  const { data: stats, loading, refreshing, refresh } = useCachedFetch<any>(
    `stats:${period}`,
    () => {
      const { start, end } = periodRange(period);
      return api.getExpenseStats(start, end);
    },
  );

  const fmt = (v: number | undefined) => (v == null ? '0.00' : v.toFixed(2));

  const segmentColors = [colors.primary, colors.tintWarmText, colors.tintCoolText, colors.textTertiary];
  const topCategories: Array<{ name: string; amount: number; percentage: number }> =
    (stats?.topCategories || []).slice(0, 4);
  const maxCatAmount = Math.max(...topCategories.map((c) => c.amount || 0), 1);

  const renderPeriodChip = (value: 'week' | 'month' | 'year', label: string) => {
    const isActive = period === value;
    return (
      <AnimatedPressable key={value} onPress={() => setPeriod(value)} scaleValue={0.93}>
        <View
          style={[
            styles.periodButton,
            isActive
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.periodText,
              isActive ? styles.periodTextActive : { color: colors.textSecondary },
            ]}
          >
            {label}
          </Text>
        </View>
      </AnimatedPressable>
    );
  };

  if (loading && !stats) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading statistics...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {/* Period selector */}
        <View style={styles.periodSelector}>
          {renderPeriodChip('week', 'Week')}
          {renderPeriodChip('month', 'Month')}
          {renderPeriodChip('year', 'Year')}
        </View>

        {stats && (
          <>
            {/* Spent / Income tinted pair */}
            <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.bentoRow}>
              <View style={[styles.tintCard, { backgroundColor: colors.tintWarm }]}>
                <Text style={[styles.tintLabel, { color: colors.tintWarmText }]}>Spent</Text>
                <Text style={[styles.tintValue, { color: colors.tintWarmText }]}>
                  {fmt(stats.totalExpenses ?? stats.total)}
                </Text>
              </View>
              <View style={[styles.tintCard, { backgroundColor: colors.tintCool }]}>
                <Text style={[styles.tintLabel, { color: colors.tintCoolText }]}>Income</Text>
                <Text style={[styles.tintValue, { color: colors.tintCoolText }]}>
                  {fmt(stats.totalIncome)}
                </Text>
              </View>
            </Animated.View>

            {/* Net + daily average pair */}
            <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.bentoRow}>
              <View style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>NET</Text>
                <Text
                  style={[
                    styles.miniValue,
                    { color: (stats.netAmount || 0) >= 0 ? colors.success : colors.error },
                  ]}
                >
                  {(stats.netAmount || 0) >= 0 ? '+' : ''}
                  {fmt(stats.netAmount)}
                </Text>
              </View>
              <View style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>AVG / DAY</Text>
                <Text style={[styles.miniValue, { color: colors.text }]}>
                  {fmt(stats.averagePerDay)}
                </Text>
              </View>
            </Animated.View>

            {/* Top categories with bars */}
            {(stats?.unconvertedCount ?? 0) > 0 && (
              <Animated.View entering={FadeInDown.delay(160).duration(400)}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 12, marginHorizontal: 4 }}>
                  <Warning size={14} color={colors.warning} weight="fill" />
                  <Text style={{ flex: 1, fontSize: 12, lineHeight: 17, color: colors.textSecondary }}>
                    {stats.unconvertedCount} transaction{stats.unconvertedCount === 1 ? '' : 's'} in{' '}
                    {(stats.unconvertedCurrencies || []).join(', ')} excluded from totals — currency
                    conversion unavailable. They'll be included automatically once rates are reachable.
                  </Text>
                </View>
              </Animated.View>
            )}

            {topCategories.length > 0 && (
              <Animated.View entering={FadeInDown.delay(180).duration(400)}>
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Top categories</Text>
                  {topCategories.map((cat, i) => (
                    <View key={cat.name} style={styles.catRow}>
                      <View style={[styles.catEmoji, { backgroundColor: colors.inputBg }]}>
                        <CategoryIcon name={cat.name} size={20} color={colors.textSecondary} />
                      </View>
                      <View style={styles.catBody}>
                        <View style={styles.catTopLine}>
                          <Text style={[styles.catName, { color: colors.text }]} numberOfLines={1}>
                            {cat.name}
                          </Text>
                          <Text style={[styles.catAmount, { color: colors.text }]}>
                            {fmt(cat.amount)}
                          </Text>
                        </View>
                        <View style={[styles.barTrack, { backgroundColor: colors.inputBg }]}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: `${Math.max((cat.amount / maxCatAmount) * 100, 4)}%`,
                                backgroundColor: segmentColors[i % segmentColors.length],
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.catPct, { color: colors.textTertiary }]}>
                          {Math.round(cat.percentage || 0)}% of spending
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Top merchants */}
            {stats.topMerchants && stats.topMerchants.length > 0 && (
              <Animated.View entering={FadeInDown.delay(240).duration(400)}>
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Top merchants</Text>
                  {stats.topMerchants.slice(0, 5).map((m: any, index: number, arr: any[]) => (
                    <View
                      key={m.name}
                      style={[
                        styles.merchantRow,
                        index < arr.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={[styles.rankBadge, { backgroundColor: index === 0 ? colors.tintWarm : colors.inputBg }]}>
                        <Text style={[styles.rankText, { color: index === 0 ? colors.tintWarmText : colors.textSecondary }]}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={styles.merchantInfo}>
                        <Text style={[styles.merchantName, { color: colors.text }]} numberOfLines={1}>
                          {m.name}
                        </Text>
                        <Text style={[styles.merchantCount, { color: colors.textTertiary }]}>
                          {m.count} transaction{m.count === 1 ? '' : 's'}
                        </Text>
                      </View>
                      <Text style={[styles.merchantAmount, { color: colors.text }]}>{fmt(m.amount)}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {stats && (stats.totalExpenses ?? stats.total ?? 0) === 0 && (stats.totalIncome ?? 0) === 0 && (
              <Animated.View entering={FadeInDown.delay(180).duration(400)}>
                <View style={[styles.sectionCard, styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.emptyEmoji}>
                    <ChartBar size={44} color={colors.textTertiary} weight="duotone" />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing here yet</Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    Add a few transactions and your insights will appear.
                  </Text>
                </View>
              </Animated.View>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
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
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 60,
    borderRadius: BENTO_RADIUS,
    borderWidth: 0.5,
  },
  loadingText: {
    fontSize: 15,
    marginTop: 16,
    fontWeight: '500',
  },

  // Period chips
  periodSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  periodButton: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
  },
  periodTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Bento rows
  bentoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  tintCard: {
    flex: 1,
    borderRadius: BENTO_RADIUS,
    padding: 16,
    minHeight: 92,
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
  miniCard: {
    flex: 1,
    borderRadius: BENTO_RADIUS,
    borderWidth: 0.5,
    padding: 14,
    ...warmShadow,
  },
  miniLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  miniValue: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },

  // Section cards
  sectionCard: {
    borderRadius: BENTO_RADIUS,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 10,
    ...warmShadow,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },

  // Category rows with bars
  catRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  catEmoji: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catEmojiText: {
    fontSize: 17,
  },
  catBody: {
    flex: 1,
  },
  catTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  catAmount: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  catPct: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },

  // Merchants
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 14,
    fontWeight: '600',
  },
  merchantCount: {
    fontSize: 12,
    marginTop: 1,
  },
  merchantAmount: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Empty
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
});
