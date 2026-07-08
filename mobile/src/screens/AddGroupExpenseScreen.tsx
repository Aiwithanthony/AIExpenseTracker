import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Text, TextInput } from '../components/AppText';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarBlank, CaretLeft, Check } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import AnimatedPressable from '../components/AnimatedPressable';

// Apple-style design tokens
const BENTO_RADIUS = 18;

type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

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

  // Apple-style dynamic colors
  const cardBg = colors.card;
  const inputBg = colors.inputBg;
  const borderColor = colors.border;

  // Derived values
  const selectedMemberIds = useMemo(
    () => Array.from(selectedMembers),
    [selectedMembers]
  );

  const splitTypeOptions: { key: SplitType; label: string }[] = [
    { key: 'equal', label: 'Equal' },
    { key: 'exact', label: 'Exact' },
    { key: 'percentage', label: '%' },
    { key: 'shares', label: 'Shares' },
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

    if (splitType === 'shares') {
      const hasInvalidShare = selectedMemberIds.some(
        (id) => !splitAmounts[id] || parseFloat(splitAmounts[id]) <= 0
      );
      if (hasInvalidShare) {
        Alert.alert('Error', 'Each member must have at least 1 share');
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

      if (splitType === 'shares') {
        payload.splits = selectedMemberIds.map((id) => ({
          userId: id,
          amount: parseFloat(splitAmounts[id] || '1') || 1,
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
      {/* ─── Header Bar ─────────────────────────────────────────── */}
      <View
        style={[
          styles.headerWrapper,
          {
            backgroundColor: colors.background,
            borderBottomWidth: 0.5,
            borderBottomColor: borderColor,
          },
        ]}
      >
        <View style={styles.headerSafeArea}>
          <View style={styles.headerContent}>
            <AnimatedPressable
              onPress={() => navigation.goBack()}
              scaleValue={0.93}
            >
              <View
                style={[
                  styles.backButton,
                  {
                    backgroundColor: inputBg,
                    borderWidth: 0.5,
                    borderColor: borderColor,
                  },
                ]}
              >
                <CaretLeft size={22} color={colors.primary} weight="bold" />
              </View>
            </AnimatedPressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Add Expense
            </Text>
          </View>
        </View>
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
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                AMOUNT
              </Text>
              <View
                style={[
                  styles.appleInput,
                  {
                    backgroundColor: inputBg,
                    borderColor: borderColor,
                  },
                ]}
              >
                <TextInput
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.appleInputText, { color: colors.text }]}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>
            </Animated.View>

            {/* ─── Description Input ──────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                DESCRIPTION
              </Text>
              <View
                style={[
                  styles.appleInput,
                  {
                    backgroundColor: inputBg,
                    borderColor: borderColor,
                  },
                ]}
              >
                <TextInput
                  placeholder="What's this for?"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.appleInputText, { color: colors.text }]}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>
            </Animated.View>

            {/* ─── Currency Input ─────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(300).duration(500)}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                CURRENCY
              </Text>
              <View
                style={[
                  styles.appleInput,
                  {
                    backgroundColor: inputBg,
                    borderColor: borderColor,
                  },
                ]}
              >
                <TextInput
                  placeholder="USD"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.appleInputText, { color: colors.text }]}
                  value={currency}
                  onChangeText={(text) => setCurrency(text.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={3}
                />
              </View>
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
                <View
                  style={[
                    styles.dateButton,
                    {
                      backgroundColor: inputBg,
                      borderColor: borderColor,
                    },
                  ]}
                >
                  <View style={styles.dateButtonContent}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <CalendarBlank size={18} color={colors.text} weight="duotone" />
                      <Text style={[styles.dateButtonText, { color: colors.text }]}>
                        {formatDate(selectedDate)}
                      </Text>
                    </View>
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
                </View>
              </AnimatedPressable>

              {showDatePicker && (
                <>
                  {Platform.OS === 'ios' && (
                    <View
                      style={[
                        styles.datePickerContainer,
                        {
                          backgroundColor: cardBg,
                          borderColor: borderColor,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.datePickerHeader,
                          { borderBottomColor: borderColor },
                        ]}
                      >
                        <AnimatedPressable
                          onPress={() => setShowDatePicker(false)}
                          scaleValue={0.95}
                        >
                          <View
                            style={[
                              styles.datePickerDoneButton,
                              { backgroundColor: colors.primary },
                            ]}
                          >
                            <Text style={styles.datePickerDoneText}>Done</Text>
                          </View>
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
                    </View>
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
                      <View
                        style={[
                          styles.chip,
                          isSelected
                            ? { backgroundColor: colors.primary }
                            : {
                                backgroundColor: inputBg,
                                borderWidth: 0.5,
                                borderColor: borderColor,
                              },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: isSelected ? '#FFFFFF' : colors.text },
                            isSelected && { fontWeight: '700' },
                          ]}
                        >
                          {getMemberShortName(member.user.id)}
                        </Text>
                      </View>
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
                      <View
                        style={[
                          styles.splitTypeButton,
                          isSelected
                            ? { backgroundColor: colors.primary }
                            : {
                                backgroundColor: inputBg,
                                borderWidth: 0.5,
                                borderColor: borderColor,
                              },
                        ]}
                      >
                        <Text
                          style={[
                            styles.splitTypeButtonText,
                            { color: isSelected ? '#FFFFFF' : colors.text },
                            isSelected && { fontWeight: '700' },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>
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
              <View
                style={[
                  styles.membersCard,
                  {
                    backgroundColor: cardBg,
                    borderWidth: 0.5,
                    borderColor: borderColor,
                    borderRadius: BENTO_RADIUS,
                  },
                ]}
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
                            borderBottomWidth: 0.5,
                            borderBottomColor: borderColor,
                          },
                        ]}
                      >
                        <View style={styles.memberInfo}>
                          <View
                            style={[
                              styles.checkbox,
                              {
                                borderColor: isDark
                                  ? 'rgba(255,255,255,0.2)'
                                  : 'rgba(0,0,0,0.15)',
                              },
                              isSelected && {
                                backgroundColor: colors.primary,
                                borderColor: colors.primary,
                              },
                            ]}
                          >
                            {isSelected && (
                              <Check size={16} color={colors.primary} weight="bold" />
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
              </View>
            </Animated.View>

            {/* ─── Per-Person Amounts (Exact / Percentage) ────────────── */}
            {splitType !== 'equal' && selectedMemberIds.length > 0 && (
              /* shares hint */
              splitType === 'shares' && (
                <Animated.View entering={FadeInDown.delay(780).duration(400)}>
                  <View style={[styles.sharesHint, { backgroundColor: colors.inputBg, borderColor: borderColor }]}>
                    <Text style={[styles.sharesHintText, { color: colors.textSecondary }]}>
                      Enter share counts (e.g. 2, 1). Cost is split proportionally.
                    </Text>
                  </View>
                </Animated.View>
              )
            )}
            {splitType !== 'equal' && selectedMemberIds.length > 0 && (
              <Animated.View entering={FadeInDown.delay(800).duration(500)}>
                <Text
                  style={[styles.fieldLabel, { color: colors.textSecondary }]}
                >
                  {splitType === 'exact'
                    ? 'AMOUNT PER PERSON'
                    : splitType === 'percentage'
                    ? 'PERCENTAGE PER PERSON'
                    : 'SHARES PER PERSON'}
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
                        <View
                          style={[
                            styles.appleInput,
                            {
                              backgroundColor: inputBg,
                              borderColor: borderColor,
                              flex: 1,
                              marginBottom: 8,
                            },
                          ]}
                        >
                          <TextInput
                            placeholder="0"
                            placeholderTextColor={colors.textSecondary}
                            style={[styles.appleInputText, { color: colors.text }]}
                            value={splitAmounts[memberId] || ''}
                            onChangeText={(text) =>
                              setSplitAmounts((prev) => ({
                                ...prev,
                                [memberId]: text,
                              }))
                            }
                            keyboardType="decimal-pad"
                          />
                        </View>
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
                        {splitType === 'shares' && (
                          <Text
                            style={[
                              styles.percentSuffix,
                              { color: colors.textSecondary },
                            ]}
                          >
                            sh
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
                {/* Summary row */}
                {splitType !== 'shares' && (
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
                              ? colors.success
                              : colors.error;
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
                )}
                {splitType === 'shares' && (() => {
                  const totalShares = selectedMemberIds.reduce(
                    (acc, id) => acc + (parseFloat(splitAmounts[id] || '0') || 0),
                    0
                  );
                  const numericAmount = parseFloat(amount) || 0;
                  return (
                    <View style={[styles.sharesPreview, { borderColor: borderColor }]}>
                      {selectedMemberIds.map((id) => {
                        const sh = parseFloat(splitAmounts[id] || '0') || 0;
                        const portion = totalShares > 0 ? (sh / totalShares) * numericAmount : 0;
                        return (
                          <View key={id} style={styles.sharesPreviewRow}>
                            <Text style={[styles.sharesPreviewName, { color: colors.textSecondary }]}>
                              {getMemberShortName(id)}
                            </Text>
                            <Text style={[styles.sharesPreviewAmount, { color: colors.text }]}>
                              {portion.toFixed(2)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  );
                })()}
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
                <View
                  style={[
                    styles.submitButton,
                    { backgroundColor: colors.primary },
                    loading && styles.submitButtonDisabled,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Add Expense</Text>
                  )}
                </View>
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
  headerSafeArea: {},
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  backButton: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 18,
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

  // ─── Apple-style Input ────────────────────────────────────────────────
  appleInput: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 14,
  },
  appleInputText: {
    fontSize: 15,
    fontWeight: '500',
  },

  // ─── Date Button ─────────────────────────────────────────────────────
  dateButton: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
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
    borderRadius: BENTO_RADIUS,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderBottomWidth: 0.5,
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
  chipText: {
    fontSize: 14,
    fontWeight: '600',
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
  splitTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ─── Members List ────────────────────────────────────────────────────
  membersCard: {
    padding: 0,
    marginBottom: 18,
    overflow: 'hidden',
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
    alignItems: 'center',
    justifyContent: 'center',
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

  // ─── Shares hint / preview ───────────────────────────────────────────
  sharesHint: {
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 12,
    marginBottom: 12,
  },
  sharesHintText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sharesPreview: {
    borderTopWidth: 0.5,
    marginTop: 4,
    paddingTop: 10,
    marginBottom: 18,
  },
  sharesPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sharesPreviewName: {
    fontSize: 13,
    fontWeight: '500',
  },
  sharesPreviewAmount: {
    fontSize: 13,
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
