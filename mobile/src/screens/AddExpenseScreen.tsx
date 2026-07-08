import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from '../components/AppText';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { api } from '../services/api';
import GlassInput from '../components/GlassInput';
import AnimatedPressable from '../components/AnimatedPressable';

export default function AddExpenseScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { refreshExpenses, categories } = useData();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(
    route?.params?.type || 'expense'
  );
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !description) {
      Alert.alert('Missing Fields', 'Please fill in amount and description to continue.');
      return;
    }
    setLoading(true);
    try {
      await api.createExpense({
        amount: parseFloat(amount),
        currency: user?.currency || 'USD',
        description,
        merchant: merchant || undefined,
        categoryId: categoryId || undefined,
        date: selectedDate.toISOString(),
        type,
        tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
      });
      refreshExpenses().catch(() => {});
      navigation.goBack();
    } catch (error: any) {
      // Keep the filled-in form and offer a one-tap retry — losing the typed
      // transaction to a flaky connection was a recurring complaint.
      setLoading(false);
      Alert.alert(
        'Could Not Add Expense',
        error.message || 'Could not save your expense. Check your connection and try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleSubmit() },
        ],
      );
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
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            {/* Type Selector */}
            <Animated.View entering={FadeInDown.delay(0).duration(400)}>
              <View style={styles.typeSelector}>
                <AnimatedPressable
                  onPress={() => setType('expense')}
                  scaleValue={0.96}
                  style={styles.typeButtonWrapper}
                >
                  <View style={[
                    styles.typeButton,
                    type === 'expense'
                      ? { backgroundColor: colors.primary }
                      : {
                          backgroundColor: colors.card,
                          borderWidth: 0.5,
                          borderColor: colors.borderStrong,
                        },
                  ]}>
                    <Text style={[
                      styles.typeButtonText,
                      { color: type === 'expense' ? '#fefefe' : colors.text },
                    ]}>
                      Expense
                    </Text>
                  </View>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={() => setType('income')}
                  scaleValue={0.96}
                  style={styles.typeButtonWrapper}
                >
                  <View style={[
                    styles.typeButton,
                    type === 'income'
                      ? { backgroundColor: colors.primary }
                      : {
                          backgroundColor: colors.card,
                          borderWidth: 0.5,
                          borderColor: colors.borderStrong,
                        },
                  ]}>
                    <Text style={[
                      styles.typeButtonText,
                      { color: type === 'income' ? '#fefefe' : colors.text },
                    ]}>
                      Income
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>
            </Animated.View>

            {/* Form fields in a card */}
            <Animated.View entering={FadeInDown.delay(80).duration(400)}>
              <View style={[
                styles.formCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}>
                <GlassInput
                  label="Amount"
                  placeholder="0.00"
                  placeholderColor={colors.textTertiary}
                  textColor={colors.text}
                  labelColor={colors.textSecondary}
                  isDark={isDark}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />

                <GlassInput
                  label="Description"
                  placeholder="What was this for?"
                  placeholderColor={colors.textTertiary}
                  textColor={colors.text}
                  labelColor={colors.textSecondary}
                  isDark={isDark}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />

                <GlassInput
                  label="Merchant"
                  placeholder="Merchant (Optional)"
                  placeholderColor={colors.textTertiary}
                  textColor={colors.text}
                  labelColor={colors.textSecondary}
                  isDark={isDark}
                  value={merchant}
                  onChangeText={setMerchant}
                />
              </View>
            </Animated.View>

            {/* Category Picker */}
            {categories.length > 0 && (
              <Animated.View entering={FadeInDown.delay(120).duration(400)}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  CATEGORY
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
                        scaleValue={0.95}
                      >
                        <View
                          style={[
                            styles.categoryChip,
                            selected
                              ? { backgroundColor: colors.primary, borderColor: colors.primary }
                              : {
                                  backgroundColor: colors.card,
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
              </Animated.View>
            )}

            {/* Date Picker */}
            <Animated.View entering={FadeInDown.delay(160).duration(400)}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                DATE
              </Text>
              <AnimatedPressable
                onPress={() => {
                  Keyboard.dismiss();
                  setShowDatePicker(!showDatePicker);
                }}
                scaleValue={0.98}
              >
                <View style={[
                  styles.dateButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}>
                  <Text style={[styles.dateText, { color: colors.text }]}>
                    {formatDate(selectedDate)}
                  </Text>
                  <Text style={[styles.dateHint, { color: colors.textTertiary }]}>
                    {showDatePicker && Platform.OS === 'ios' ? 'Tap to close' : 'Tap to change'}
                  </Text>
                </View>
              </AnimatedPressable>

              {showDatePicker && (
                <>
                  {Platform.OS === 'ios' && (
                    <View style={[
                      styles.datePickerContainer,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}>
                      <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
                        <AnimatedPressable
                          onPress={() => setShowDatePicker(false)}
                          scaleValue={0.95}
                        >
                          <View style={[styles.doneButton, { backgroundColor: colors.primary }]}>
                            <Text style={styles.doneText}>Done</Text>
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

            {/* Tags */}
            <Animated.View entering={FadeInDown.delay(280).duration(400)}>
              <GlassInput
                label="Tags"
                placeholder="Tags (comma-separated, optional)"
                placeholderColor={colors.textTertiary}
                textColor={colors.text}
                labelColor={colors.textSecondary}
                isDark={isDark}
                value={tags}
                onChangeText={setTags}
              />
            </Animated.View>

            {/* Submit */}
            <Animated.View entering={FadeInDown.delay(350).duration(400)}>
              <AnimatedPressable
                onPress={handleSubmit}
                disabled={loading}
                scaleValue={0.97}
              >
                <View style={[
                  styles.submitButton,
                  { backgroundColor: colors.primary },
                  loading && { opacity: 0.6 },
                ]}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>
                      Add {type === 'income' ? 'Income' : 'Expense'}
                    </Text>
                  )}
                </View>
              </AnimatedPressable>
            </Animated.View>

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
  },

  // Type Selector
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeButtonWrapper: {
    flex: 1,
  },
  typeButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Form Card
  formCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },

  // Category
  categoryRow: {
    gap: 8,
    paddingBottom: 14,
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

  // Date
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  dateButton: {
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateHint: {
    fontSize: 12,
  },
  datePickerContainer: {
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderBottomWidth: 0.5,
  },
  doneButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },
  doneText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Submit
  submitButton: {
    borderRadius: 14,
    padding: 16,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
