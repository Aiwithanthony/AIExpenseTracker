import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { CheckCircle, CaretUp, CaretDown } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useCachedFetch } from '../hooks/useCachedFetch';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import AnimatedPressable from '../components/AnimatedPressable';

const BENTO_RADIUS = 18;

interface SimplifiedDebt {
  fromUser: string;
  fromUserName: string;
  toUser: string;
  toUserName: string;
  amount: number;
  currency: string;
}

interface BalancesResponse {
  debts: SimplifiedDebt[];
  balances?: any[];
}

interface Settlement {
  id: string;
  fromUser: string;
  fromUserName: string;
  toUser: string;
  toUserName: string;
  amount: number;
  currency: string;
  note?: string;
  createdAt: string;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function SettleUpScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const { groupId, baseCurrency } = route.params as {
    groupId: string;
    baseCurrency?: string;
  };

  const [settling, setSettling] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Cached: instant render on re-entry, silent refresh behind it.
  const { data, loading, refreshing, refresh } = useCachedFetch<{
    balances: BalancesResponse;
    settlements: Settlement[];
  }>(`settle-up:${groupId}`, async () => {
    const [balancesData, settlementsData] = await Promise.all([
      api.getGroupBalances(groupId),
      api.getSettlements(groupId),
    ]);
    return {
      balances: balancesData as BalancesResponse,
      settlements: Array.isArray(settlementsData) ? (settlementsData as Settlement[]) : [],
    };
  });

  const balances = data?.balances ?? null;
  const settlements = data?.settlements ?? [];
  const loadData = refresh;
  const handleRefresh = refresh;

  const handleMarkAsPaid = (debt: SimplifiedDebt) => {
    const displayAmount = formatAmount(debt.amount, debt.currency);
    const recipientName =
      debt.fromUser === user?.id ? debt.toUserName : debt.fromUserName;

    Alert.alert(
      'Record Payment',
      `Record payment of ${displayAmount} to ${recipientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            const debtKey = `${debt.fromUser}-${debt.toUser}`;
            setSettling(debtKey);
            try {
              await api.createSettlement(groupId, {
                toUserId: debt.toUser,
                amount: debt.amount,
                currency: baseCurrency || debt.currency,
              });
              await loadData();
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.message || 'Failed to record payment',
              );
            } finally {
              setSettling(null);
            }
          },
        },
      ],
    );
  };

  const getDebtLabel = (debt: SimplifiedDebt): string => {
    if (user?.id === debt.fromUser) {
      return `You owe ${debt.toUserName}`;
    }
    if (user?.id === debt.toUser) {
      return `${debt.fromUserName} owes you`;
    }
    return `${debt.fromUserName} owes ${debt.toUserName}`;
  };

  const getSettlementLabel = (settlement: Settlement): string => {
    if (user?.id === settlement.fromUser) {
      return `You paid ${settlement.toUserName}`;
    }
    if (user?.id === settlement.toUser) {
      return `${settlement.fromUserName} paid you`;
    }
    return `${settlement.fromUserName} paid ${settlement.toUserName}`;
  };

  const debts = balances?.debts ?? [];

  const cardBg = colors.card;
  const cardBorder = colors.border;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <View
            style={[
              styles.header,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.headerRow}>
              <AnimatedPressable
                onPress={() => navigation.goBack()}
                scaleValue={0.9}
                style={[
                  styles.backButton,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: cardBorder,
                    borderWidth: 0.5,
                  },
                ]}
              >
                <Text style={[styles.backArrow, { color: colors.primary }]}>{'\u2039'}</Text>
              </AnimatedPressable>
              <Text style={[styles.title, { color: colors.text }]}>Settle Up</Text>
              <View style={styles.headerSpacer} />
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.centerContainer}>
          <View
            style={[
              styles.loadingCard,
              {
                backgroundColor: cardBg,
                borderRadius: BENTO_RADIUS,
                borderColor: cardBorder,
                borderWidth: 0.5,
              },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[styles.loadingText, { color: colors.textSecondary }]}
            >
              Loading balances...
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Simplified Debts Section */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(100)}
            style={styles.sectionWrapper}
          >
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              WHO OWES WHO
            </Text>

            {debts.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: cardBg,
                    borderRadius: BENTO_RADIUS,
                    borderColor: cardBorder,
                    borderWidth: 0.5,
                  },
                ]}
              >
                <View style={styles.emptyEmoji}>
                  <CheckCircle size={44} color={colors.success} weight="duotone" />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  All settled up!
                </Text>
                <Text
                  style={[
                    styles.emptyMessage,
                    { color: colors.textSecondary },
                  ]}
                >
                  No outstanding debts in this group.
                </Text>
              </View>
            ) : (
              debts.map((debt, index) => {
                const debtKey = `${debt.fromUser}-${debt.toUser}`;
                const isSettling = settling === debtKey;

                return (
                  <Animated.View
                    key={debtKey}
                    entering={FadeInDown.duration(400).delay(
                      150 + index * 80,
                    )}
                  >
                    <View
                      style={[
                        styles.debtCard,
                        {
                          backgroundColor: cardBg,
                          borderRadius: BENTO_RADIUS,
                          borderColor: cardBorder,
                          borderWidth: 0.5,
                        },
                      ]}
                    >
                      <View style={styles.debtInfo}>
                        <Text
                          style={[styles.debtLabel, { color: colors.text }]}
                        >
                          {getDebtLabel(debt)}
                        </Text>
                        <Text style={[styles.debtAmount, { color: colors.primary }]}>
                          {formatAmount(debt.amount, debt.currency)}
                        </Text>
                      </View>

                      <AnimatedPressable
                        onPress={() => handleMarkAsPaid(debt)}
                        disabled={isSettling}
                        scaleValue={0.95}
                        style={styles.payButtonWrapper}
                      >
                        <View
                          style={[
                            styles.payButton,
                            {
                              backgroundColor: colors.primary,
                            },
                            isSettling && { opacity: 0.6 },
                          ]}
                        >
                          {isSettling ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <Text style={styles.payButtonText}>
                              Mark as Paid
                            </Text>
                          )}
                        </View>
                      </AnimatedPressable>
                    </View>
                  </Animated.View>
                );
              })
            )}
          </Animated.View>

          {/* Settlement History Section */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(300)}
            style={[styles.sectionWrapper, { marginBottom: 40 }]}
          >
            <AnimatedPressable
              onPress={() => setHistoryExpanded(!historyExpanded)}
              scaleValue={0.98}
            >
              <View style={styles.sectionHeaderRow}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.textSecondary, marginBottom: 0 },
                  ]}
                >
                  SETTLEMENT HISTORY
                </Text>
                {historyExpanded ? (
                  <CaretUp size={14} color={colors.textSecondary} weight="bold" />
                ) : (
                  <CaretDown size={14} color={colors.textSecondary} weight="bold" />
                )}
              </View>
            </AnimatedPressable>

            {historyExpanded && (
              <View style={styles.historyContainer}>
                {settlements.length === 0 ? (
                  <View
                    style={[
                      styles.emptyCard,
                      {
                        backgroundColor: cardBg,
                        borderRadius: BENTO_RADIUS,
                        borderColor: cardBorder,
                        borderWidth: 0.5,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.emptyMessage,
                        { color: colors.textSecondary, marginBottom: 0 },
                      ]}
                    >
                      No settlements yet
                    </Text>
                  </View>
                ) : (
                  settlements.map((settlement, index) => (
                    <Animated.View
                      key={settlement.id}
                      entering={FadeInDown.duration(400).delay(index * 60)}
                    >
                      <View
                        style={[
                          styles.settlementCard,
                          {
                            backgroundColor: cardBg,
                            borderRadius: BENTO_RADIUS,
                            borderColor: cardBorder,
                            borderWidth: 0.5,
                          },
                        ]}
                      >
                        <View style={styles.settlementTop}>
                          <Text
                            style={[
                              styles.settlementLabel,
                              { color: colors.text },
                            ]}
                          >
                            {getSettlementLabel(settlement)}
                          </Text>
                          <Text style={[styles.settlementAmount, { color: colors.success }]}>
                            {formatAmount(
                              settlement.amount,
                              settlement.currency,
                            )}
                          </Text>
                        </View>
                        <View style={styles.settlementBottom}>
                          <Text
                            style={[
                              styles.settlementDate,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {formatDate(settlement.createdAt)}
                          </Text>
                          {settlement.note ? (
                            <Text
                              style={[
                                styles.settlementNote,
                                { color: colors.textSecondary },
                              ]}
                              numberOfLines={1}
                            >
                              {settlement.note}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </Animated.View>
                  ))
                )}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backArrow: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '300',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    flex: 1,
  },
  headerSpacer: {
    width: 36,
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
  scrollContent: {
    paddingBottom: 40,
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
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleArrow: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty States
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
    marginBottom: 4,
  },

  // Debt Cards
  debtCard: {
    padding: 16,
    marginBottom: 12,
  },
  debtInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  debtLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
  payButtonWrapper: {
    width: '100%',
  },
  payButton: {
    borderRadius: BENTO_RADIUS,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Settlement History
  historyContainer: {
    gap: 10,
  },
  settlementCard: {
    padding: 16,
  },
  settlementTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settlementLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  settlementAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34C759',
  },
  settlementBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settlementDate: {
    fontSize: 13,
    fontWeight: '500',
  },
  settlementNote: {
    fontSize: 13,
    fontWeight: '400',
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
});
