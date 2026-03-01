import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
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

type SplitType = 'equal' | 'exact' | 'percentage';

interface Member {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function AddGroupExpenseScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const {
    groupId,
    members = [],
    baseCurrency,
  } = (route?.params || {}) as {
    groupId: string;
    members: Member[];
    baseCurrency?: string;
  };

  // Form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState(baseCurrency || 'USD');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paidBy, setPaidBy] = useState<string>(user?.id || '');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    () => new Set(members.map((m) => m.user.id))
  );
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Derived values
  const selectedMemberIds = useMemo(
    () => Array.from(selectedMembers),
    [selectedMembers]
  );

  const splitTypeOptions: { key: SplitType; label: string }[] = [
    { key: 'equal', label: 'Equal' },
    { key: 'exact', label: 'Exact' },
    { key: 'percentage', label: 'Percentage' },
  ];

  // ─── Helpers ────────────────────────────────────────────────────────────────

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
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        // Don't allow deselecting the last member
        if (next.size <= 1) return prev;
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const getMemberName = (userId: string): string => {
    const member = members.find((m) => m.user.id === userId);
    if (!member) return 'Unknown';
    if (userId === user?.id) return `${member.user.name} (You)`;
    return member.user.name;
  };

  const getMemberShortName = (userId: string): string => {
    const member = members.find((m) => m.user.id === userId);
    if (!member) return '?';
    const name = member.user.name;
    if (userId === user?.id) return 'You';
    // Return first name or first 10 characters
    const firstName = name.split(' ')[0];
    return firstName.length > 10 ? firstName.substring(0, 10) : firstName;
  };

  // ─── Validation ─────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than 0');
      return false;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return false;
    }

    if (selectedMemberIds.length === 0) {
      Alert.alert('Error', 'Please select at least one member to split with');
      return false;
    }

    if (splitType === 'exact') {
      const sum = selectedMemberIds.reduce((acc, id) => {
        return acc + (parseFloat(splitAmounts[id] || '0') || 0);
      }, 0);
      // Use a small epsilon for floating point comparison
      if (Math.abs(sum - numericAmount) > 0.01) {
        Alert.alert(
          'Error',
          `Split amounts must equal the total (${numericAmount.toFixed(2)}). Current sum: ${sum.toFixed(2)}`
        );
        return false;
      }
    }

    if (splitType === 'percentage') {
      const sum = selectedMemberIds.reduce((acc, id) => {
        return acc + (parseFloat(splitAmounts[id] || '0') || 0);
      }, 0);
      if (Math.abs(sum - 100) > 0.01) {
        Alert.alert(
          'Error',
          `Percentages must add up to 100%. Current sum: ${sum.toFixed(1)}%`
        );
        return false;
      }
    }

    return true;
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const numericAmount = parseFloat(amount);

      const payload: any = {
        amount: numericAmount,
        currency,
        description: description.trim(),
        date: selectedDate.toISOString(),
        splitType,
        paidBy,
        splitBetween: selectedMemberIds,
      };

      if (splitType === 'exact') {
        payload.splits = selectedMemberIds.map((id) => ({
          userId: id,
          amount: parseFloat(splitAmounts[id] || '0') || 0,
        }));
      }

      if (splitType === 'percentage') {
        payload.splits = selectedMemberIds.map((id) => ({
          userId: id,
          amount: parseFloat(splitAmounts[id] || '0') || 0,
        }));
      }

      await api.createGroupExpense(groupId, payload);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add group expense');
      setLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ─── Glass Header Bar ─────────────────────────────────────────── */}
      <View style={styles.headerWrapper}>
        <LinearGradient
          colors={
            isDark
              ? (['#0D0221', '#1A0533', ACCENT + '80'] as const)
              : (['#1A0533', '#2D1052', ACCENT_LIGHT + '90'] as const)
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
              <Text style={styles.headerTitle}>Add Expense</Text>
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
            {/* ─── Amount Input ───────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)}>
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
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <GlassInput
                label="Description"
                placeholder="What's this for?"
                placeholderColor={colors.textSecondary}
                textColor={colors.text}
                labelColor={colors.textSecondary}
                isDark={isDark}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </Animated.View>

            {/* ─── Currency Input ─────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(300).duration(500)}>
              <GlassInput
                label="Currency"
                placeholder="USD"
                placeholderColor={colors.textSecondary}
                textColor={colors.text}
                labelColor={colors.textSecondary}
                isDark={isDark}
                value={currency}
                onChangeText={(text) => setCurrency(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={3}
              />
            </Animated.View>

            {/* ─── Date Picker Button ─────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(400).duration(500)}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                DATE
              </Text>
              <AnimatedPressable
                onPress={() => {
                  Keyboard.dismiss();
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
                    <Text
                      style={[styles.dateButtonText, { color: colors.text }]}
                    >
                      {'\uD83D\uDCC5'} {formatDate(selectedDate)}
                    </Text>
                    <Text
                      style={[
                        styles.dateButtonHint,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {showDatePicker && Platform.OS === 'ios'
                        ? 'Tap to close'
                        : 'Tap to change'}
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
                      <View
                        style={[
                          styles.datePickerHeader,
                          { borderBottomColor: GLASS.borderColor },
                        ]}
                      >
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
                          if (date) setSelectedDate(date);
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

            {/* ─── Paid By ────────────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(500).duration(500)}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                PAID BY
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScrollView}
                contentContainerStyle={styles.chipScrollContent}
              >
                {members.map((member) => {
                  const isSelected = paidBy === member.user.id;
                  return (
                    <AnimatedPressable
                      key={member.user.id}
                      onPress={() => setPaidBy(member.user.id)}
                      scaleValue={0.95}
                    >
                      {isSelected ? (
                        <LinearGradient
                          colors={[ACCENT, ACCENT_LIGHT]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.chip}
                        >
                          <Text style={styles.chipTextActive}>
                            {getMemberShortName(member.user.id)}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <BlurView
                          intensity={isDark ? 40 : 25}
                          tint={isDark ? 'dark' : 'light'}
                          style={[
                            styles.chip,
                            styles.chipInactive,
                            {
                              backgroundColor: isDark
                                ? GLASS.bgLight
                                : 'rgba(255, 255, 255, 0.6)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: colors.text },
                            ]}
                          >
                            {getMemberShortName(member.user.id)}
                          </Text>
                        </BlurView>
                      )}
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>
            </Animated.View>

            {/* ─── Split Type Toggle ──────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(600).duration(500)}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                SPLIT TYPE
              </Text>
              <View style={styles.splitTypeRow}>
                {splitTypeOptions.map((option) => {
                  const isSelected = splitType === option.key;
                  return (
                    <AnimatedPressable
                      key={option.key}
                      onPress={() => {
                        setSplitType(option.key);
                        // Reset split amounts when changing type
                        setSplitAmounts({});
                      }}
                      scaleValue={0.96}
                      style={styles.splitTypeButtonWrapper}
                    >
                      {isSelected ? (
                        <LinearGradient
                          colors={[ACCENT, ACCENT_LIGHT]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.splitTypeButton}
                        >
                          <Text style={styles.splitTypeButtonTextActive}>
                            {option.label}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <BlurView
                          intensity={isDark ? 40 : 25}
                          tint={isDark ? 'dark' : 'light'}
                          style={[
                            styles.splitTypeButton,
                            styles.splitTypeButtonInactive,
                            {
                              backgroundColor: isDark
                                ? GLASS.bgLight
                                : 'rgba(255, 255, 255, 0.6)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.splitTypeButtonText,
                              { color: colors.text },
                            ]}
                          >
                            {option.label}
                          </Text>
                        </BlurView>
                      )}
                    </AnimatedPressable>
                  );
                })}
              </View>
            </Animated.View>

            {/* ─── Split Between ──────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(700).duration(500)}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                SPLIT BETWEEN
              </Text>
              <GlassCard
                style={styles.membersCard}
                tint={isDark ? 'dark' : 'light'}
              >
                {members.map((member, index) => {
                  const isSelected = selectedMembers.has(member.user.id);
                  return (
                    <AnimatedPressable
                      key={member.user.id}
                      onPress={() => toggleMember(member.user.id)}
                      scaleValue={0.98}
                    >
                      <View
                        style={[
                          styles.memberRow,
                          index < members.length - 1 && {
                            borderBottomWidth: 1,
                            borderBottomColor: GLASS.borderColor,
                          },
                        ]}
                      >
                        <View style={styles.memberInfo}>
                          <View
                            style={[
                              styles.checkbox,
                              isSelected && styles.checkboxSelected,
                            ]}
                          >
                            {isSelected && (
                              <Text style={styles.checkmark}>
                                {'\u2713'}
                              </Text>
                            )}
                          </View>
                          <Text
                            style={[
                              styles.memberName,
                              { color: colors.text },
                              !isSelected && { opacity: 0.5 },
                            ]}
                          >
                            {getMemberName(member.user.id)}
                          </Text>
                        </View>
                        {splitType === 'equal' && isSelected && amount && (
                          <Text
                            style={[
                              styles.memberSplitAmount,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {(
                              parseFloat(amount) / selectedMemberIds.length
                            ).toFixed(2)}
                          </Text>
                        )}
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </GlassCard>
            </Animated.View>

            {/* ─── Per-Person Amounts (Exact / Percentage) ────────────── */}
            {splitType !== 'equal' && selectedMemberIds.length > 0 && (
              <Animated.View entering={FadeInDown.delay(800).duration(500)}>
                <Text
                  style={[styles.fieldLabel, { color: colors.textSecondary }]}
                >
                  {splitType === 'exact'
                    ? 'AMOUNT PER PERSON'
                    : 'PERCENTAGE PER PERSON'}
                </Text>
                {selectedMemberIds.map((memberId) => {
                  const member = members.find((m) => m.user.id === memberId);
                  if (!member) return null;
                  return (
                    <View key={memberId} style={styles.splitInputRow}>
                      <Text
                        style={[
                          styles.splitInputLabel,
                          { color: colors.text },
                        ]}
                      >
                        {getMemberShortName(memberId)}
                      </Text>
                      <View style={styles.splitInputWrapper}>
                        <GlassInput
                          placeholder="0"
                          placeholderColor={colors.textSecondary}
                          textColor={colors.text}
                          isDark={isDark}
                          value={splitAmounts[memberId] || ''}
                          onChangeText={(text) =>
                            setSplitAmounts((prev) => ({
                              ...prev,
                              [memberId]: text,
                            }))
                          }
                          keyboardType="decimal-pad"
                          containerStyle={styles.splitInputContainer}
                        />
                        {splitType === 'percentage' && (
                          <Text
                            style={[
                              styles.percentSuffix,
                              { color: colors.textSecondary },
                            ]}
                          >
                            %
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
                {/* Summary row */}
                <View style={styles.splitSummaryRow}>
                  <Text
                    style={[
                      styles.splitSummaryLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {splitType === 'exact' ? 'Total:' : 'Sum:'}
                  </Text>
                  <Text
                    style={[
                      styles.splitSummaryValue,
                      {
                        color: (() => {
                          const sum = selectedMemberIds.reduce((acc, id) => {
                            return (
                              acc +
                              (parseFloat(splitAmounts[id] || '0') || 0)
                            );
                          }, 0);
                          const target =
                            splitType === 'exact'
                              ? parseFloat(amount) || 0
                              : 100;
                          return Math.abs(sum - target) < 0.01
                            ? '#4CAF50'
                            : '#FF5252';
                        })(),
                      },
                    ]}
                  >
                    {selectedMemberIds
                      .reduce((acc, id) => {
                        return (
                          acc +
                          (parseFloat(splitAmounts[id] || '0') || 0)
                        );
                      }, 0)
                      .toFixed(splitType === 'percentage' ? 1 : 2)}
                    {splitType === 'percentage' ? '%' : ''}{' '}
                    {splitType === 'exact'
                      ? `/ ${(parseFloat(amount) || 0).toFixed(2)}`
                      : '/ 100%'}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* ─── Submit Button ──────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(900).duration(500)}>
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
                    <Text style={styles.submitButtonText}>Add Expense</Text>
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

  // ─── Paid By Chips ───────────────────────────────────────────────────
  chipScrollView: {
    marginBottom: 14,
  },
  chipScrollContent: {
    gap: 10,
    paddingHorizontal: 2,
  },
  chip: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInactive: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── Split Type Toggle ───────────────────────────────────────────────
  splitTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  splitTypeButtonWrapper: {
    flex: 1,
  },
  splitTypeButton: {
    borderRadius: 14,
    overflow: 'hidden',
    padding: 14,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitTypeButtonInactive: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  splitTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  splitTypeButtonTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── Members List ────────────────────────────────────────────────────
  membersCard: {
    padding: 0,
    marginBottom: 18,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberSplitAmount: {
    fontSize: 14,
    fontWeight: '500',
  },

  // ─── Per-Person Split Inputs ─────────────────────────────────────────
  splitInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  splitInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    width: 80,
  },
  splitInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitInputContainer: {
    flex: 1,
    marginBottom: 8,
  },
  percentSuffix: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    marginBottom: 8,
  },
  splitSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 18,
    marginTop: 4,
  },
  splitSummaryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  splitSummaryValue: {
    fontSize: 14,
    fontWeight: '700',
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
