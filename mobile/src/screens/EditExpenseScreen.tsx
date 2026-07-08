import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '../components/AppText';
import { Check, Trash } from 'phosphor-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import DateField from '../components/DateField';
import AnimatedPressable from '../components/AnimatedPressable';

const BENTO_RADIUS = 18;

export default function EditExpenseScreen({ navigation, route }: any) {
  const { expenseId, expense: initialExpense } = route.params; // Get expense from params
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { refreshExpenses, categories } = useData();
  const [loading, setLoading] = useState(!initialExpense); // Only show loading if no initial data
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(initialExpense?.amount?.toString() || '');
  const [description, setDescription] = useState(initialExpense?.description || '');
  const [merchant, setMerchant] = useState(initialExpense?.merchant || '');
  const [categoryId, setCategoryId] = useState<string | null>(
    initialExpense?.categoryId || initialExpense?.category?.id || null
  );
  const [date, setDate] = useState<Date>(
    initialExpense?.date ? new Date(initialExpense.date) : new Date()
  );
  // Track whether this transaction is income or an expense so every label on
  // the screen reads correctly (an income showed "Edit Expense" before).
  const [type, setType] = useState<'income' | 'expense'>(
    initialExpense?.type === 'income' ? 'income' : 'expense'
  );
  const isIncome = type === 'income';
  const noun = isIncome ? 'Income' : 'Expense';
  const nounLower = isIncome ? 'income' : 'expense';

  useEffect(() => {
    // If we have initial data, populate form immediately
    if (initialExpense) {
      setAmount(initialExpense.amount?.toString() || '');
      setDescription(initialExpense.description || '');
      setMerchant(initialExpense.merchant || '');
      if (initialExpense.date) {
        setDate(new Date(initialExpense.date));
      }
      setType(initialExpense.type === 'income' ? 'income' : 'expense');
    }

    // Always fetch fresh data in background to ensure we have latest
    loadExpense();
  }, []);

  // Keep the native stack header title in sync with the transaction kind.
  useEffect(() => {
    navigation.setOptions({ title: `Edit ${noun}` });
  }, [noun, navigation]);

  const loadExpense = async () => {
    try {
      const expense = await api.getExpense(expenseId);
      // Update form with fresh data (in case it changed)
      setAmount(expense.amount?.toString() || '');
      setDescription(expense.description || '');
      setMerchant(expense.merchant || '');
      setCategoryId((expense as any).categoryId || (expense as any).category?.id || null);
      if (expense.date) setDate(new Date(expense.date));
      setType((expense as any).type === 'income' ? 'income' : 'expense');
    } catch (error: any) {
      // Only show error if we don't have initial data
      if (!initialExpense) {
        Alert.alert('Error', error.message || 'Failed to load expense');
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!amount || !description) {
      Alert.alert('Error', 'Please fill in amount and description');
      return;
    }

    setSaving(true);
    try {
      await api.updateExpense(expenseId, {
        amount: parseFloat(amount),
        description,
        merchant: merchant || undefined,
        categoryId: categoryId || null,
        date: date.toISOString(),
      });

      // Refresh cache in background (don't wait for it)
      refreshExpenses().catch(() => {
        // Silently fail - cache will refresh on next navigation
      });

      // Navigate immediately - no blocking alert
      navigation.navigate('Expenses', { refresh: true });
    } catch (error: any) {
      // Keep the edited values and offer a one-tap retry on flaky connections.
      setSaving(false);
      Alert.alert(
        'Could Not Save',
        error.message || `Failed to update ${nounLower}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleUpdate() },
        ],
      );
    }
  };

  const handleDelete = () => {
    Alert.alert(
      `Delete ${noun}`,
      `Are you sure you want to delete this ${nounLower}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteExpense(expenseId);
              Alert.alert('Success', `${noun} deleted successfully`, [
                { text: 'OK', onPress: () => navigation.navigate('Expenses', { refresh: true }) },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete expense');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.loadingCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 0.5,
              borderRadius: BENTO_RADIUS,
            },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading expense{'\u2026'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500).springify()}>
          <GlassCard
            style={styles.formCard}
            tint={isDark ? 'dark' : 'light'}
          >
            {/* Amount */}
            <GlassInput
              label="Amount *"
              isDark={isDark}
              textColor={colors.text}
              labelColor={colors.textSecondary}
              placeholderColor={colors.textSecondary}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            {/* Description */}
            <GlassInput
              label="Description *"
              isDark={isDark}
              textColor={colors.text}
              labelColor={colors.textSecondary}
              placeholderColor={colors.textSecondary}
              placeholder={`What was this ${nounLower} for?`}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />

            {/* Merchant */}
            <GlassInput
              label="Merchant"
              isDark={isDark}
              textColor={colors.text}
              labelColor={colors.textSecondary}
              placeholderColor={colors.textSecondary}
              placeholder="Merchant (Optional)"
              value={merchant}
              onChangeText={setMerchant}
            />

            {/* Category */}
            {categories.length > 0 && (
              <>
                <Text style={[styles.categoryLabel, { color: colors.textSecondary }]}>
                  Category
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {categories.map((cat: any) => {
                    const selected = categoryId === cat.id;
                    return (
                      <AnimatedPressable
                        key={cat.id}
                        onPress={() => setCategoryId(selected ? null : cat.id)}
                      >
                        <View
                          style={[
                            styles.categoryChip,
                            selected
                              ? { backgroundColor: colors.primary, borderColor: colors.primary }
                              : {
                                  backgroundColor: colors.inputBg,
                                  borderColor: colors.borderStrong,
                                },
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              { color: selected ? '#fefefe' : colors.text },
                            ]}
                          >
                            {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                          </Text>
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Date */}
            <DateField value={date} onChange={setDate} maximumDate={new Date()} />
          </GlassCard>

          {/* Update Button */}
          <AnimatedPressable
            onPress={handleUpdate}
            disabled={saving}
            style={styles.updatePressable}
          >
            <View
              style={[
                styles.updateButton,
                { backgroundColor: colors.primary },
                saving && styles.buttonDisabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.buttonRow}>
                  <Check size={20} color="#FFFFFF" weight="bold" />
                  <Text style={styles.updateButtonText}>Update {noun}</Text>
                </View>
              )}
            </View>
          </AnimatedPressable>

          {/* Delete Button */}
          <AnimatedPressable
            onPress={handleDelete}
            disabled={saving}
            style={styles.deletePressable}
          >
            <View
              style={[
                styles.deleteButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.error,
                },
                saving && styles.buttonDisabled,
              ]}
            >
              <View style={styles.buttonRow}>
                <Trash size={20} color={colors.error} weight="duotone" />
                <Text style={[styles.deleteButtonText, { color: colors.error }]}>Delete {noun}</Text>
              </View>
            </View>
          </AnimatedPressable>
        </Animated.View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formCard: {
    padding: 20,
    marginBottom: 20,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  categoryRow: {
    gap: 8,
    paddingBottom: 8,
    paddingRight: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  updatePressable: {
    borderRadius: BENTO_RADIUS,
    overflow: 'hidden',
    marginBottom: 12,
  },
  updateButton: {
    borderRadius: BENTO_RADIUS,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  deletePressable: {
    borderRadius: BENTO_RADIUS,
    overflow: 'hidden',
  },
  deleteButton: {
    borderWidth: 1.5,
    borderRadius: BENTO_RADIUS,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
