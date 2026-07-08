import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useCachedFetch } from '../hooks/useCachedFetch';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';

const BENTO_RADIUS = 18;

const MEMBER_COLORS = ['#34C759', '#5AC8FA', '#FF9500', '#BF5AF2', '#FF6B6B', '#FFD60A'];

interface MemberStat {
  userId: string;
  userName: string;
  amountPaid: number;
  shareOwed: number;
  netBalance: number;
}

interface MonthlyBreakdown {
  month: string;
  totalAmount: number;
  expenseCount: number;
}

interface Analytics {
  baseCurrency: string;
  totalAmount: number;
  expenseCount: number;
  settlementCount: number;
  memberStats: MemberStat[];
  monthlyBreakdown: MonthlyBreakdown[];
}

export default function GroupAnalyticsScreen({ route, navigation }: any) {
  const { groupId, groupName } = route.params;
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const borderColor = colors.border;
  const cardBg = colors.card;

  // Cached: instant render on re-entry, silent refresh behind it.
  const { data: analytics, loading, refreshing, refresh } = useCachedFetch<Analytics | null>(
    `group-analytics:${groupId}`,
    async () => (api as any).getGroupAnalytics(groupId),
  );

  const formatAmount = (amount: number, currency: string) =>
    `${currency} ${Math.abs(amount).toFixed(2)}`;

  const getMaxPaid = () =>
    analytics ? Math.max(...analytics.memberStats.map((m) => m.amountPaid), 1) : 1;

  const getMaxMonthly = () =>
    analytics
      ? Math.max(...analytics.monthlyBreakdown.map((m) => m.totalAmount), 1)
      : 1;

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: borderColor }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={[styles.backArrow, { color: colors.primary }]}>{'\u2039'}</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Analytics</Text>
          </View>
        </SafeAreaView>
        <View style={styles.centerContainer}>
          <GlassCard style={styles.loadingCard} tint={isDark ? 'dark' : 'light'}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Crunching numbers...</Text>
          </GlassCard>
        </View>
      </View>
    );
  }

  if (!analytics) return null;

  const maxPaid = getMaxPaid();
  const maxMonthly = getMaxMonthly();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.card,
                borderBottomWidth: 0.5,
                borderBottomColor: borderColor,
              },
            ]}
          >
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={[styles.backArrow, { color: colors.primary }]}>{'\u2039'}</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Analytics</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {groupName}
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Summary Stats */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <View style={styles.statsRow}>
            <GlassCard style={styles.statCard} tint={isDark ? 'dark' : 'light'}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatAmount(analytics.totalAmount, analytics.baseCurrency)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Spent</Text>
            </GlassCard>
            <GlassCard style={styles.statCard} tint={isDark ? 'dark' : 'light'}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {analytics.expenseCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Expenses</Text>
            </GlassCard>
            <GlassCard style={styles.statCard} tint={isDark ? 'dark' : 'light'}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {analytics.settlementCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Settlements</Text>
            </GlassCard>
          </View>
        </Animated.View>

        {/* Member Contribution Chart */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Member Breakdown</Text>
          <GlassCard style={styles.chartCard} tint={isDark ? 'dark' : 'light'}>
            {analytics.memberStats.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No data yet</Text>
            ) : (
              analytics.memberStats.map((member, index) => {
                const barWidth = maxPaid > 0 ? (member.amountPaid / maxPaid) * 100 : 0;
                const barColor = MEMBER_COLORS[index % MEMBER_COLORS.length];
                const isYou = member.userId === user?.id;
                return (
                  <View key={member.userId} style={styles.memberRow}>
                    <View style={styles.memberLabelRow}>
                      <Text style={[styles.memberName, { color: colors.text }]}>
                        {member.userName}{isYou ? ' (You)' : ''}
                      </Text>
                      <Text style={[styles.memberBalance, {
                        color: member.netBalance > 0 ? colors.success : member.netBalance < 0 ? colors.error : colors.textSecondary
                      }]}>
                        {member.netBalance > 0
                          ? `+${member.netBalance.toFixed(2)}`
                          : member.netBalance.toFixed(2)}
                      </Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: colors.inputBg }]}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${barWidth}%`, backgroundColor: barColor },
                        ]}
                      />
                    </View>
                    <View style={styles.memberAmounts}>
                      <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
                        Paid: {formatAmount(member.amountPaid, analytics.baseCurrency)}
                      </Text>
                      <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
                        Owed: {formatAmount(member.shareOwed, analytics.baseCurrency)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </GlassCard>
        </Animated.View>

        {/* Monthly Spending Chart */}
        {analytics.monthlyBreakdown.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Spending</Text>
            <GlassCard style={styles.chartCard} tint={isDark ? 'dark' : 'light'}>
              <View style={styles.monthlyChart}>
                {analytics.monthlyBreakdown.map((month, index) => {
                  const height = maxMonthly > 0 ? (month.totalAmount / maxMonthly) * 100 : 0;
                  const barColor = MEMBER_COLORS[index % MEMBER_COLORS.length];
                  return (
                    <View key={month.month} style={styles.monthlyColumn}>
                      <Text style={[styles.monthlyAmount, { color: colors.textSecondary }]}>
                        {month.totalAmount >= 1000
                          ? `${(month.totalAmount / 1000).toFixed(1)}k`
                          : month.totalAmount.toFixed(0)}
                      </Text>
                      <View style={styles.monthlyBarWrapper}>
                        <View
                          style={[
                            styles.monthlyBar,
                            {
                              height: `${Math.max(height, 4)}%`,
                              backgroundColor: barColor,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.monthlyLabel, { color: colors.textSecondary }]}>
                        {formatMonth(month.month)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Member Net Balances */}
        {analytics.memberStats.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Net Balances</Text>
          <View style={[styles.balancesList, { backgroundColor: cardBg, borderColor }]}>
            {analytics.memberStats.map((member, index) => {
              const isYou = member.userId === user?.id;
              return (
                <View
                  key={member.userId}
                  style={[
                    styles.balanceRow,
                    index < analytics.memberStats.length - 1 && {
                      borderBottomWidth: 0.5,
                      borderBottomColor: borderColor,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.balanceDot,
                      { backgroundColor: MEMBER_COLORS[index % MEMBER_COLORS.length] },
                    ]}
                  />
                  <Text style={[styles.balanceName, { color: colors.text }]}>
                    {member.userName}{isYou ? ' (You)' : ''}
                  </Text>
                  <Text
                    style={[
                      styles.balanceAmount,
                      {
                        color:
                          member.netBalance > 0
                            ? colors.success
                            : member.netBalance < 0
                            ? colors.error
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {member.netBalance > 0
                      ? `owed ${formatAmount(member.netBalance, analytics.baseCurrency)}`
                      : member.netBalance < 0
                      ? `owes ${formatAmount(member.netBalance, analytics.baseCurrency)}`
                      : 'settled'}
                  </Text>
                </View>
              );
            })}
          </View>
        </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomLeftRadius: BENTO_RADIUS,
    borderBottomRightRadius: BENTO_RADIUS,
    borderBottomWidth: 0.5,
  },
  backButton: { marginBottom: 6, alignSelf: 'flex-start', paddingRight: 16, paddingVertical: 4 },
  backArrow: { fontSize: 36, fontWeight: '300', lineHeight: 36 },
  title: { fontSize: 30, fontWeight: 'bold' },
  subtitle: { fontSize: 15, marginTop: 2 },
  centerContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  loadingCard: { alignItems: 'center', padding: 40, gap: 16 },
  loadingText: { fontSize: 16, fontWeight: '500' },
  scrollContent: { padding: 16, paddingBottom: 60 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, alignItems: 'center', padding: 16 },
  statValue: { fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  chartCard: { padding: 16, marginBottom: 20 },
  emptyText: { textAlign: 'center', fontSize: 15 },
  memberRow: { marginBottom: 16 },
  memberLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  memberName: { fontSize: 14, fontWeight: '600' },
  memberBalance: { fontSize: 14, fontWeight: '700' },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  barFill: { height: '100%', borderRadius: 4 },
  memberAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
  amountLabel: { fontSize: 12 },
  monthlyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 8,
  },
  monthlyColumn: { flex: 1, alignItems: 'center', height: '100%' },
  monthlyAmount: { fontSize: 10, marginBottom: 4 },
  monthlyBarWrapper: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  monthlyBar: { width: '100%', borderRadius: 4, minHeight: 4 },
  monthlyLabel: { fontSize: 10, marginTop: 4, textAlign: 'center' },
  balancesList: {
    borderRadius: BENTO_RADIUS,
    borderWidth: 0.5,
    overflow: 'hidden',
    marginBottom: 20,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  balanceDot: { width: 10, height: 10, borderRadius: 5 },
  balanceName: { flex: 1, fontSize: 15, fontWeight: '600' },
  balanceAmount: { fontSize: 14, fontWeight: '600' },
});
