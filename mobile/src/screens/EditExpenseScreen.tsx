import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
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

export default function EditExpenseScreen({ navigation, route }: any) {
  const { expenseId, expense: initialExpense } = route.params; // Get expense from params
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { refreshExpenses } = useData();
  const [loading, setLoading] = useState(!initialExpense); // Only show loading if no initial data
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(initialExpense?.amount?.toString() || '');
  const [description, setDescription] = useState(initialExpense?.description || '');
  const [merchant, setMerchant] = useState(initialExpense?.merchant || '');
  const [date, setDate] = useState(
    initialExpense?.date
      ? new Date(initialExpense.date).toISOString().split('T')[0]
      : ''
  );

  useEffect(() => {
    // If we have initial data, populate form immediately
    if (initialExpense) {
      setAmount(initialExpense.amount?.toString() || '');
      setDescription(initialExpense.description || '');
      setMerchant(initialExpense.merchant || '');
      setDate(
        initialExpense.date
          ? new Date(initialExpense.date).toISOString().split('T')[0]
          : ''
      );
    }

    // Always fetch fresh data in background to ensure we have latest
    loadExpense();
  }, []);

  const loadExpense = async () => {
    try {
      const expense = await api.getExpense(expenseId);
      // Update form with fresh data (in case it changed)
      setAmount(expense.amount?.toString() || '');
      setDescription(expense.description || '');
      setMerchant(expense.merchant || '');
      setDate(expense.date ? new Date(expense.date).toISOString().split('T')[0] : '');
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
        date: date ? new Date(date).toISOString() : undefined,
      });

      // Refresh cache in background (don't wait for it)
      refreshExpenses().catch(() => {
        // Silently fail - cache will refresh on next navigation
      });

      // Navigate immediately - no blocking alert
      navigation.navigate('Expenses', { refresh: true });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update expense');
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteExpense(expenseId);
              Alert.alert('Success', 'Expense deleted successfully', [
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
        <GlassCard
          style={styles.loadingCard}
          intensity={GLASS.blurIntensity}
          tint={isDark ? 'dark' : 'light'}
        >
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading expense{'\u2026'}
          </Text>
        </GlassCard>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[ACCENT, ACCENT_LIGHT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerBar}
      >
        <Text style={styles.headerTitle}>{'\u270F\uFE0F'} Edit Expense</Text>
      </LinearGradient>

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
            intensity={GLASS.blurIntensity}
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
              placeholder="What was this expense for?"
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

            {/* Date */}
            <GlassInput
              label="Date"
              isDark={isDark}
              textColor={colors.text}
              labelColor={colors.textSecondary}
              placeholderColor={colors.textSecondary}
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={setDate}
            />
          </GlassCard>

          {/* Update Button */}
          <AnimatedPressable
            onPress={handleUpdate}
            disabled={saving}
            style={styles.updatePressable}
          >
            <LinearGradient
              colors={[ACCENT, ACCENT_LIGHT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.updateButton, saving && styles.buttonDisabled]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.updateButtonText}>
                  {'\u2714\uFE0F'} Update Expense
                </Text>
              )}
            </LinearGradient>
          </AnimatedPressable>

          {/* Delete Button */}
          <AnimatedPressable
            onPress={handleDelete}
            disabled={saving}
            style={styles.deletePressable}
          >
            <BlurView
              intensity={isDark ? 40 : 25}
              tint={isDark ? 'dark' : 'light'}
              style={[
                styles.deleteButton,
                { borderColor: colors.error },
                saving && styles.buttonDisabled,
              ]}
            >
              <Text style={[styles.deleteButtonText, { color: colors.error }]}>
                {'\uD83D\uDDD1\uFE0F'} Delete Expense
              </Text>
            </BlurView>
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
  headerBar: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: GLASS.borderRadius,
    borderBottomRightRadius: GLASS.borderRadius,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
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
  updatePressable: {
    borderRadius: GLASS.borderRadius,
    overflow: 'hidden',
    marginBottom: 12,
  },
  updateButton: {
    borderRadius: GLASS.borderRadius,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  deletePressable: {
    borderRadius: GLASS.borderRadius,
    overflow: 'hidden',
  },
  deleteButton: {
    borderWidth: 1.5,
    borderRadius: GLASS.borderRadius,
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
