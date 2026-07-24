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
import { Repeat, Trash, Plus, Wallet } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import AnimatedPressable from '../components/AnimatedPressable';
import CategoryIcon from '../components/CategoryIcon';
import { useCachedFetch } from '../hooks/useCachedFetch';

const BENTO_RADIUS = 18;

interface Template {
  id: string;
  name: string;
  amount: number;
  currency: string;
  categoryId: string | null;
  description: string | null;
  merchant: string | null;
  type: 'expense' | 'income';
}

export default function RecurringScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { categories, refreshExpenses } = useData();

  const { data: templates, loading, refreshing, error, refresh } = useCachedFetch<Template[]>(
    'templates',
    async () => {
      const list: any = await api.getTemplates();
      return Array.isArray(list) ? list : [];
    },
  );

  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const categoryName = (id: string | null) =>
    categories.find((c: any) => c.id === id)?.name;

  const openCreate = () => {
    setName('');
    setAmount('');
    setMerchant('');
    setType('expense');
    setCategoryId(null);
    setShowModal(true);
  };

  const handleCreate = async () => {
    const value = parseFloat(amount);
    if (!name.trim() || !value || value <= 0) {
      Alert.alert('Missing fields', 'Give it a name and an amount.');
      return;
    }
    setSaving(true);
    try {
      await api.createTemplate({
        name: name.trim(),
        amount: value,
        currency: user?.currency || 'USD',
        type,
        categoryId: categoryId || undefined,
        merchant: merchant.trim() || undefined,
      });
      setShowModal(false);
      refresh();
    } catch (e: any) {
      Alert.alert('Could not save', e.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogNow = async (t: Template) => {
    setLoggingId(t.id);
    try {
      await api.createExpenseFromTemplate(t.id);
      refreshExpenses().catch(() => {});
      Alert.alert('Logged', `"${t.name}" added to your transactions for today.`);
    } catch (e: any) {
      Alert.alert('Could not log', e.message || 'Try again.');
    } finally {
      setLoggingId(null);
    }
  };

  const handleDelete = (t: Template) => {
    Alert.alert('Delete recurring item', `Delete "${t.name}"? Logged transactions stay.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteTemplate(t.id);
            refresh();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not delete.');
          }
        },
      },
    ]);
  };

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
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Pull down to retry.</Text>
          </GlassCard>
        ) : !templates || templates.length === 0 ? (
          <GlassCard tint={isDark ? 'dark' : 'light'} style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Repeat size={44} color={colors.textTertiary} weight="duotone" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing recurring yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Save things you log every month — salary, rent, subscriptions — and add
              them with one tap instead of retyping.
            </Text>
          </GlassCard>
        ) : (
          templates.map((t, i) => {
            const isIncome = t.type === 'income';
            return (
              <Animated.View key={t.id} entering={FadeInDown.duration(350).delay(i * 60)}>
                <GlassCard tint={isDark ? 'dark' : 'light'} style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <View
                      style={[
                        styles.itemBadge,
                        { backgroundColor: isIncome ? colors.tintCool : colors.tintWarm },
                      ]}
                    >
                      {isIncome ? (
                        <Wallet size={20} color={colors.tintCoolText} weight="duotone" />
                      ) : (
                        <CategoryIcon
                          name={categoryName(t.categoryId)}
                          size={20}
                          color={colors.tintWarmText}
                        />
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                        {t.name}
                      </Text>
                      <Text style={[styles.itemSub, { color: colors.textSecondary }]} numberOfLines={1}>
                        {isIncome ? '+' : '−'}
                        {fmt(t.amount)} {t.currency}
                        {t.merchant ? ` · ${t.merchant}` : ''}
                      </Text>
                    </View>
                    <AnimatedPressable
                      onPress={() => handleLogNow(t)}
                      disabled={loggingId === t.id}
                      scaleValue={0.93}
                    >
                      <View style={[styles.logButton, { backgroundColor: colors.primary }]}>
                        {loggingId === t.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.logButtonText}>Log now</Text>
                        )}
                      </View>
                    </AnimatedPressable>
                    <AnimatedPressable onPress={() => handleDelete(t)} scaleValue={0.9}>
                      <Trash size={18} color={colors.textTertiary} weight="duotone" />
                    </AnimatedPressable>
                  </View>
                </GlassCard>
              </Animated.View>
            );
          })
        )}

        <AnimatedPressable onPress={openCreate} scaleValue={0.97}>
          <View style={[styles.addButton, { backgroundColor: colors.primary }]}>
            <Plus size={20} color="#FFFFFF" weight="bold" />
            <Text style={styles.addButtonText}>New Recurring Item</Text>
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>New recurring item</Text>

            <View style={styles.chipRow}>
              {(['expense', 'income'] as const).map((tp) => {
                const active = type === tp;
                return (
                  <AnimatedPressable key={tp} onPress={() => setType(tp)} style={{ flex: 1 }}>
                    <View
                      style={[
                        styles.chip,
                        active
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: colors.inputBg, borderColor: colors.borderStrong },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? '#fefefe' : colors.text }]}>
                        {tp === 'expense' ? 'Expense' : 'Income'}
                      </Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>

            <GlassInput
              label="Name *"
              isDark={isDark}
              textColor={colors.text}
              labelColor={colors.textSecondary}
              placeholderColor={colors.textTertiary}
              placeholder={type === 'income' ? 'Salary' : 'Rent'}
              value={name}
              onChangeText={setName}
            />
            <GlassInput
              label={`Amount (${user?.currency || 'USD'}) *`}
              isDark={isDark}
              textColor={colors.text}
              labelColor={colors.textSecondary}
              placeholderColor={colors.textTertiary}
              placeholder="800"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <GlassInput
              label="Merchant"
              isDark={isDark}
              textColor={colors.text}
              labelColor={colors.textSecondary}
              placeholderColor={colors.textTertiary}
              placeholder="Optional"
              value={merchant}
              onChangeText={setMerchant}
            />

            {type === 'expense' && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CATEGORY</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipScroll}
                >
                  {categories.map((cat: any) => {
                    const active = categoryId === cat.id;
                    return (
                      <AnimatedPressable
                        key={cat.id}
                        onPress={() => setCategoryId(active ? null : cat.id)}
                      >
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
              </>
            )}

            <AnimatedPressable onPress={handleCreate} disabled={saving} scaleValue={0.97}>
              <View style={[styles.saveButton, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}>
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
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
  itemCard: { padding: 14, marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700' },
  itemSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  logButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    minWidth: 76,
    alignItems: 'center',
  },
  logButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
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
