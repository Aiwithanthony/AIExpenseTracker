import React, { useState } from 'react';
import { View, StyleSheet, Platform, Keyboard } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarBlank } from 'phosphor-react-native';
import { Text } from './AppText';
import { useTheme } from '../context/ThemeContext';
import AnimatedPressable from './AnimatedPressable';

const BENTO_RADIUS = 18;

/**
 * Shared native date picker field (replaces raw "YYYY-MM-DD" text inputs).
 * Same UX as the pickers on AddExpense/AddGroupExpense: a tappable warm field
 * showing the formatted date; iOS opens an inline spinner card with a Done
 * button, Android opens the system dialog.
 */
export default function DateField({
  value,
  onChange,
  label = 'Date',
  maximumDate,
}: {
  value: Date;
  onChange: (d: Date) => void;
  label?: string;
  maximumDate?: Date;
}) {
  const { colors, isDark } = useTheme();
  const [show, setShow] = useState(false);

  const formatted = value.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const onNativeChange = (_event: any, date?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (date) onChange(date);
  };

  return (
    <View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <AnimatedPressable
        onPress={() => {
          Keyboard.dismiss();
          setShow(!show);
        }}
        scaleValue={0.98}
      >
        <View style={[styles.button, { backgroundColor: colors.inputBg, borderColor: colors.borderStrong }]}>
          <View style={styles.buttonRow}>
            <CalendarBlank size={18} color={colors.text} weight="duotone" />
            <Text style={[styles.buttonText, { color: colors.text }]}>{formatted}</Text>
          </View>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {show && Platform.OS === 'ios' ? 'Tap to close' : 'Tap to change'}
          </Text>
        </View>
      </AnimatedPressable>

      {show && Platform.OS === 'ios' && (
        <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
            <AnimatedPressable onPress={() => setShow(false)} scaleValue={0.95}>
              <View style={[styles.doneButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.doneText}>Done</Text>
              </View>
            </AnimatedPressable>
          </View>
          <DateTimePicker
            value={value}
            mode="date"
            display="spinner"
            onChange={onNativeChange}
            maximumDate={maximumDate}
            themeVariant={isDark ? 'dark' : 'light'}
          />
        </View>
      )}
      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={onNativeChange}
          maximumDate={maximumDate}
          themeVariant={isDark ? 'dark' : 'light'}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  button: {
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
  },
  pickerContainer: {
    marginTop: -6,
    marginBottom: 14,
    borderRadius: BENTO_RADIUS,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderBottomWidth: 0.5,
  },
  doneButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  doneText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
