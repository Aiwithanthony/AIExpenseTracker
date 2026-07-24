import React, { useState, useEffect } from 'react';
import {
  View,
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
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { Check } from 'phosphor-react-native';
import { useTheme, ACCENT_COLORS, AccentColorKey } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { api } from '../services/api';
import GlassInput from '../components/GlassInput';
import AnimatedPressable from '../components/AnimatedPressable';
import { CURRENCIES } from '../constants/currencies';

export default function SettingsScreen({ navigation }: any) {
  const { user, logout, updateUser } = useAuth();
  const { theme, setTheme, isDark, colors, accentColor, setAccentColor } = useTheme();
  const { refreshExpenses } = useData();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [editWhatsapp, setEditWhatsapp] = useState(user?.whatsappNumber || '');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Restore the persisted notifications preference on mount.
  useEffect(() => {
    AsyncStorage.getItem('notifications_enabled').then((v) => {
      if (v !== null) setNotificationsEnabled(v === 'true');
    });
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'You\'ll need to sign in again to access your data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem('notifications_enabled', String(value));
    if (value) {
      const current = await Notifications.getPermissionsAsync();
      if (current.status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        if (requested.status !== 'granted') {
          Alert.alert(
            'Notifications Disabled',
            'To receive reminders, enable notifications for Expense Tracker in your device settings.',
          );
        }
      }
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'csv') {
        content = await api.exportExpensesCSV();
        filename = `expenses-${Date.now()}.csv`;
        mimeType = 'text/csv';
      } else {
        const data = await api.exportExpensesJSON();
        content = JSON.stringify(data, null, 2);
        filename = `expenses-${Date.now()}.json`;
        mimeType = 'application/json';
      }

      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, content);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType, dialogTitle: 'Export expenses' });
      } else {
        Alert.alert('Export Saved', `Your ${format.toUpperCase()} export was saved to:\n${fileUri}`);
      }
    } catch (error: any) {
      Alert.alert('Export Failed', error?.message || 'Could not export your data. Check your connection and try again.');
    }
  };

  const handleConnectTelegram = async () => {
    try {
      const res = await api.createTelegramLinkCode();
      Alert.alert(
        'Connect Telegram',
        `Open the Expense Tracker bot in Telegram and send:\n\n/link ${res.code}\n\nThis code expires in 10 minutes.`,
      );
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not generate a Telegram link code.');
    }
  };

  const openPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 12) {
      Alert.alert('Password Too Short', 'Your new password must be at least 12 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'The new password and confirmation must match.');
      return;
    }
    setSavingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setShowPasswordModal(false);
      Alert.alert('Password Changed', 'Your password has been updated.');
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Could not change your password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveWhatsapp = async () => {
    const trimmed = editWhatsapp.trim();
    setSavingWhatsapp(true);
    try {
      await updateUser({ whatsappNumber: trimmed });
      setShowWhatsappModal(false);
      Alert.alert('WhatsApp Updated', 'Your WhatsApp number has been saved.');
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Could not save your WhatsApp number.');
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Please enter at least one character for your display name.');
      return;
    }
    setSavingName(true);
    try {
      await updateUser({ name: trimmed });
      setShowNameModal(false);
      Alert.alert('Name Updated', 'Your display name has been changed.');
    } catch (error: any) {
      Alert.alert('Update Failed', error.message || 'Could not save your name. Check your connection and try again.');
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
      await updateUser({ currency: currencyCode });
      await api.reconvertExpenses();
      await refreshExpenses();
      setShowCurrencyModal(false);
      Alert.alert('Currency Updated', `Currency changed to ${currencyCode}. All amounts have been converted.`);
    } catch (error: any) {
      Alert.alert('Update Failed', error.message || 'Could not change currency. Check your connection and try again.');
    } finally {
      setSavingCurrency(false);
    }
  };

  const renderThemeButton = (value: 'light' | 'dark' | 'auto', label: string) => {
    const isActive = theme === value;
    return (
      <AnimatedPressable
        onPress={() => setTheme(value)}
        style={styles.themeButtonWrapper}
      >
        <View style={[
          styles.themeButton,
          isActive
            ? { backgroundColor: colors.primary }
            : {
                backgroundColor: colors.inputBg,
                borderWidth: 0.5,
                borderColor: colors.borderStrong,
              },
        ]}>
          <Text style={[
            styles.themeButtonText,
            { color: isActive ? '#ffffff' : colors.text },
            isActive && { fontWeight: '700' },
          ]}>
            {label}
          </Text>
        </View>
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
        <View style={[
          styles.currencyItem,
          {
            backgroundColor: isSelected
              ? `${colors.primary}12`
              : colors.card,
            borderColor: isSelected
              ? colors.primary
              : colors.borderStrong,
          },
        ]}>
          <View style={styles.currencyInfo}>
            <Text style={[styles.currencySymbol, { color: isSelected ? colors.primary : colors.textSecondary }]}>
              {item.symbol}
            </Text>
            <View>
              <Text style={[styles.currencyCode, { color: colors.text }]}>{item.code}</Text>
              <Text style={[styles.currencyName, { color: colors.textSecondary }]}>{item.name}</Text>
            </View>
          </View>
          {isSelected && (
            <Check size={18} color={colors.primary} weight="bold" />
          )}
        </View>
      </AnimatedPressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
            </View>
          </Animated.View>
        </SafeAreaView>

        {/* Profile Section */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PROFILE</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <AnimatedPressable
              onPress={() => { setEditName(user?.name || ''); setShowNameModal(true); }}
              scaleValue={0.99}
            >
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Name</Text>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
                    {user?.name || 'N/A'}
                  </Text>
                  <Text style={[styles.chevron, { color: colors.textTertiary }]}>{'\u203A'}</Text>
                </View>
              </View>
            </AnimatedPressable>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Email</Text>
              <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
                {user?.email || 'N/A'}
              </Text>
            </View>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <AnimatedPressable
              onPress={() => setShowCurrencyModal(true)}
              scaleValue={0.99}
            >
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Currency</Text>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
                    {user?.currency || 'USD'}
                  </Text>
                  <Text style={[styles.chevron, { color: colors.textTertiary }]}>{'\u203A'}</Text>
                </View>
              </View>
            </AnimatedPressable>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <AnimatedPressable onPress={openPasswordModal} scaleValue={0.99}>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Change Password</Text>
                <Text style={[styles.chevron, { color: colors.textTertiary }]}>{'\u203A'}</Text>
              </View>
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* Preferences Section */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PREFERENCES</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.inputBg, true: colors.success }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Theme</Text>
              <View style={styles.themeSelector}>
                {renderThemeButton('light', 'Light')}
                {renderThemeButton('dark', 'Dark')}
                {renderThemeButton('auto', 'Auto')}
              </View>
            </View>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Accent Color</Text>
              <View style={styles.accentSelector}>
                {(Object.keys(ACCENT_COLORS) as AccentColorKey[]).map((key) => {
                  const isSelected = accentColor === key;
                  return (
                    <AnimatedPressable
                      key={key}
                      onPress={() => setAccentColor(key)}
                      scaleValue={0.85}
                    >
                      <View
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: ACCENT_COLORS[key].swatch },
                          isSelected && styles.colorSwatchSelected,
                        ]}
                      >
                        {isSelected && (
                          <Check size={16} color="#FFFFFF" weight="bold" />
                        )}
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Data Management */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DATA</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <AnimatedPressable onPress={() => handleExport('csv')}>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.primary }]}>Export as CSV</Text>
                <Text style={[styles.chevron, { color: colors.textTertiary }]}>{'\u203A'}</Text>
              </View>
            </AnimatedPressable>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <AnimatedPressable onPress={() => handleExport('json')}>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.primary }]}>Export as JSON</Text>
                <Text style={[styles.chevron, { color: colors.textTertiary }]}>{'\u203A'}</Text>
              </View>
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* Integrations */}
        <Animated.View entering={FadeInDown.duration(400).delay(310)} style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>INTEGRATIONS</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <AnimatedPressable onPress={handleConnectTelegram}>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Connect Telegram</Text>
                <Text style={[styles.chevron, { color: colors.textTertiary }]}>{'›'}</Text>
              </View>
            </AnimatedPressable>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <AnimatedPressable
              onPress={() => { setEditWhatsapp(user?.whatsappNumber || ''); setShowWhatsappModal(true); }}
            >
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>WhatsApp Number</Text>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
                    {user?.whatsappNumber || 'Not set'}
                  </Text>
                  <Text style={[styles.chevron, { color: colors.textTertiary }]}>{'›'}</Text>
                </View>
              </View>
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* Navigation */}
        <Animated.View entering={FadeInDown.duration(400).delay(320)} style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MORE</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            {[
              { label: 'Statistics', screen: 'Statistics' },
              { label: 'Budgets', screen: 'Budgets' },
              { label: 'Savings Goals', screen: 'SavingsGoals' },
              { label: 'Recurring', screen: 'Recurring' },
              { label: 'Location Tracking', screen: 'Geolocation' },
              { label: 'Subscription', screen: 'Subscriptions' },
            ].map((item, i, arr) => (
              <React.Fragment key={item.screen}>
                <AnimatedPressable onPress={() => navigation.navigate(item.screen)}>
                  <View style={styles.row}>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.chevron, { color: colors.textTertiary }]}>{'\u203A'}</Text>
                  </View>
                </AnimatedPressable>
                {i < arr.length - 1 && (
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.duration(400).delay(320)} style={[styles.sectionWrapper, { marginBottom: 100 }]}>
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <AnimatedPressable onPress={handleLogout}>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.error }]}>Logout</Text>
              </View>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Edit Name Modal */}
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
          <View style={[
            styles.modalContent,
            { backgroundColor: colors.card },
          ]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Name</Text>
              <AnimatedPressable
                onPress={() => !savingName && setShowNameModal(false)}
                scaleValue={0.9}
              >
                <Text style={[styles.modalCancel, { color: colors.primary }]}>Cancel</Text>
              </AnimatedPressable>
            </View>
            <View style={styles.modalBody}>
              <GlassInput
                label="Your Name"
                isDark={isDark}
                textColor={colors.text}
                labelColor={colors.textSecondary}
                placeholderColor={colors.textTertiary}
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
                <View style={[
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                  savingName && { opacity: 0.6 },
                ]}>
                  {savingName ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </View>
              </AnimatedPressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Currency Picker Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !savingCurrency && setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.currencyModalContent,
            { backgroundColor: colors.card },
          ]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
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
                <Text style={[styles.modalCancel, { color: colors.primary }]}>Close</Text>
              </AnimatedPressable>
            </View>
            {savingCurrency && (
              <View style={styles.savingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
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
          </View>
        </View>
      </Modal>

      {/* WhatsApp Number Modal */}
      <Modal
        visible={showWhatsappModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !savingWhatsapp && setShowWhatsappModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[
            styles.modalContent,
            { backgroundColor: colors.card },
          ]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>WhatsApp Number</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Log expenses by messaging the bot
                </Text>
              </View>
              <AnimatedPressable
                onPress={() => !savingWhatsapp && setShowWhatsappModal(false)}
                scaleValue={0.9}
              >
                <Text style={[styles.modalCancel, { color: colors.primary }]}>Cancel</Text>
              </AnimatedPressable>
            </View>
            <View style={styles.modalBody}>
              <GlassInput
                label="Number (international format, e.g. +9613123456)"
                isDark={isDark}
                textColor={colors.text}
                labelColor={colors.textSecondary}
                placeholderColor={colors.textTertiary}
                placeholder="+9613123456"
                value={editWhatsapp}
                onChangeText={setEditWhatsapp}
                keyboardType="phone-pad"
                autoFocus
              />
              <AnimatedPressable
                onPress={handleSaveWhatsapp}
                disabled={savingWhatsapp}
                scaleValue={0.97}
                style={{ marginTop: 8 }}
              >
                <View style={[
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                  savingWhatsapp && { opacity: 0.6 },
                ]}>
                  {savingWhatsapp ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </View>
              </AnimatedPressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !savingPassword && setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[
            styles.modalContent,
            { backgroundColor: colors.card },
          ]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>
              <AnimatedPressable
                onPress={() => !savingPassword && setShowPasswordModal(false)}
                scaleValue={0.9}
              >
                <Text style={[styles.modalCancel, { color: colors.primary }]}>Cancel</Text>
              </AnimatedPressable>
            </View>
            <View style={styles.modalBody}>
              <GlassInput
                label="Current Password"
                isDark={isDark}
                textColor={colors.text}
                labelColor={colors.textSecondary}
                placeholderColor={colors.textTertiary}
                placeholder="Current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
              />
              <GlassInput
                label="New Password (min 12 characters)"
                isDark={isDark}
                textColor={colors.text}
                labelColor={colors.textSecondary}
                placeholderColor={colors.textTertiary}
                placeholder="New password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              <GlassInput
                label="Confirm New Password"
                isDark={isDark}
                textColor={colors.text}
                labelColor={colors.textSecondary}
                placeholderColor={colors.textTertiary}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              <AnimatedPressable
                onPress={handleChangePassword}
                disabled={savingPassword}
                scaleValue={0.97}
                style={{ marginTop: 8 }}
              >
                <View style={[
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                  savingPassword && { opacity: 0.6 },
                ]}>
                  {savingPassword ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Update Password</Text>
                  )}
                </View>
              </AnimatedPressable>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  // Sections
  sectionWrapper: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 18,
    overflow: 'hidden',
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

  // Rows
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '400',
  },
  rowValue: {
    fontSize: 16,
  },
  chevron: {
    fontSize: 20,
    fontWeight: '300',
  },
  separator: {
    height: 0.5,
    marginLeft: 16,
  },

  // Theme
  themeSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  themeButtonWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  themeButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Accent color picker
  accentSelector: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2.5,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  swatchCheck: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 0.5,
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
  modalCancel: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalBody: {
    padding: 20,
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Currency Modal
  currencyModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
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
    borderWidth: 0.5,
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
