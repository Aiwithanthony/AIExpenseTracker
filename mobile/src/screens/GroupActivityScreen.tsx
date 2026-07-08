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
import {
  CurrencyDollar,
  CheckCircle,
  Crown,
  HandWaving,
  PushPin,
  ClipboardText,
} from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useCachedFetch } from '../hooks/useCachedFetch';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';

const BENTO_RADIUS = 18;

interface ActivityItem {
  type: 'expense' | 'settlement' | 'member_join';
  id: string;
  timestamp: string;
  // expense
  description?: string;
  amount?: number;
  currency?: string;
  splitType?: string;
  paidByName?: string;
  // settlement
  fromUserName?: string;
  toUserName?: string;
  note?: string;
  // member_join
  userName?: string;
  role?: string;
}

export default function GroupActivityScreen({ route, navigation }: any) {
  const { groupId, groupName } = route.params;
  const { colors, isDark } = useTheme();

  const borderColor = colors.border;

  // Cached: instant render on re-entry, silent refresh behind it.
  const { data, loading, refreshing, refresh } = useCachedFetch<ActivityItem[]>(
    `group-activity:${groupId}`,
    async () => {
      const result = await (api as any).getGroupActivity(groupId);
      return Array.isArray(result) ? result : [];
    },
  );
  const activities = data ?? [];

  const formatDate = (timestamp: string) => {
    const d = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getActivityConfig = (item: ActivityItem) => {
    const currency = item.currency || '';
    const amountText = `${currency}${currency ? ' ' : ''}${Number(item.amount || 0).toFixed(2)}`;
    switch (item.type) {
      case 'expense':
        return {
          Icon: CurrencyDollar,
          color: '#34C759',
          title: item.description || 'Expense',
          subtitle: `${amountText} · Paid by ${item.paidByName || 'someone'}`,
        };
      case 'settlement':
        return {
          Icon: CheckCircle,
          color: '#5AC8FA',
          title: `${item.fromUserName} paid ${item.toUserName}`,
          subtitle: `${item.currency} ${Number(item.amount || 0).toFixed(2)}${item.note ? ` · ${item.note}` : ''}`,
        };
      case 'member_join':
        return {
          Icon: item.role === 'admin' ? Crown : HandWaving,
          color: '#FF9500',
          title: `${item.userName} joined`,
          subtitle: item.role === 'admin' ? 'Created the group' : 'Joined as member',
        };
      default:
        return { Icon: PushPin, color: colors.primary, title: 'Event', subtitle: '' };
    }
  };

  // Group activities by date
  const grouped: { label: string; items: ActivityItem[] }[] = [];
  const dateKeys: string[] = [];
  const dateMap = new Map<string, ActivityItem[]>();

  for (const item of activities) {
    const d = new Date(item.timestamp);
    const key = d.toDateString();
    if (!dateMap.has(key)) {
      dateMap.set(key, []);
      dateKeys.push(key);
    }
    dateMap.get(key)!.push(item);
  }

  for (const key of dateKeys) {
    const d = new Date(key);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    let label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (diff === 0) label = 'Today';
    else if (diff === 1) label = 'Yesterday';
    grouped.push({ label, items: dateMap.get(key)! });
  }

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
            <Text style={[styles.title, { color: colors.text }]}>Activity</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {groupName}
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.centerContainer}>
          <GlassCard style={styles.loadingCard} tint={isDark ? 'dark' : 'light'}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading activity...</Text>
          </GlassCard>
        </View>
      ) : (
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
          {activities.length === 0 ? (
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <GlassCard style={styles.emptyCard} tint={isDark ? 'dark' : 'light'}>
                <View style={styles.emptyEmoji}>
                  <ClipboardText size={44} color={colors.textTertiary} weight="duotone" />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Activity Yet</Text>
                <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                  Group activity will appear here as expenses and settlements are recorded.
                </Text>
              </GlassCard>
            </Animated.View>
          ) : (
            grouped.map((group, gi) => (
              <Animated.View
                key={group.label}
                entering={FadeInDown.duration(400).delay(gi * 80)}
              >
                <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                  {group.label}
                </Text>
                <GlassCard style={styles.groupCard} tint={isDark ? 'dark' : 'light'}>
                  {group.items.map((item, ii) => {
                    const config = getActivityConfig(item);
                    return (
                      <View
                        key={item.id + ii}
                        style={[
                          styles.activityRow,
                          ii < group.items.length - 1 && {
                            borderBottomWidth: 0.5,
                            borderBottomColor: borderColor,
                          },
                        ]}
                      >
                        <View style={[styles.iconCircle, { backgroundColor: config.color + '22' }]}>
                          <config.Icon size={18} color={config.color} weight="duotone" />
                        </View>
                        <View style={styles.activityContent}>
                          <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>
                            {config.title}
                          </Text>
                          <Text style={[styles.activitySubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                            {config.subtitle}
                          </Text>
                        </View>
                        <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
                          {new Date(item.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    );
                  })}
                </GlassCard>
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}
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
  },
  backButton: {
    marginBottom: 6,
    alignSelf: 'flex-start',
    paddingRight: 16,
    paddingVertical: 4,
  },
  backArrow: { fontSize: 36, fontWeight: '300', lineHeight: 36 },
  title: { fontSize: 30, fontWeight: 'bold' },
  subtitle: { fontSize: 15, marginTop: 2 },
  centerContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  loadingCard: { alignItems: 'center', padding: 40, gap: 16 },
  loadingText: { fontSize: 16, fontWeight: '500' },
  scrollContent: { padding: 16, paddingBottom: 120 },
  emptyCard: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyMessage: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 4,
  },
  groupCard: { padding: 0, overflow: 'hidden', marginBottom: 4 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 18 },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 15, fontWeight: '600' },
  activitySubtitle: { fontSize: 13, marginTop: 2 },
  activityTime: { fontSize: 12 },
});
