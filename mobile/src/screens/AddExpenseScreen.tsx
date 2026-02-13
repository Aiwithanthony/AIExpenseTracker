import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
// SafeAreaView not needed - stack navigator handles safe area
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { api } from '../services/api';
import GlassInput from '../components/GlassInput';
import AnimatedPressable from '../components/AnimatedPressable';

// Design system tokens
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

export default function AddExpenseScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { refreshExpenses } = useData();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  // Get initial type from route params, default to 'expense'
  const [type, setType] = useState<'expense' | 'income'>(
    route?.params?.type || 'expense'
  );
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !description) {
      Alert.alert('Error', 'Please fill in amount and description');
      return;
    }

    setLoading(true);
    try {
      await api.createExpense({
        amount: parseFloat(amount),
        currency: user?.currency || 'USD',
        description,
        merchant: merchant || undefined,
        date: selectedDate.toISOString(),
        type,
        tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
      });

      // Refresh cache in background (don't wait for it)
      refreshExpenses().catch(() => {
        // Silently fail - cache will refresh on next navigation
      });

      // Navigate back immediately for instant feedback
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add expense');
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      // On iOS, keep picker open until user taps "Done" or date field again
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ─── Glass Header Bar ─────────────────────────────────────────── */}
      <View style={styles.headerWrapper}>
        <LinearGradient
          colors={isDark
            ? ['#0D0221', '#1A0533', ACCENT + '80'] as const
            : ['#1A0533', '#2D1052', ACCENT_LIGHT + '90'] as const
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerSafeArea}>
            <View style={styles.headerContent}>
              <AnimatedPressable
                onPress={() => navigation.goBack()}
                scaleValue={0.93}
              >
                <BlurView
                  intensity={40}
                  tint="light"
                  style={styles.glassBackButton}
                >
                  <Text style={styles.glassBackButtonText}>{'\u2190'}</Text>
                </BlurView>
              </AnimatedPressable>
              <Text style={styles.headerTitle}>
                {type === 'income' ? 'Add Income' : 'Add Transaction'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ─── Form Content ─────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Type Selector ──────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <View style={styles.typeSelector}>
              <AnimatedPressable
                onPress={() => setType('expense')}
                scaleValue={0.96}
                style={styles.typeButtonWrapper}
              >
                {type === 'expense' ? (
                  <LinearGradient
                    colors={[ACCENT, ACCENT_LIGHT]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.typeButton}
                  >
                    <Text style={styles.typeButtonTextActive}>
                      {'\uD83D\uDCB8'} Expense
                    </Text>
                  </LinearGradient>
                ) : (
                  <BlurView
                    intensity={isDark ? 40 : 25}
                    tint={isDark ? 'dark' : 'light'}
                    style={[
                      styles.typeButton,
                      styles.typeButtonInactive,
                    ]}
                  >
                    <Text style={[styles.typeButtonText, { color: colors.text }]}>
                      {'\uD83D\uDCB8'} Expense
                    </Text>
                  </BlurView>
                )}
              </AnimatedPressable>

              <AnimatedPressable
                onPress={() => setType('income')}
                scaleValue={0.96}
                style={styles.typeButtonWrapper}
              >
                {type === 'income' ? (
                  <LinearGradient
                    colors={[ACCENT, ACCENT_LIGHT]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.typeButton}
                  >
                    <Text style={styles.typeButtonTextActive}>
                      {'\uD83D\uDCB0'} Income
                    </Text>
                  </LinearGradient>
                ) : (
                  <BlurView
                    intensity={isDark ? 40 : 25}
                    tint={isDark ? 'dark' : 'light'}
                    style={[
                      styles.typeButton,
                      styles.typeButtonInactive,
                    ]}
                  >
                    <Text style={[styles.typeButtonText, { color: colors.text }]}>
                      {'\uD83D\uDCB0'} Income
                    </Text>
                  </BlurView>
                )}
              </AnimatedPressable>
            </View>
          </Animated.View>

          {/* ─── Amount Input ───────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <GlassInput
              label="Amount"
              placeholder="0.00"
              placeholderColor={colors.textSecondary}
              textColor={colors.text}
              labelColor={colors.textSecondary}
              isDark={isDark}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </Animated.View>

          {/* ─── Description Input ──────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <GlassInput
              label="Description"
              placeholder="What was this for?"
              placeholderColor={colors.textSecondary}
              textColor={colors.text}
              labelColor={colors.textSecondary}
              isDark={isDark}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </Animated.View>

          {/* ─── Merchant Input ─────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)}>
            <GlassInput
              label="Merchant"
              placeholder="Merchant (Optional)"
              placeholderColor={colors.textSecondary}
              textColor={colors.text}
              labelColor={colors.textSecondary}
              isDark={isDark}
              value={merchant}
              onChangeText={setMerchant}
            />
          </Animated.View>

          {/* ─── Date Picker Button ─────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(500).duration(500)}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              DATE
            </Text>
            <AnimatedPressable
              onPress={() => {
                // Always dismiss keyboard first
                Keyboard.dismiss();

                // Toggle picker (open if closed, close if open)
                setShowDatePicker(!showDatePicker);
              }}
              scaleValue={0.98}
            >
              <BlurView
                intensity={isDark ? 40 : 25}
                tint={isDark ? 'dark' : 'light'}
                style={[
                  styles.dateButton,
                  {
                    backgroundColor: isDark
                      ? GLASS.bgLight
                      : 'rgba(255, 255, 255, 0.6)',
                  },
                ]}
              >
                <View style={styles.dateButtonContent}>
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>
                    {'\uD83D\uDCC5'} {formatDate(selectedDate)}
                  </Text>
                  <Text style={[styles.dateButtonHint, { color: colors.textSecondary }]}>
                    {showDatePicker && Platform.OS === 'ios' ? 'Tap to close' : 'Tap to change'}
                  </Text>
                </View>
              </BlurView>
            </AnimatedPressable>

            {showDatePicker && (
              <>
                {Platform.OS === 'ios' && (
                  <BlurView
                    intensity={isDark ? GLASS.blurIntensity : 40}
                    tint={isDark ? 'dark' : 'light'}
                    style={[
                      styles.datePickerContainer,
                      {
                        backgroundColor: isDark
                          ? GLASS.bgLight
                          : 'rgba(255, 255, 255, 0.6)',
                      },
                    ]}
                  >
                    <View style={[styles.datePickerHeader, { borderBottomColor: GLASS.borderColor }]}>
                      <AnimatedPressable
                        onPress={() => setShowDatePicker(false)}
                        scaleValue={0.95}
                      >
                        <LinearGradient
                          colors={[ACCENT, ACCENT_LIGHT]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.datePickerDoneButton}
                        >
                          <Text style={styles.datePickerDoneText}>Done</Text>
                        </LinearGradient>
                      </AnimatedPressable>
                    </View>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="spinner"
                      onChange={(event, date) => {
                        if (date) {
                          setSelectedDate(date);
                        }
                      }}
                      maximumDate={new Date()}
                      themeVariant={isDark ? 'dark' : 'light'}
                    />
                  </BlurView>
                )}
                {Platform.OS === 'android' && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    themeVariant={isDark ? 'dark' : 'light'}
                  />
                )}
              </>
            )}
          </Animated.View>

          {/* ─── Tags Input ─────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(600).duration(500)}>
            <GlassInput
              label="Tags"
              placeholder="Tags (comma-separated, optional)"
              placeholderColor={colors.textSecondary}
              textColor={colors.text}
              labelColor={colors.textSecondary}
              isDark={isDark}
              value={tags}
              onChangeText={setTags}
            />
          </Animated.View>

          {/* ─── Submit Button ──────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(700).duration(500)}>
            <AnimatedPressable
              onPress={handleSubmit}
              disabled={loading}
              scaleValue={0.97}
              pressedOpacity={0.9}
            >
              <LinearGradient
                colors={[ACCENT, ACCENT_LIGHT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.submitButton,
                  loading && styles.submitButtonDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Add {type === 'income' ? 'Income' : 'Expense'}
                  </Text>
                )}
              </LinearGradient>
            </AnimatedPressable>
          </Animated.View>

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ─── Header ──────────────────────────────────────────────────────────
  headerWrapper: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingBottom: 14,
  },
  headerSafeArea: {},
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  glassBackButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  glassBackButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // ─── Scroll / Content ────────────────────────────────────────────────
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
  },

  // ─── Type Selector ───────────────────────────────────────────────────
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeButtonWrapper: {
    flex: 1,
  },
  typeButton: {
    borderRadius: 14,
    overflow: 'hidden',
    padding: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonInactive: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── Field Label ─────────────────────────────────────────────────────
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },

  // ─── Date Button ─────────────────────────────────────────────────────
  dateButton: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    marginBottom: 14,
  },
  dateButtonContent: {
    flex: 1,
  },
  dateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateButtonHint: {
    fontSize: 12,
  },

  // ─── Date Picker Container (iOS) ────────────────────────────────────
  datePickerContainer: {
    marginTop: 4,
    marginBottom: 14,
    borderRadius: GLASS.borderRadius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderBottomWidth: 1,
  },
  datePickerDoneButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  datePickerDoneText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── Submit Button ───────────────────────────────────────────────────
  submitButton: {
    borderRadius: 14,
    padding: 16,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
