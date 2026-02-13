import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
// SafeAreaView import removed — screen is inside a stack navigator with a visible header
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  isBackgroundLocationTrackingActive,
  startForegroundLocationTracking,
  stopForegroundLocationTracking,
  isForegroundLocationTrackingActive,
} from '../services/locationTracking';
import GlassCard from '../components/GlassCard';
import AnimatedPressable from '../components/AnimatedPressable';
import GlassInput from '../components/GlassInput';

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

interface LocationRule {
  id: string;
  locationType: string;
  latitude: number;
  longitude: number;
  radius: number;
  minDuration: number;
  name?: string;
  isActive: boolean;
}

export default function GeolocationScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [rules, setRules] = useState<LocationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [backgroundTracking, setBackgroundTracking] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({
    locationType: 'custom',
    name: '',
    latitude: '',
    longitude: '',
    radius: '100',
    minDuration: '5',
  });

  useEffect(() => {
    checkLocationPermission();
    loadRules();
    checkBackgroundTrackingStatus();
  }, []);

  const checkBackgroundTrackingStatus = async () => {
    const isActive = await isBackgroundLocationTrackingActive();
    setBackgroundTracking(isActive);
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationEnabled(status === 'granted');

      // Also check background permission
      if (status === 'granted') {
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        // Background permission status is separate
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const handleToggleBackgroundTracking = async () => {
    if (backgroundTracking) {
      await stopBackgroundLocationTracking();
      await stopForegroundLocationTracking();
      setBackgroundTracking(false);
      Alert.alert('Success', 'Background location tracking stopped');
    } else {
      const started = await startBackgroundLocationTracking();
      if (started) {
        setBackgroundTracking(true);
        Alert.alert('Success', 'Background location tracking started. You will receive notifications when leaving tracked locations.');
      } else {
        // Expo Go fallback: foreground tracking while app is open
        const foregroundStarted = await startForegroundLocationTracking();
        if (foregroundStarted) {
          setBackgroundTracking(true);
          Alert.alert(
            'Foreground Tracking Enabled',
            'Background tracking could not start (Expo Go limitation). Tracking will work while the app is open.',
          );
        } else {
          Alert.alert('Error', 'Failed to start location tracking. Please check your location permissions in Settings.');
        }
      }
    }
  };

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await api.getLocationRules();
      setRules(data || []);
    } catch (error) {
      console.error('Error loading location rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.latitude || !newRule.longitude) {
      Alert.alert('Error', 'Please fill in coordinates');
      return;
    }

    try {
      await api.createLocationRule({
        locationType: newRule.locationType,
        latitude: parseFloat(newRule.latitude),
        longitude: parseFloat(newRule.longitude),
        radius: parseFloat(newRule.radius),
        minTimeSpent: parseFloat(newRule.minDuration),
        enabled: true,
      });
      Alert.alert('Success', 'Location rule created successfully');
      setShowAddRule(false);
      setNewRule({
        locationType: 'custom',
        name: '',
        latitude: '',
        longitude: '',
        radius: '100',
        minDuration: '5',
      });
      loadRules();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create location rule');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setNewRule({
        ...newRule,
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const locationTypes = [
    { value: 'coffee_shop', label: 'Coffee Shop' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'grocery', label: 'Grocery Store' },
    { value: 'mall', label: 'Mall' },
    { value: 'supermarket', label: 'Supermarket' },
    { value: 'custom', label: 'Custom' },
  ];

  const textColor = isDark ? '#FFFFFF' : colors.text;
  const secondaryTextColor = isDark ? 'rgba(255,255,255,0.6)' : colors.textSecondary;
  const labelColor = isDark ? 'rgba(255,255,255,0.5)' : colors.textSecondary;
  const placeholderColor = isDark ? 'rgba(255,255,255,0.35)' : colors.textSecondary;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D1A' : colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[isDark ? '#1A0A2E' : '#2D1B69', isDark ? '#0D0D1A' : '#1A0A2E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Location Tracking</Text>
        <AnimatedPressable onPress={() => setShowAddRule(true)} scaleValue={0.95}>
          <LinearGradient
            colors={[ACCENT, ACCENT_LIGHT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+ Add Rule</Text>
          </LinearGradient>
        </AnimatedPressable>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Location Permission Status */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <GlassCard style={styles.statusCard} tint={isDark ? 'dark' : 'light'}>
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, { color: textColor }]}>
                {'\u{1F4CD}'} Location Services
              </Text>
              <Switch
                value={locationEnabled}
                onValueChange={async (value) => {
                  if (value) {
                    await checkLocationPermission();
                  } else {
                    setLocationEnabled(false);
                    if (backgroundTracking) {
                      await stopBackgroundLocationTracking();
                      setBackgroundTracking(false);
                    }
                  }
                }}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: ACCENT_LIGHT }}
                thumbColor={locationEnabled ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
              />
            </View>
            <Text style={[styles.statusText, { color: secondaryTextColor }]}>
              {locationEnabled
                ? 'Location tracking is enabled. Grant background permission to receive reminders when the app is closed.'
                : 'Enable location services to receive expense reminders based on your location.'}
            </Text>
          </GlassCard>
        </Animated.View>

        {/* Background Tracking Status */}
        {locationEnabled && (
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <GlassCard style={styles.statusCard} tint={isDark ? 'dark' : 'light'}>
              <View style={styles.statusRow}>
                <View style={styles.statusInfo}>
                  <Text style={[styles.statusLabel, { color: textColor }]}>
                    {'\u{1F30D}'} Background Tracking
                  </Text>
                  <Text style={[styles.statusSubtext, { color: secondaryTextColor }]}>
                    {backgroundTracking
                      ? 'Active - You will receive notifications even when the app is closed'
                      : 'Inactive - Only works when app is open'}
                  </Text>
                </View>
                <Switch
                  value={backgroundTracking}
                  onValueChange={handleToggleBackgroundTracking}
                  disabled={!locationEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.15)', true: ACCENT_LIGHT }}
                  thumbColor={backgroundTracking ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
                />
              </View>
              {!backgroundTracking && (
                <Text style={[styles.statusText, { color: secondaryTextColor, marginTop: 8, fontSize: 12 }]}>
                  Enable background tracking to get expense reminders when you leave locations, even if the app is closed.
                </Text>
              )}
            </GlassCard>
          </Animated.View>
        )}

        {/* Location Rules */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.rulesSection}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {'\u{1F4CB}'} Location Rules
          </Text>
          {loading ? (
            <ActivityIndicator size="large" color={ACCENT} style={styles.loader} />
          ) : rules.length === 0 ? (
            <GlassCard style={styles.emptyCard} tint={isDark ? 'dark' : 'light'}>
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>{'\u{1F4CD}'}</Text>
                <Text style={[styles.emptyText, { color: textColor }]}>
                  No location rules yet
                </Text>
                <Text style={[styles.emptySubtext, { color: secondaryTextColor }]}>
                  Create a rule to get reminders when you leave specific locations
                </Text>
              </View>
            </GlassCard>
          ) : (
            rules.map((rule, index) => (
              <Animated.View
                key={rule.id}
                entering={FadeInDown.duration(400).delay(400 + index * 80)}
              >
                <GlassCard style={styles.ruleCard} tint={isDark ? 'dark' : 'light'}>
                  <View style={styles.ruleHeader}>
                    <Text style={[styles.ruleName, { color: textColor }]}>
                      {rule.name || rule.locationType}
                    </Text>
                    {rule.isActive ? (
                      <LinearGradient
                        colors={[ACCENT, ACCENT_LIGHT]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.ruleBadge}
                      >
                        <Text style={styles.ruleBadgeText}>Active</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.ruleBadge, { backgroundColor: GLASS.bgMedium, borderWidth: 1, borderColor: GLASS.borderColor }]}>
                        <Text style={[styles.ruleBadgeText, { color: secondaryTextColor }]}>Inactive</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.ruleType, { color: secondaryTextColor }]}>
                    Type: {locationTypes.find(t => t.value === rule.locationType)?.label || rule.locationType}
                  </Text>
                  <Text style={[styles.ruleDetails, { color: secondaryTextColor }]}>
                    Radius: {rule.radius}m {'\u2022'} Min Duration: {(rule as any).minTimeSpent || rule.minDuration || 0}min
                  </Text>
                  <Text style={[styles.ruleDetails, { color: secondaryTextColor }]}>
                    Location: {rule.latitude.toFixed(4)}, {rule.longitude.toFixed(4)}
                  </Text>
                </GlassCard>
              </Animated.View>
            ))
          )}
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Rule Modal */}
      {showAddRule && (
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={GLASS.blurIntensity}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowAddRule(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContentWrapper}
          >
            <Animated.View
              entering={FadeInDown.duration(400).springify()}
            >
              <BlurView
                intensity={80}
                tint={isDark ? 'dark' : 'light'}
                style={[
                  styles.modalContent,
                  {
                    borderColor: GLASS.borderColorStrong,
                    backgroundColor: isDark ? 'rgba(15, 10, 40, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                  },
                ]}
              >
                <View style={[styles.modalHeader, { borderBottomColor: GLASS.borderColor }]}>
                  <Text style={[styles.modalTitle, { color: textColor }]}>Create Location Rule</Text>
                  <AnimatedPressable onPress={() => setShowAddRule(false)} scaleValue={0.95}>
                    <Text style={[styles.modalClose, { color: ACCENT_LIGHT }]}>Cancel</Text>
                  </AnimatedPressable>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.formSection}>
                    <Text style={[styles.formLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : colors.textSecondary }]}>
                      LOCATION TYPE
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                      {locationTypes.map(type => (
                        <AnimatedPressable
                          key={type.value}
                          onPress={() => setNewRule({ ...newRule, locationType: type.value })}
                          scaleValue={0.95}
                        >
                          {newRule.locationType === type.value ? (
                            <LinearGradient
                              colors={[ACCENT, ACCENT_LIGHT]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.typeChip}
                            >
                              <Text style={[styles.typeChipText, { color: '#FFFFFF' }]}>
                                {type.label}
                              </Text>
                            </LinearGradient>
                          ) : (
                            <BlurView
                              intensity={30}
                              tint={isDark ? 'dark' : 'light'}
                              style={[
                                styles.typeChip,
                                {
                                  borderWidth: 1,
                                  borderColor: GLASS.borderColor,
                                  backgroundColor: GLASS.bgLight,
                                },
                              ]}
                            >
                              <Text style={[styles.typeChipText, { color: isDark ? 'rgba(255,255,255,0.7)' : colors.text }]}>
                                {type.label}
                              </Text>
                            </BlurView>
                          )}
                        </AnimatedPressable>
                      ))}
                    </ScrollView>
                  </View>

                  <GlassInput
                    label="Name"
                    isDark={isDark}
                    textColor={textColor}
                    placeholderColor={placeholderColor}
                    labelColor={labelColor}
                    placeholder="Enter location name"
                    value={newRule.name}
                    onChangeText={(text: string) => setNewRule({ ...newRule, name: text })}
                  />

                  <View style={styles.formSection}>
                    <Text style={[styles.formLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : colors.textSecondary }]}>
                      COORDINATES
                    </Text>
                    <View style={styles.coordinateRow}>
                      <GlassInput
                        isDark={isDark}
                        textColor={textColor}
                        placeholderColor={placeholderColor}
                        labelColor={labelColor}
                        placeholder="Latitude"
                        keyboardType="decimal-pad"
                        value={newRule.latitude}
                        onChangeText={(text: string) => setNewRule({ ...newRule, latitude: text })}
                        containerStyle={styles.coordinateInput}
                      />
                      <GlassInput
                        isDark={isDark}
                        textColor={textColor}
                        placeholderColor={placeholderColor}
                        labelColor={labelColor}
                        placeholder="Longitude"
                        keyboardType="decimal-pad"
                        value={newRule.longitude}
                        onChangeText={(text: string) => setNewRule({ ...newRule, longitude: text })}
                        containerStyle={styles.coordinateInput}
                      />
                    </View>
                    <AnimatedPressable onPress={getCurrentLocation} scaleValue={0.97}>
                      <LinearGradient
                        colors={[ACCENT, ACCENT_LIGHT]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.locationButton}
                      >
                        <Text style={styles.locationButtonText}>
                          {'\u{1F4CD}'} Use Current Location
                        </Text>
                      </LinearGradient>
                    </AnimatedPressable>
                  </View>

                  <GlassInput
                    label="Radius (meters)"
                    isDark={isDark}
                    textColor={textColor}
                    placeholderColor={placeholderColor}
                    labelColor={labelColor}
                    placeholder="100"
                    keyboardType="decimal-pad"
                    value={newRule.radius}
                    onChangeText={(text: string) => setNewRule({ ...newRule, radius: text })}
                  />

                  <GlassInput
                    label="Min Duration (minutes)"
                    isDark={isDark}
                    textColor={textColor}
                    placeholderColor={placeholderColor}
                    labelColor={labelColor}
                    placeholder="5"
                    keyboardType="decimal-pad"
                    value={newRule.minDuration}
                    onChangeText={(text: string) => setNewRule({ ...newRule, minDuration: text })}
                  />

                  <AnimatedPressable onPress={handleCreateRule} scaleValue={0.97}>
                    <LinearGradient
                      colors={[ACCENT, ACCENT_LIGHT]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.submitButton}
                    >
                      <Text style={styles.submitButtonText}>Create Rule</Text>
                    </LinearGradient>
                  </AnimatedPressable>

                  <View style={{ height: 40 }} />
                </ScrollView>
              </BlurView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: GLASS.borderColor,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  addButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  statusCard: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusInfo: {
    flex: 1,
    marginRight: 12,
  },
  statusSubtext: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statusText: {
    fontSize: 13,
    lineHeight: 19,
  },
  rulesSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  loader: {
    marginVertical: 40,
  },
  emptyCard: {
    marginBottom: 12,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  ruleCard: {
    marginBottom: 12,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ruleName: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.2,
  },
  ruleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  ruleBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  ruleType: {
    fontSize: 14,
    marginBottom: 4,
  },
  ruleDetails: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  modalContentWrapper: {
    maxHeight: '85%',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  formSection: {
    marginBottom: 18,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  typeSelector: {
    marginTop: 4,
  },
  typeChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    overflow: 'hidden',
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  coordinateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coordinateInput: {
    flex: 1,
    marginBottom: 0,
  },
  locationButton: {
    padding: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    overflow: 'hidden',
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  submitButton: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    overflow: 'hidden',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
