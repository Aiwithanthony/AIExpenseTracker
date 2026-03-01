import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
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

  const [balances, setBalances] = useState<BalancesResponse | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settling, setSettling] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [balancesData, settlementsData] = await Promise.all([
        api.getGroupBalances(groupId),
        api.getSettlements(groupId),
      ]);
      setBalances(balancesData as BalancesResponse);
      setSettlements(
        Array.isArray(settlementsData) ? settlementsData : [],
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load settlement data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

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

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#0D0D0D' : colors.background },
      ]}
    >
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <LinearGradient
            colors={['#1A0030', '#2D004F', ACCENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerRow}>
              <AnimatedPressable
                onPress={() => navigation.goBack()}
                scaleValue={0.9}
                style={styles.backButton}
              >
                <Text style={styles.backArrow}>{'\u2039'}</Text>
              </AnimatedPressable>
              <Text style={styles.title}>Settle Up</Text>
              <View style={styles.headerSpacer} />
            </View>
          </LinearGradient>
        </Animated.View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.centerContainer}>
          <GlassCard
            style={styles.loadingCard}
            tint={isDark ? 'dark' : 'light'}
          >
            <ActivityIndicator size="large" color={ACCENT} />
            <Text
              style={[styles.loadingText, { color: colors.textSecondary }]}
            >
              Loading balances...
            </Text>
          </GlassCard>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={ACCENT}
              colors={[ACCENT]}
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
              <GlassCard
                style={styles.emptyCard}
                tint={isDark ? 'dark' : 'light'}
              >
                <Text style={styles.emptyEmoji}>{'\u2705'}</Text>
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
              </GlassCard>
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
                    <GlassCard
                      style={styles.debtCard}
                      tint={isDark ? 'dark' : 'light'}
                    >
                      <View style={styles.debtInfo}>
                        <Text
                          style={[styles.debtLabel, { color: colors.text }]}
                        >
                          {getDebtLabel(debt)}
                        </Text>
                        <Text style={styles.debtAmount}>
                          {formatAmount(debt.amount, debt.currency)}
                        </Text>
                      </View>

                      <AnimatedPressable
                        onPress={() => handleMarkAsPaid(debt)}
                        disabled={isSettling}
                        scaleValue={0.95}
                        style={styles.payButtonWrapper}
                      >
                        <LinearGradient
                          colors={[ACCENT, ACCENT_LIGHT]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.payButton,
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
                        </LinearGradient>
                      </AnimatedPressable>
                    </GlassCard>
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
                <Text
                  style={[
                    styles.toggleArrow,
                    { color: colors.textSecondary },
                  ]}
                >
                  {historyExpanded ? '\u25B2' : '\u25BC'}
                </Text>
              </View>
            </AnimatedPressable>

            {historyExpanded && (
              <View style={styles.historyContainer}>
                {settlements.length === 0 ? (
                  <GlassCard
                    style={styles.emptyCard}
                    tint={isDark ? 'dark' : 'light'}
                  >
                    <Text
                      style={[
                        styles.emptyMessage,
                        { color: colors.textSecondary, marginBottom: 0 },
                      ]}
                    >
                      No settlements yet
                    </Text>
                  </GlassCard>
                ) : (
                  settlements.map((settlement, index) => (
                    <Animated.View
                      key={settlement.id}
                      entering={FadeInDown.duration(400).delay(index * 60)}
                    >
                      <GlassCard
                        style={styles.settlementCard}
                        tint={isDark ? 'dark' : 'light'}
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
                          <Text style={styles.settlementAmount}>
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
                      </GlassCard>
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
    borderBottomLeftRadius: GLASS.borderRadius,
    borderBottomRightRadius: GLASS.borderRadius,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backArrow: {
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 32,
    fontWeight: '300',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    color: ACCENT_LIGHT,
  },
  payButtonWrapper: {
    width: '100%',
  },
  payButton: {
    borderRadius: GLASS.borderRadius,
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
