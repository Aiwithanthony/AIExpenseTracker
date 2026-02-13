import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
// SafeAreaView not needed - stack navigator handles safe area
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import AnimatedPressable from '../components/AnimatedPressable';

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

export default function StatisticsScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const now = new Date();
      let startDate: Date;
      let endDate = now;

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

      const data = await api.getExpenseStats(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
      );
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

  const renderPeriodChip = (value: 'week' | 'month' | 'year', label: string) => {
    const isActive = period === value;
    return (
      <AnimatedPressable onPress={() => setPeriod(value)} scaleValue={0.93}>
        {isActive ? (
          <LinearGradient
            colors={[ACCENT, ACCENT_LIGHT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.periodButton}
          >
            <Text style={[styles.periodText, styles.periodTextActive]}>
              {label}
            </Text>
          </LinearGradient>
        ) : (
          <BlurView
            intensity={GLASS.blurIntensity}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.periodButton, styles.periodButtonInactive]}
          >
            <Text style={[styles.periodText, { color: 'rgba(255, 255, 255, 0.6)' }]}>
              {label}
            </Text>
          </BlurView>
        )}
      </AnimatedPressable>
    );
  };

  if (loading && !stats) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <GlassCard
            intensity={GLASS.blurIntensity}
            tint={isDark ? 'dark' : 'light'}
            style={styles.loadingCard}
          >
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.loadingText}>Loading statistics...</Text>
          </GlassCard>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      >
        {/* Header */}
        <LinearGradient
          colors={['#1a0533', '#2d0a4e', '#1a0533']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Animated.Text
            entering={FadeIn.duration(500)}
            style={styles.title}
          >
            Statistics
          </Animated.Text>

          <View style={styles.periodSelector}>
            {renderPeriodChip('week', 'Week')}
            {renderPeriodChip('month', 'Month')}
            {renderPeriodChip('year', 'Year')}
          </View>
        </LinearGradient>

        {stats && (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.summaryCardWrapper}>
                <GlassCard intensity={GLASS.blurIntensity} tint={isDark ? 'dark' : 'light'} style={styles.summaryCard}>
                  <View style={[styles.iconBadge, { backgroundColor: 'rgba(255, 59, 48, 0.2)' }]}>
                    <Text style={styles.iconBadgeText}>{'\u2193'}</Text>
                  </View>
                  <Text style={styles.summaryLabel}>Total Expenses</Text>
                  <Text style={[styles.summaryValue, { color: '#FFFFFF' }]}>
                    {stats.totalExpenses?.toFixed(2) || stats.total?.toFixed(2) || '0.00'}
                  </Text>
                </GlassCard>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.summaryCardWrapper}>
                <GlassCard intensity={GLASS.blurIntensity} tint={isDark ? 'dark' : 'light'} style={styles.summaryCard}>
                  <View style={[styles.iconBadge, { backgroundColor: 'rgba(52, 199, 89, 0.2)' }]}>
                    <Text style={[styles.iconBadgeText, { color: '#34C759' }]}>{'\u2191'}</Text>
                  </View>
                  <Text style={styles.summaryLabel}>Total Income</Text>
                  <Text style={[styles.summaryValue, { color: '#34C759' }]}>
                    {stats.totalIncome?.toFixed(2) || '0.00'}
                  </Text>
                </GlassCard>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.summaryCardWrapper}>
                <GlassCard intensity={GLASS.blurIntensity} tint={isDark ? 'dark' : 'light'} style={styles.summaryCard}>
                  <View style={[styles.iconBadge, { backgroundColor: 'rgba(106, 13, 173, 0.2)' }]}>
                    <Text style={[styles.iconBadgeText, { color: ACCENT_LIGHT }]}>{'\u2194'}</Text>
                  </View>
                  <Text style={styles.summaryLabel}>Net Amount</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      { color: (stats.netAmount || 0) >= 0 ? '#34C759' : '#FF3B30' },
                    ]}
                  >
                    {(stats.netAmount || 0).toFixed(2)}
                  </Text>
                </GlassCard>
              </Animated.View>
            </View>

            {/* Top Categories */}
            {stats.topCategories && stats.topCategories.length > 0 && (
              <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.sectionWrapper}>
                <GlassCard intensity={GLASS.blurIntensity} tint={isDark ? 'dark' : 'light'} style={styles.section}>
                  <Text style={styles.sectionTitle}>TOP CATEGORIES</Text>
                  {stats.topCategories.map((cat: any, index: number) => (
                    <View
                      key={index}
                      style={[
                        styles.categoryItem,
                        index < stats.topCategories.length - 1 && styles.categoryItemBorder,
                      ]}
                    >
                      <View style={styles.categoryInfo}>
                        <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
                        <View style={styles.percentageBadge}>
                          <Text style={styles.percentageBadgeText}>
                            {cat.percentage.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.categoryAmount, { color: colors.text }]}>{cat.amount.toFixed(2)}</Text>
                    </View>
                  ))}
                </GlassCard>
              </Animated.View>
            )}

            {/* Top Merchants */}
            {stats.topMerchants && stats.topMerchants.length > 0 && (
              <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.sectionWrapper}>
                <GlassCard intensity={GLASS.blurIntensity} tint={isDark ? 'dark' : 'light'} style={styles.section}>
                  <Text style={styles.sectionTitle}>TOP MERCHANTS</Text>
                  {stats.topMerchants.map((merchant: any, index: number) => (
                    <View
                      key={index}
                      style={[
                        styles.categoryItem,
                        index < stats.topMerchants.length - 1 && styles.categoryItemBorder,
                      ]}
                    >
                      <View style={styles.categoryInfo}>
                        <Text style={[styles.categoryName, { color: colors.text }]}>{merchant.name}</Text>
                        <Text style={styles.merchantCount}>{merchant.count} transactions</Text>
                      </View>
                      <Text style={[styles.categoryAmount, { color: colors.text }]}>{merchant.amount.toFixed(2)}</Text>
                    </View>
                  ))}
                </GlassCard>
              </Animated.View>
            )}

            {/* Category Breakdown */}
            {stats.byCategory && Object.keys(stats.byCategory).length > 0 && (
              <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.sectionWrapper}>
                <GlassCard intensity={GLASS.blurIntensity} tint={isDark ? 'dark' : 'light'} style={styles.section}>
                  <Text style={styles.sectionTitle}>CATEGORY BREAKDOWN</Text>
                  {Object.entries(stats.byCategory)
                    .sort(([, a]: any, [, b]: any) => b - a)
                    .map(([name, amount]: [string, any], index: number, arr: [string, any][]) => (
                      <View
                        key={name}
                        style={[
                          styles.categoryItem,
                          index < arr.length - 1 && styles.categoryItemBorder,
                        ]}
                      >
                        <Text style={[styles.categoryName, { color: colors.text }]}>{name}</Text>
                        <Text style={[styles.categoryAmount, { color: colors.text }]}>{amount.toFixed(2)}</Text>
                      </View>
                    ))}
                </GlassCard>
              </Animated.View>
            )}

            {/* Average per day */}
            <Animated.View entering={FadeInDown.delay(700).duration(500)} style={styles.sectionWrapper}>
              <GlassCard intensity={GLASS.blurIntensity} tint={isDark ? 'dark' : 'light'} style={styles.averageSection}>
                <Text style={styles.sectionTitle}>AVERAGE DAILY SPENDING</Text>
                <Text style={styles.averageText}>
                  {stats.averagePerDay?.toFixed(2) || '0.00'} per day
                </Text>
              </GlassCard>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 60,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    marginTop: 16,
    fontWeight: '500',
  },
  header: {
    padding: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: GLASS.borderColor,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#FFFFFF',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  periodButton: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  periodButtonInactive: {
    borderWidth: 1,
    borderColor: GLASS.borderColor,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
  },
  periodTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  summaryCardWrapper: {
    flex: 1,
  },
  summaryCard: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  summaryLabel: {
    fontSize: 11,
    marginBottom: 6,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionWrapper: {
    marginHorizontal: 15,
    marginBottom: 15,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 16,
    color: ACCENT_LIGHT,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  categoryItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
  },
  percentageBadge: {
    backgroundColor: 'rgba(106, 13, 173, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  percentageBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: ACCENT_LIGHT,
  },
  merchantCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  averageSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  averageText: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: ACCENT_LIGHT,
    paddingVertical: 8,
  },
});
