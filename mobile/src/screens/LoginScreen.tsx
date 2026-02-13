import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useGoogleAuth } from '../services/oauth';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import AnimatedPressable from '../components/AnimatedPressable';

const ACCENT = '#6A0DAD';
const ACCENT_LIGHT = '#8B2FC9';

const GLASS = {
  borderColor: 'rgba(255, 255, 255, 0.2)',
  borderColorStrong: 'rgba(255, 255, 255, 0.3)',
  bgLight: 'rgba(255, 255, 255, 0.08)',
  bgMedium: 'rgba(255, 255, 255, 0.12)',
  bgDark: 'rgba(0, 0, 0, 0.2)',
  blurIntensity: 60,
  borderRadius: 16,
};

export default function LoginScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { login, appleLogin, setUserAfterOAuth } = useAuth();
  const { signIn: signInWithGoogle, isLoading: googleLoading, isReady: googleReady } = useGoogleAuth();

  useEffect(() => {
    // Check if Apple Sign-In is available
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  // Handle Google sign-in success
  useEffect(() => {
    // The useGoogleAuth hook handles the OAuth flow internally
    // We just need to listen for when it completes and update the user
    // This is handled by the hook's internal useEffect
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // The hook handles the OAuth flow and backend call
      // We need to manually update the user after successful login
      const response = await signInWithGoogle();
      if (response?.user) {
        setUserAfterOAuth(response.user);
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Google sign-in failed');
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      await appleLogin();
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Apple sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || googleLoading;

  return (
    <LinearGradient
      colors={['#0D0221', '#0F0326', '#1A0533']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
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
                <Text style={styles.title}>Expense Tracker</Text>
                <Text style={styles.subtitle}>Sign in to continue</Text>
              </Animated.View>

              {/* Form Card */}
              <Animated.View entering={FadeInDown.duration(600).delay(250)}>
                <GlassCard style={styles.formCard}>
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
                </GlassCard>
              </Animated.View>

              {/* Sign In Button */}
              <Animated.View entering={FadeInDown.duration(600).delay(400)}>
                <AnimatedPressable
                  onPress={handleLogin}
                  disabled={isLoading}
                  style={styles.signInButtonWrapper}
                >
                  <LinearGradient
                    colors={[ACCENT, ACCENT_LIGHT]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.signInButton}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.signInButtonText}>Sign In</Text>
                    )}
                  </LinearGradient>
                </AnimatedPressable>
              </Animated.View>

              {/* Divider */}
              <Animated.View
                entering={FadeInDown.duration(600).delay(500)}
                style={styles.divider}
              >
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </Animated.View>

              {/* Google Button */}
              <Animated.View entering={FadeInDown.duration(600).delay(600)}>
                <AnimatedPressable
                  onPress={handleGoogleLogin}
                  disabled={!googleReady || isLoading}
                  style={styles.socialButtonWrapper}
                >
                  <BlurView
                    intensity={GLASS.blurIntensity}
                    tint={isDark ? 'dark' : 'light'}
                    style={styles.googleButton}
                  >
                    {googleLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.googleButtonText}>
                        {'\uD83D\uDD35'} Continue with Google
                      </Text>
                    )}
                  </BlurView>
                </AnimatedPressable>
              </Animated.View>

              {/* Apple Button */}
              {Platform.OS === 'ios' && appleAvailable && (
                <Animated.View entering={FadeInDown.duration(600).delay(700)}>
                  <AnimatedPressable
                    onPress={handleAppleLogin}
                    disabled={isLoading}
                    style={styles.socialButtonWrapper}
                  >
                    <View style={styles.appleButton}>
                      <Text style={styles.appleButtonText}>
                        {'\uD83C\uDF4E'} Continue with Apple
                      </Text>
                    </View>
                  </AnimatedPressable>
                </Animated.View>
              )}

              {/* Sign Up Link */}
              <Animated.View entering={FadeInDown.duration(600).delay(800)}>
                <AnimatedPressable
                  onPress={() => navigation.navigate('Register')}
                  style={styles.linkButton}
                >
                  <Text style={styles.linkText}>
                    Don&apos;t have an account?{' '}
                    <Text style={styles.linkTextAccent}>Sign up</Text>
                  </Text>
                </AnimatedPressable>
              </Animated.View>
            </View>
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
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
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

  // Sign In Button
  signInButtonWrapper: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  signInButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
  },

  // Google Button
  socialButtonWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  googleButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Apple Button
  appleButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Link
  linkButton: {
    marginTop: 16,
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
