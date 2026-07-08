import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  Plus,
  Check,
  ClipboardText,
  ChartBar,
  UsersThree,
  CheckCircle,
} from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import AnimatedPressable from '../components/AnimatedPressable';
import { useCachedFetch } from '../hooks/useCachedFetch';

let Clipboard: any = null;
try {
  Clipboard = require('expo-clipboard');
} catch {
  // expo-clipboard not available
}

const BENTO_RADIUS = 18;

interface Member {
  id: string;
  userId?: string;
  user?: { id: string; name?: string; email?: string };
  name?: string;
  email?: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  baseCurrency?: string;
  inviteCode?: string;
  members?: Member[];
  createdAt?: string;
}

interface GroupExpense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  splitType: string;
  paidBy: string;
  paidByUser?: { id: string; name: string; email: string };
  date: string;
  createdAt?: string;
}

interface Balance {
  userId: string;
  userName?: string;
  balance: number;
}

interface BalancesResponse {
  balances?: Balance[];
  simplifiedDebts?: any[];
}

export default function GroupDetailScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  // Cached: instant render when returning to this group, silent refresh behind it.
  const { data, loading, refreshing, refresh } = useCachedFetch<{
    group: Group;
    expenses: GroupExpense[];
    balances: BalancesResponse;
  }>(`group:${groupId}`, async () => {
    const [groupData, expensesData, balancesData] = await Promise.all([
      api.getGroup(groupId),
      api.getGroupExpenses(groupId),
      api.getGroupBalances(groupId),
    ]);
    return {
      group: groupData as Group,
      expenses: Array.isArray(expensesData) ? (expensesData as GroupExpense[]) : [],
      balances: (balancesData as BalancesResponse) || {},
    };
  });

  const group = data?.group ?? null;
  const expenses = data?.expenses ?? [];
  const balances = data?.balances ?? {};

  const loadData = refresh;
  const onRefresh = refresh;

  const handleCopyInviteCode = async (code: string) => {
    if (Clipboard && Clipboard.setStringAsync) {
      await Clipboard.setStringAsync(code);
      Alert.alert('Copied', 'Invite code copied to clipboard');
    } else {
      Alert.alert('Invite Code', code);
    }
  };

  const handleDeleteExpense = (expense: GroupExpense) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${expense.description}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteGroupExpense(groupId, expense.id);
              await loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete expense');
            }
          },
        },
      ],
    );
  };

  const getCurrentUserBalance = (): number => {
    if (!user || !balances.balances) return 0;
    const userBalance = balances.balances.find(
      (b) => b.userId === user.id,
    );
    return userBalance?.balance || 0;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number): string => {
    return Math.abs(amount).toFixed(2);
  };

  const getPayerName = (expense: GroupExpense): string => {
    if (expense.paidByUser?.name) return expense.paidByUser.name;
    if (group?.members) {
      const member = group.members.find((m) => m.userId === expense.paidBy);
      if (member?.user?.name) return member.user.name;
    }
    return 'Unknown';
  };

  const getSplitTypeBadgeColor = (splitType: string): string => {
    switch (splitType?.toUpperCase()) {
      case 'EQUAL':
        return '#34C759';
      case 'EXACT':
        return '#FF9500';
      case 'PERCENTAGE':
        return '#5AC8FA';
      case 'SHARES':
        return '#BF5AF2';
      default:
        return colors.primary;
    }
  };

  if (loading) {
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
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Text style={[styles.backArrow, { color: colors.primary }]}>{'\u2039'}</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: colors.text }]}>Loading...</Text>
            </View>
          </Animated.View>
        </SafeAreaView>
        <View style={styles.centerContainer}>
          <GlassCard style={styles.loadingCard} tint={isDark ? 'dark' : 'light'}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading group details...</Text>
          </GlassCard>
        </View>
      </View>
    );
  }

  const currentBalance = getCurrentUserBalance();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.card,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={[styles.backArrow, { color: colors.primary }]}>{'\u2039'}</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {group?.name || 'Group'}
            </Text>
            <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
              {group?.members?.length || 0} member{(group?.members?.length || 0) !== 1 ? 's' : ''}
            </Text>
            {group?.inviteCode && (
              <TouchableOpacity
                onPress={() => handleCopyInviteCode(group.inviteCode!)}
                style={[
                  styles.inviteCodeContainer,
                  {
                    backgroundColor: colors.inputBg,
                    borderWidth: 0.5,
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.inviteCodeLabel, { color: colors.textSecondary }]}>Invite Code:</Text>
                <Text style={[styles.inviteCode, { color: colors.text }]}>{group.inviteCode}</Text>
                <Text style={[styles.tapToCopy, { color: colors.textSecondary }]}>Tap to copy</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Balance Summary — tinted bento hero */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <View
            style={[
              styles.balanceCard,
              styles.balanceHero,
              {
                backgroundColor:
                  currentBalance < 0 ? colors.tintWarm : colors.tintCool,
              },
            ]}
          >
            <Text
              style={[
                styles.balanceSectionTitle,
                { color: currentBalance < 0 ? colors.tintWarmText : colors.tintCoolText },
              ]}
            >
              YOUR BALANCE
            </Text>
            {currentBalance === 0 ? (
              <CheckCircle size={38} color={colors.tintCoolText} weight="duotone" />
            ) : (
              <Text
                style={[
                  styles.balanceHeroAmount,
                  { color: currentBalance < 0 ? colors.tintWarmText : colors.tintCoolText },
                ]}
              >
                {`$${formatAmount(currentBalance)}`}
              </Text>
            )}
            <Text
              style={[
                styles.balanceHeroSub,
                { color: currentBalance < 0 ? colors.tintWarmText : colors.tintCoolText },
              ]}
            >
              {currentBalance > 0
                ? 'You are owed'
                : currentBalance < 0
                ? 'You owe'
                : 'All settled up'}
            </Text>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <View style={styles.actionsRow}>
            <AnimatedPressable
              onPress={() =>
                navigation.navigate('AddGroupExpense', {
                  groupId,
                  members: group?.members || [],
                })
              }
              scaleValue={0.95}
              style={styles.actionButtonWrapper}
            >
              <View style={[styles.actionButton, { backgroundColor: colors.primary }]}>
                <View style={styles.actionButtonEmoji}>
                  <Plus size={22} color="#FFFFFF" weight="bold" />
                </View>
                <Text style={styles.actionButtonText}>Add</Text>
              </View>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() =>
                navigation.navigate('SettleUp', {
                  groupId,
                  baseCurrency: group?.baseCurrency,
                })
              }
              scaleValue={0.95}
              style={styles.actionButtonWrapper}
            >
              <View style={[styles.actionButton, { backgroundColor: colors.primary }]}>
                <View style={styles.actionButtonEmoji}>
                  <Check size={22} color="#FFFFFF" weight="bold" />
                </View>
                <Text style={styles.actionButtonText}>Settle</Text>
              </View>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() =>
                navigation.navigate('GroupActivity', { groupId, groupName: group?.name })
              }
              scaleValue={0.95}
              style={styles.actionButtonWrapper}
            >
              <View style={[styles.actionButton, { backgroundColor: colors.primary }]}>
                <View style={styles.actionButtonEmoji}>
                  <ClipboardText size={22} color="#FFFFFF" weight="fill" />
                </View>
                <Text style={styles.actionButtonText}>Activity</Text>
              </View>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() =>
                navigation.navigate('GroupAnalytics', { groupId, groupName: group?.name })
              }
              scaleValue={0.95}
              style={styles.actionButtonWrapper}
            >
              <View style={[styles.actionButton, { backgroundColor: colors.primary }]}>
                <View style={styles.actionButtonEmoji}>
                  <ChartBar size={22} color="#FFFFFF" weight="fill" />
                </View>
                <Text style={styles.actionButtonText}>Analytics</Text>
              </View>
            </AnimatedPressable>
          </View>

          <View style={styles.actionsRow}>
            <AnimatedPressable
              onPress={() =>
                navigation.navigate('InviteMembers', { groupId })
              }
              scaleValue={0.95}
              style={styles.actionButtonWrapper}
            >
              <View style={[styles.actionButton, { backgroundColor: colors.inputBg }]}>
                <View style={styles.actionButtonEmoji}>
                  <UsersThree size={22} color={colors.text} weight="duotone" />
                </View>
                <Text style={[styles.actionButtonText, { color: colors.text }]}>Members</Text>
              </View>
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* Expenses Section */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Expenses</Text>
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
              {expenses.length}
            </Text>
          </View>

          {expenses.length === 0 ? (
            <GlassCard style={styles.emptyCard} tint={isDark ? 'dark' : 'light'}>
              <View style={styles.emptyEmoji}>
                <ClipboardText size={44} color={colors.textTertiary} weight="duotone" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Expenses Yet</Text>
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                Add your first shared expense to start tracking who owes what.
              </Text>
            </GlassCard>
          ) : (
            expenses.map((expense, index) => (
              <Animated.View
                key={expense.id}
                entering={FadeInDown.duration(400).delay(350 + index * 60)}
              >
                <AnimatedPressable
                  onPress={() =>
                    navigation.navigate('GroupExpenseDetail', {
                      groupId,
                      expenseId: expense.id,
                      expense,
                    })
                  }
                  onLongPress={() => handleDeleteExpense(expense)}
                  scaleValue={0.97}
                  style={styles.expenseItemWrapper}
                >
                  <GlassCard style={styles.expenseItem} tint={isDark ? 'dark' : 'light'}>
                    <View style={styles.expenseTop}>
                      <View style={styles.expenseInfo}>
                        <Text style={[styles.expenseDescription, { color: colors.text }]} numberOfLines={1}>
                          {expense.description}
                        </Text>
                        <Text style={[styles.expensePaidBy, { color: colors.textSecondary }]}>
                          Paid by {getPayerName(expense)}
                        </Text>
                      </View>
                      <View style={styles.expenseAmountContainer}>
                        <Text style={[styles.expenseAmount, { color: colors.text }]}>
                          {expense.currency || '$'}{formatAmount(expense.amount)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.expenseBottom}>
                      <View
                        style={[
                          styles.splitBadge,
                          { backgroundColor: getSplitTypeBadgeColor(expense.splitType) + '22' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.splitBadgeText,
                            { color: getSplitTypeBadgeColor(expense.splitType) },
                          ]}
                        >
                          {expense.splitType?.toUpperCase() || 'EQUAL'}
                        </Text>
                      </View>
                      <Text style={[styles.expenseDate, { color: colors.textSecondary }]}>
                        {formatDate(expense.date || expense.createdAt || '')}
                      </Text>
                    </View>
                  </GlassCard>
                </AnimatedPressable>
              </Animated.View>
            ))
          )}
        </Animated.View>
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
    paddingTop: 8,
    paddingBottom: 24,
    borderBottomLeftRadius: BENTO_RADIUS,
    borderBottomRightRadius: BENTO_RADIUS,
  },
  backButton: {
    marginBottom: 8,
    alignSelf: 'flex-start',
    paddingRight: 16,
    paddingVertical: 4,
  },
  backArrow: {
    fontSize: 36,
    fontWeight: '300',
    lineHeight: 36,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  memberCount: {
    fontSize: 15,
    marginTop: 4,
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  inviteCodeLabel: {
    fontSize: 12,
    marginRight: 6,
  },
  inviteCode: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  tapToCopy: {
    fontSize: 10,
    marginLeft: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
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

  // Balance Summary
  balanceCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  balanceHero: {
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
  },
  balanceHeroAmount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  balanceHeroSub: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.85,
  },
  balanceSectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: '700',
  },

  // Action Buttons
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionButtonWrapper: {
    flex: 1,
  },
  actionButton: {
    borderRadius: BENTO_RADIUS,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 15,
    fontWeight: '500',
  },

  // Empty State
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Expense Items
  expenseItemWrapper: {
    marginBottom: 12,
  },
  expenseItem: {
    padding: 16,
  },
  expenseTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  expenseInfo: {
    flex: 1,
    marginRight: 12,
  },
  expenseDescription: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  expensePaidBy: {
    fontSize: 13,
  },
  expenseAmountContainer: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 17,
    fontWeight: '700',
  },
  expenseBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  splitBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  splitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  expenseDate: {
    fontSize: 12,
  },
});
