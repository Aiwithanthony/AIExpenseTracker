import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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

const CURRENCIES = [
  // Primary & MENA region
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'L\u00A3' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E\u00A3' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'JD' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'IQD' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'TND' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD' },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'DZD' },
  { code: 'LYD', name: 'Libyan Dinar', symbol: 'LYD' },
  { code: 'SYP', name: 'Syrian Pound', symbol: 'SYP' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '\u20BA' },
  // Major global
  { code: 'EUR', name: 'Euro', symbol: '\u20AC' },
  { code: 'GBP', name: 'British Pound', symbol: '\u00A3' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '\u00A5' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '\u00A5' },
  { code: 'KRW', name: 'South Korean Won', symbol: '\u20A9' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  // Africa
  { code: 'NGN', name: 'Nigerian Naira', symbol: '\u20A6' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH\u20B5' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  // Europe
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'z\u0142' },
  // Americas
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'COP', name: 'Colombian Peso', symbol: 'COL$' },
  { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$' },
  { code: 'CLP', name: 'Chilean Peso', symbol: 'CL$' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/' },
  // Asia-Pacific
  { code: 'THB', name: 'Thai Baht', symbol: '\u0E3F' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '\u20B1' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '\u20AB' },
];

export default function SettingsScreen({ navigation }: any) {
  const { user, logout, updateUser } = useAuth();
  const { theme, setTheme, isDark, colors } = useTheme();
  const { refreshExpenses } = useData();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Edit Name state
  const [showNameModal, setShowNameModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);

  // Currency Picker state
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      if (format === 'csv') {
        const csv = await api.exportExpensesCSV();
        Alert.alert('Export', 'CSV exported successfully!');
      } else {
        const json = await api.exportExpensesJSON();
        Alert.alert('Export', 'JSON exported successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    setSavingName(true);
    try {
      await updateUser({ name: trimmed });
      setShowNameModal(false);
      Alert.alert('Success', 'Name updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleSelectCurrency = async (currencyCode: string) => {
    if (currencyCode === user?.currency) {
      setShowCurrencyModal(false);
      return;
    }
    setSavingCurrency(true);
    try {
      // 1. Update user's preferred currency
      await updateUser({ currency: currencyCode });
      // 2. Re-convert all existing expenses to the new currency
      await api.reconvertExpenses();
      // 3. Refresh cached expense data so all screens show updated amounts
      await refreshExpenses();
      setShowCurrencyModal(false);
      Alert.alert('Success', `Currency changed to ${currencyCode}. All amounts have been converted.`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update currency');
    } finally {
      setSavingCurrency(false);
    }
  };

  const renderThemeButton = (
    value: 'light' | 'dark' | 'auto',
    label: string,
  ) => {
    const isActive = theme === value;
    return (
      <AnimatedPressable
        onPress={() => setTheme(value)}
        style={styles.themeButtonWrapper}
      >
        {isActive ? (
          <LinearGradient
            colors={[ACCENT, ACCENT_LIGHT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.themeButton}
          >
            <Text style={[styles.themeButtonText, styles.themeButtonTextActive]}>
              {label}
            </Text>
          </LinearGradient>
        ) : (
          <BlurView
            intensity={GLASS.blurIntensity}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.themeButton,
              styles.themeButtonInactive,
              !isDark && { backgroundColor: 'rgba(0, 0, 0, 0.06)' },
            ]}
          >
            <Text style={[styles.themeButtonText, { color: colors.text }]}>
              {label}
            </Text>
          </BlurView>
        )}
      </AnimatedPressable>
    );
  };

  const renderCurrencyItem = ({ item }: { item: typeof CURRENCIES[0] }) => {
    const isSelected = item.code === (user?.currency || 'USD');
    return (
      <AnimatedPressable
        onPress={() => handleSelectCurrency(item.code)}
        disabled={savingCurrency}
        scaleValue={0.98}
      >
        <BlurView
          intensity={isDark ? 30 : 20}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.currencyItem,
            {
              backgroundColor: isSelected
                ? ACCENT + '25'
                : isDark ? GLASS.bgLight : 'rgba(255,255,255,0.5)',
              borderColor: isSelected ? ACCENT : GLASS.borderColor,
            },
          ]}
        >
          <View style={styles.currencyInfo}>
            <Text style={[styles.currencySymbol, { color: isSelected ? ACCENT_LIGHT : colors.textSecondary }]}>
              {item.symbol}
            </Text>
            <View>
              <Text style={[styles.currencyCode, { color: colors.text }]}>{item.code}</Text>
              <Text style={[styles.currencyName, { color: colors.textSecondary }]}>{item.name}</Text>
            </View>
          </View>
          {isSelected && (
            <Text style={{ color: ACCENT_LIGHT, fontSize: 18 }}>{'\u2713'}</Text>
          )}
        </BlurView>
      </AnimatedPressable>
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: isDark ? '#0D0D0D' : colors.background }]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: isDark ? '#0D0D0D' : colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <Animated.View entering={FadeInDown.duration(500).delay(0)}>
            <LinearGradient
              colors={['#1A0030', '#2D004F', ACCENT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.header}
            >
              <Text style={styles.title}>{'\u2699\uFE0F'} Settings</Text>
            </LinearGradient>
          </Animated.View>
        </SafeAreaView>

        {/* Profile Section */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(100)}
          style={styles.sectionWrapper}
        >
          <GlassCard style={styles.section} tint={isDark ? 'dark' : 'light'}>
            <Text style={styles.sectionTitle}>PROFILE</Text>
            <AnimatedPressable
              onPress={() => {
                setEditName(user?.name || '');
                setShowNameModal(true);
              }}
              scaleValue={0.99}
            >
              <View style={styles.glassRow}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Name</Text>
                <View style={styles.editableValue}>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                    {user?.name || 'N/A'}
                  </Text>
                  <Text style={styles.chevron}>{'\u203A'}</Text>
                </View>
              </View>
            </AnimatedPressable>
            <View style={styles.rowSeparator} />
            <View style={styles.glassRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Email</Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                {user?.email || 'N/A'}
              </Text>
            </View>
            <View style={styles.rowSeparator} />
            <AnimatedPressable
              onPress={() => setShowCurrencyModal(true)}
              scaleValue={0.99}
            >
              <View style={styles.glassRow}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Currency</Text>
                <View style={styles.editableValue}>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                    {user?.currency || 'USD'}
                  </Text>
                  <Text style={styles.chevron}>{'\u203A'}</Text>
                </View>
              </View>
            </AnimatedPressable>
          </GlassCard>
        </Animated.View>

        {/* Preferences Section */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(200)}
          style={styles.sectionWrapper}
        >
          <GlassCard style={styles.section} tint={isDark ? 'dark' : 'light'}>
            <Text style={styles.sectionTitle}>PREFERENCES</Text>
            <View style={styles.glassRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Notifications
              </Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: ACCENT_LIGHT }}
                thumbColor={notificationsEnabled ? '#FFFFFF' : '#CCCCCC'}
              />
            </View>
            <View style={styles.rowSeparator} />
            <View style={styles.glassRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Theme</Text>
              <View style={styles.themeSelector}>
                {renderThemeButton('light', 'Light')}
                {renderThemeButton('dark', 'Dark')}
                {renderThemeButton('auto', 'Auto')}
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Data Management Section */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(300)}
          style={styles.sectionWrapper}
        >
          <GlassCard style={styles.section} tint={isDark ? 'dark' : 'light'}>
            <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>
            <AnimatedPressable
              onPress={() => handleExport('csv')}
              style={styles.navRow}
            >
              <View style={styles.navRowInner}>
                <Text style={[styles.navRowText, { color: ACCENT_LIGHT }]}>
                  {'\uD83D\uDCC4'} Export as CSV
                </Text>
                <Text style={styles.chevron}>{'\u203A'}</Text>
              </View>
            </AnimatedPressable>
            <View style={styles.rowSeparator} />
            <AnimatedPressable
              onPress={() => handleExport('json')}
              style={styles.navRow}
            >
              <View style={styles.navRowInner}>
                <Text style={[styles.navRowText, { color: ACCENT_LIGHT }]}>
                  {'\uD83D\uDCC4'} Export as JSON
                </Text>
                <Text style={styles.chevron}>{'\u203A'}</Text>
              </View>
            </AnimatedPressable>
          </GlassCard>
        </Animated.View>

        {/* Navigation Section */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(400)}
          style={styles.sectionWrapper}
        >
          <GlassCard style={styles.section} tint={isDark ? 'dark' : 'light'}>
            <Text style={styles.sectionTitle}>NAVIGATION</Text>
            <AnimatedPressable
              onPress={() => navigation.navigate('Statistics')}
              style={styles.navRow}
            >
              <View style={styles.navRowInner}>
                <Text style={[styles.navRowText, { color: colors.text }]}>
                  {'\uD83D\uDCCA'} View Statistics
                </Text>
                <Text style={styles.chevron}>{'\u203A'}</Text>
              </View>
            </AnimatedPressable>
            <View style={styles.rowSeparator} />
            <AnimatedPressable
              onPress={() => navigation.navigate('Calendar')}
              style={styles.navRow}
            >
              <View style={styles.navRowInner}>
                <Text style={[styles.navRowText, { color: colors.text }]}>
                  {'\uD83D\uDCC5'} Calendar View
                </Text>
                <Text style={styles.chevron}>{'\u203A'}</Text>
              </View>
            </AnimatedPressable>
            <View style={styles.rowSeparator} />
            <AnimatedPressable
              onPress={() => navigation.navigate('Geolocation')}
              style={styles.navRow}
            >
              <View style={styles.navRowInner}>
                <Text style={[styles.navRowText, { color: colors.text }]}>
                  {'\uD83D\uDCCD'} Location Tracking
                </Text>
                <Text style={styles.chevron}>{'\u203A'}</Text>
              </View>
            </AnimatedPressable>
            <View style={styles.rowSeparator} />
            <AnimatedPressable
              onPress={() => navigation.navigate('Subscriptions')}
              style={styles.navRow}
            >
              <View style={styles.navRowInner}>
                <Text style={[styles.navRowText, { color: colors.text }]}>
                  {'\u2B50'} Subscription
                </Text>
                <Text style={styles.chevron}>{'\u203A'}</Text>
              </View>
            </AnimatedPressable>
          </GlassCard>
        </Animated.View>

        {/* Account Section */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(500)}
          style={[styles.sectionWrapper, { marginBottom: 100 }]}
        >
          <GlassCard style={[styles.section, styles.logoutCard]} tint={isDark ? 'dark' : 'light'}>
            <Text style={styles.sectionTitle}>ACCOUNT</Text>
            <AnimatedPressable onPress={handleLogout} style={styles.logoutRow}>
              <View style={styles.logoutRowInner}>
                <Text style={styles.logoutText}>
                  {'\uD83D\uDEAA'} Logout
                </Text>
              </View>
            </AnimatedPressable>
          </GlassCard>
        </Animated.View>
      </ScrollView>

      {/* ─── Edit Name Modal ─────────────────────────────────────────── */}
      <Modal
        visible={showNameModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !savingName && setShowNameModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <BlurView
            intensity={isDark ? 80 : 50}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.modalContent,
              { backgroundColor: isDark ? 'rgba(20,10,40,0.9)' : 'rgba(255,255,255,0.9)' },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: GLASS.borderColor }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Name</Text>
              <AnimatedPressable
                onPress={() => !savingName && setShowNameModal(false)}
                scaleValue={0.9}
              >
                <BlurView
                  intensity={30}
                  tint={isDark ? 'dark' : 'light'}
                  style={styles.modalCancelButton}
                >
                  <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
                </BlurView>
              </AnimatedPressable>
            </View>

            <View style={styles.modalBody}>
              <GlassInput
                label="Your Name"
                isDark={isDark}
                textColor={colors.text}
                labelColor={colors.textSecondary}
                placeholderColor={colors.textSecondary}
                placeholder="Enter your name"
                value={editName}
                onChangeText={setEditName}
                autoFocus
              />

              <AnimatedPressable
                onPress={handleSaveName}
                disabled={savingName}
                scaleValue={0.97}
                style={{ marginTop: 8 }}
              >
                <LinearGradient
                  colors={[ACCENT, ACCENT_LIGHT]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.saveButton, savingName && { opacity: 0.6 }]}
                >
                  {savingName ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </LinearGradient>
              </AnimatedPressable>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Currency Picker Modal ────────────────────────────────────── */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !savingCurrency && setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={isDark ? 80 : 50}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.currencyModalContent,
              { backgroundColor: isDark ? 'rgba(20,10,40,0.9)' : 'rgba(255,255,255,0.9)' },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: GLASS.borderColor }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Currency</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Choose your preferred currency
                </Text>
              </View>
              <AnimatedPressable
                onPress={() => !savingCurrency && setShowCurrencyModal(false)}
                scaleValue={0.9}
              >
                <BlurView
                  intensity={30}
                  tint={isDark ? 'dark' : 'light'}
                  style={styles.modalCancelButton}
                >
                  <Text style={[styles.modalCancelText, { color: colors.text }]}>Close</Text>
                </BlurView>
              </AnimatedPressable>
            </View>

            {savingCurrency && (
              <View style={styles.savingOverlay}>
                <ActivityIndicator size="large" color={ACCENT} />
                <Text style={[styles.savingText, { color: colors.text }]}>Updating currency...</Text>
              </View>
            )}

            <FlatList
              data={CURRENCIES}
              renderItem={renderCurrencyItem}
              keyExtractor={(item) => item.code}
              contentContainerStyle={styles.currencyList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: GLASS.borderRadius,
    borderBottomRightRadius: GLASS.borderRadius,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sectionWrapper: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT_LIGHT,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  glassRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },
  editableValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 16,
  },
  themeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButtonWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  themeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeButtonInactive: {
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  themeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  navRow: {
    paddingVertical: 13,
  },
  navRowInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navRowText: {
    fontSize: 16,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 22,
    color: ACCENT_LIGHT,
    fontWeight: '300',
  },
  logoutCard: {
    borderColor: 'rgba(255, 59, 48, 0.25)',
    borderWidth: 1,
  },
  logoutRow: {
    paddingVertical: 13,
  },
  logoutRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },

  // ─── Modal Shared ──────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS.borderColor,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GLASS.borderColor,
    overflow: 'hidden',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  saveButton: {
    borderRadius: GLASS.borderRadius,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // ─── Currency Modal ────────────────────────────────────────────────
  currencyModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS.borderColor,
    borderBottomWidth: 0,
  },
  currencyList: {
    padding: 16,
    paddingBottom: 32,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 56,
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    width: 36,
    textAlign: 'center',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  currencyName: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  savingOverlay: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  savingText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
