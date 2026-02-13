import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import AnimatedPressable from '../components/AnimatedPressable';

const ACCENT = '#6A0DAD';
const ACCENT_LIGHT = '#8B2FC9';

export default function RegisterScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name, phoneNumber || undefined);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0D0221', '#0F0326', '#1A0533']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Decorative orbs */}
              <View style={styles.orbContainer}>
                <View style={[styles.orb, styles.orbPrimary]} />
                <View style={[styles.orb, styles.orbSecondary]} />
              </View>

              {/* Branding Area */}
              <Animated.View
                entering={FadeInDown.duration(600).delay(100)}
                style={styles.brandingArea}
              >
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Sign up to get started</Text>
              </Animated.View>

              {/* Form Card */}
              <Animated.View entering={FadeInDown.duration(600).delay(250)}>
                <GlassCard style={styles.formCard}>
                  <GlassInput
                    label="Full Name"
                    isDark={true}
                    textColor="#FFFFFF"
                    placeholderColor="rgba(255,255,255,0.4)"
                    labelColor="rgba(255,255,255,0.6)"
                    placeholder="Full Name"
                    value={name}
                    onChangeText={setName}
                  />

                  <GlassInput
                    label="Email"
                    isDark={true}
                    textColor="#FFFFFF"
                    placeholderColor="rgba(255,255,255,0.4)"
                    labelColor="rgba(255,255,255,0.6)"
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <GlassInput
                    label="Password"
                    isDark={true}
                    textColor="#FFFFFF"
                    placeholderColor="rgba(255,255,255,0.4)"
                    labelColor="rgba(255,255,255,0.6)"
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />

                  <GlassInput
                    label="Phone Number"
                    isDark={true}
                    textColor="#FFFFFF"
                    placeholderColor="rgba(255,255,255,0.4)"
                    labelColor="rgba(255,255,255,0.6)"
                    placeholder="Phone Number (Optional)"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                  />
                </GlassCard>
              </Animated.View>

              {/* Sign Up Button */}
              <Animated.View entering={FadeInDown.duration(600).delay(400)}>
                <AnimatedPressable
                  onPress={handleRegister}
                  disabled={loading}
                  style={styles.signUpButtonWrapper}
                >
                  <LinearGradient
                    colors={[ACCENT, ACCENT_LIGHT]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.signUpButton}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.signUpButtonText}>Sign Up</Text>
                    )}
                  </LinearGradient>
                </AnimatedPressable>
              </Animated.View>

              {/* Sign In Link */}
              <Animated.View entering={FadeInDown.duration(600).delay(550)}>
                <AnimatedPressable
                  onPress={() => navigation.navigate('Login')}
                  style={styles.linkButton}
                >
                  <Text style={styles.linkText}>
                    Already have an account?{' '}
                    <Text style={styles.linkTextAccent}>Sign in</Text>
                  </Text>
                </AnimatedPressable>
              </Animated.View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },

  // Decorative orbs
  orbContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: -1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbPrimary: {
    width: 220,
    height: 220,
    top: -50,
    right: -50,
    backgroundColor: 'rgba(106, 13, 173, 0.3)',
  },
  orbSecondary: {
    width: 180,
    height: 180,
    bottom: -40,
    left: -40,
    backgroundColor: 'rgba(91, 82, 255, 0.2)',
  },

  // Branding
  brandingArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },

  // Form Card
  formCard: {
    padding: 20,
    marginBottom: 8,
  },

  // Sign Up Button
  signUpButtonWrapper: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  signUpButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Link
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  linkTextAccent: {
    color: ACCENT_LIGHT,
    fontWeight: '600',
  },
});
