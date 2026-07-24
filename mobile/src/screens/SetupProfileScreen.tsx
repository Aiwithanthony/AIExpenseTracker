import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { UserCircle, Check } from 'phosphor-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import GlassInput from '../components/GlassInput';
import AnimatedPressable from '../components/AnimatedPressable';
import { CURRENCIES } from '../constants/currencies';

const BENTO_RADIUS = 18;

/**
 * One-time post-signup step: confirm display name and pick the account
 * currency BEFORE any transaction exists (so nothing ever needs reconverting).
 * Shown for brand-new accounts only — email signups and first-time
 * Google/Apple sign-ins alike (see needsSetup in AuthContext).
 */
export default function SetupProfileScreen() {
  const { user, updateUser, completeSetup } = useAuth();
  const { colors, isDark } = useTheme();

  // Pre-fill: provider/typed name when real, else the email prefix.
  const emailPrefix = (user?.email || '').split('@')[0];
  const suggested =
    user?.name && user.name !== 'User'
      ? user.name
      : emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);

  const [name, setName] = useState(suggested);
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Missing name', 'Tell us what to call you.');
      return;
    }
    setSaving(true);
    try {
      // Only send what actually changed; a brand-new account has no expenses,
      // so a currency change here never triggers reconversion.
      const changes: { name?: string; currency?: string } = {};
      if (trimmed !== user?.name) changes.name = trimmed;
      if (currency !== user?.currency) changes.currency = currency;
      if (Object.keys(changes).length > 0) {
        await updateUser(changes);
      }
      await completeSetup();
    } catch (e: any) {
      setSaving(false);
      Alert.alert('Could not save', e.message || 'Check your connection.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: () => handleContinue() },
      ]);
      return;
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={[styles.heroIcon, { backgroundColor: colors.tintCool }]}>
            <UserCircle size={32} color={colors.tintCoolText} weight="duotone" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Set up your profile</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Pick the currency you think in — every total, budget, and goal uses it.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.form}>
          <GlassInput
            label="Your name"
            isDark={isDark}
            textColor={colors.text}
            labelColor={colors.textSecondary}
            placeholderColor={colors.textTertiary}
            placeholder="Name"
            value={name}
            onChangeText={setName}
          />
          <Text style={[styles.listLabel, { color: colors.textSecondary }]}>CURRENCY</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(140)} style={styles.listWrap}>
          <FlatList
            data={CURRENCIES}
            keyExtractor={(item) => item.code}
            showsVerticalScrollIndicator={false}
            style={[styles.list, { backgroundColor: colors.card, borderColor: colors.border }]}
            renderItem={({ item }) => {
              const selected = item.code === currency;
              return (
                <AnimatedPressable onPress={() => setCurrency(item.code)} scaleValue={0.98}>
                  <View style={[styles.row, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.rowSymbol, { color: colors.textSecondary }]}>{item.symbol}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowCode, { color: colors.text }]}>{item.code}</Text>
                      <Text style={[styles.rowName, { color: colors.textTertiary }]}>{item.name}</Text>
                    </View>
                    {selected && <Check size={18} color={colors.primary} weight="bold" />}
                  </View>
                </AnimatedPressable>
              );
            }}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.footer}>
          <AnimatedPressable onPress={handleContinue} disabled={saving} scaleValue={0.97}>
            <View style={[styles.continueButton, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}>
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.continueText}>Continue</Text>
              )}
            </View>
          </AnimatedPressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 24, marginBottom: 18 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 6 },
  form: { paddingHorizontal: 20 },
  listLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginLeft: 4, marginBottom: 8 },
  listWrap: { flex: 1, paddingHorizontal: 20 },
  list: { borderRadius: BENTO_RADIUS, borderWidth: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  rowSymbol: { fontSize: 15, fontWeight: '700', width: 44 },
  rowCode: { fontSize: 15, fontWeight: '700' },
  rowName: { fontSize: 12, marginTop: 1 },
  footer: { padding: 20 },
  continueButton: {
    borderRadius: BENTO_RADIUS,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
