import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Text } from '../components/AppText';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Wallet, Trash, Plus } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import AnimatedPressable from '../components/AnimatedPressable';
import { useCachedFetch } from '../hooks/useCachedFetch';

const BENTO_RADIUS = 18;

type Period = 'monthly' | 'weekly' | 'yearly';

interface BudgetStatus {
  budget: {
    id: string;
    categoryId: string | null;
    amount: number;
    currency: string;
    period: string;
    category?: { id: string; name: string } | null;
  };
  spent: number;
  remaining: number;
  percentageUsed: number;
}

/** Period → [startDate, endDate] ISO range anchored on today. */
function periodDates(period: Period): { startDate: string; endDate: string } {
  const now = new Date();
  if (period === 'weekly') {
    const end = new Date(now);
    end.setDate(now.getDate() + 6);
    return { startDate: now.toISOString(), endDate: end.toISOString() };
  }
  if (period === 'yearly') {
    return {
      startDate: new Date(now.getFullYear(), 0, 1).toISOString(),
      endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString(),
    };
  }
  return {
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString(),
  };
}

export default function BudgetsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { categories } = useData();

  const { data: statuses, loading, refreshing, error, refresh } = useCachedFetch<BudgetStatus[]>(
    'budgets',
    async () => {
      const budgets: any = await api.getBudgets();
      const list = Array.isArray(budgets) ? budgets : [];
      return Promise.all(list.map((b: any) => api.getBudgetStatus(b.id))) as Promise<BudgetStatus[]>;
    },
  );

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('monthly');

  const openCreate = () => {
    setAmount('');
    setCategoryId(null);
    setPeriod('monthly');
    setShowModal(true);
  };

  const handleCreate = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      Alert.alert('Missing amount', 'Enter a budget amount greater than zero.');
      return;
    }
    setSaving(true);
    try {
      await api.createBudget({
        amount: value,
        currency: user?.currency || 'USD',
        period,
        categoryId: categoryId || undefined,
        ...periodDates(period),
      });
      setShowModal(false);
      refresh();
    } catch (e: any) {
      Alert.alert('Could not create budget', e.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (status: BudgetStatus) => {
    const name = status.budget.category?.name || 'Overall';
    Alert.alert('Delete budget', `Delete the ${name} budget? Transactions are not affected.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteBudget(status.budget.id);
            refresh();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not delete budget.');
          }
        },
      },
    ]);
  };

  const barColor = (pct: number) =>
    pct >= 100 ? colors.error : pct >= 80 ? colors.warning : colors.primary;

  const fmt = (v: number) => (Math.abs(v) >= 10000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(2));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : error ? (
          <GlassCard tint={isDark ? 'dark' : 'light'} style={styles.emptyCard}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Can't reach the server</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Pull down to retry.
            </Text>
          </GlassCard>
        ) : !statuses || statuses.length === 0 ? (
          <GlassCard tint={isDark ? 'dark' : 'light'} style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Wallet size={44} color={colors.textTertiary} weight="duotone" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No budgets yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Set a monthly limit for a category (or overall) and watch the bar as you spend.
            </Text>
          </GlassCard>
        ) : (
          statuses.map((s, i) => {
            const pct = Math.max(0, s.percentageUsed || 0);
            const width = Math.min(100, pct);
            return (
              <Animated.View key={s.budget.id} entering={FadeInDown.duration(350).delay(i * 60)}>
                <GlassCard tint={isDark ? 'dark' : 'light'} style={styles.budgetCard}>
                  <View style={styles.budgetHeader}>
                    <Text style={[styles.budgetName, { color: colors.text }]} numberOfLines={1}>
                      {s.budget.category?.name || 'Overall'}
                    </Text>
                    <AnimatedPressable onPress={() => handleDelete(s)} scaleValue={0.9}>
                      <Trash size={18} color={colors.textTertiary} weight="duotone" />
                    </AnimatedPressable>
                  </View>
                  <Text style={[styles.budgetPeriod, { color: colors.textTertiary }]}>
                    {s.budget.period}
                  </Text>
                  <View style={[styles.track, { backgroundColor: colors.inputBg }]}>
                    <View
                      style={[styles.fill, { width: `${width}%`, backgroundColor: barColor(pct) }]}
                    />
                  </View>
                  <View style={styles.budgetFooter}>
                    <Text style={[styles.budgetSpent, { color: barColor(pct) }]}>
                      {fmt(s.spent)} / {fmt(s.budget.amount)} {s.budget.currency}
                    </Text>
                    <Text style={[styles.budgetRemaining, { color: colors.textSecondary }]}>
                      {s.remaining >= 0
                        ? `${fmt(s.remaining)} left`
                        : `${fmt(Math.abs(s.remaining))} over`}
                    </Text>
                  </View>
                </GlassCard>
              </Animated.View>
            );
          })
        )}

        <AnimatedPressable onPress={openCreate} scaleValue={0.97}>
          <View style={[styles.addButton, { backgroundColor: colors.primary }]}>
            <Plus size={20} color="#FFFFFF" weight="bold" />
            <Text style={styles.addButtonText}>New Budget</Text>
          </View>
        </AnimatedPressable>
      </ScrollView>

      {/* Create modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New budget</Text>

            <GlassInput
              label={`Amount (${user?.currency || 'USD'}) *`}
              isDark={isDark}
              textColor={colors.text}
              labelColor={colors.textSecondary}
              placeholderColor={colors.textTertiary}
              placeholder="400"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PERIOD</Text>
            <View style={styles.chipRow}>
              {(['monthly', 'weekly', 'yearly'] as Period[]).map((p) => {
                const active = period === p;
                return (
                  <AnimatedPressable key={p} onPress={() => setPeriod(p)} style={{ flex: 1 }}>
                    <View
                      style={[
                        styles.chip,
                        active
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: colors.inputBg, borderColor: colors.borderStrong },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? '#fefefe' : colors.text }]}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
              {[{ id: null, name: 'Overall' }, ...categories].map((cat: any) => {
                const active = categoryId === cat.id;
                return (
                  <AnimatedPressable key={cat.id ?? 'overall'} onPress={() => setCategoryId(cat.id)}>
                    <View
                      style={[
                        styles.chip,
                        active
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: colors.inputBg, borderColor: colors.borderStrong },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? '#fefefe' : colors.text }]}>
                        {cat.name}
                      </Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>

            <AnimatedPressable onPress={handleCreate} disabled={saving} scaleValue={0.97}>
              <View style={[styles.saveButton, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}>
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Create Budget</Text>
                )}
              </View>
            </AnimatedPressable>
            <AnimatedPressable onPress={() => !saving && setShowModal(false)} scaleValue={0.97}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </AnimatedPressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  emptyCard: { alignItems: 'center', padding: 28 },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  budgetCard: { padding: 18, marginBottom: 14 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetName: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 10 },
  budgetPeriod: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2, marginBottom: 10 },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 999 },
  budgetFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  budgetSpent: { fontSize: 13, fontWeight: '700' },
  budgetRemaining: { fontSize: 13, fontWeight: '500' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: BENTO_RADIUS,
    paddingVertical: 16,
    marginTop: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0.5,
    padding: 22,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chipScroll: { gap: 8, paddingBottom: 14, paddingRight: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  saveButton: { borderRadius: BENTO_RADIUS, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  cancelText: { textAlign: 'center', fontSize: 15, fontWeight: '600', marginTop: 16 },
});
