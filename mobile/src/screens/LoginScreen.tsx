import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Wallet } from 'phosphor-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useGoogleAuth } from '../services/oauth';
import GlassInput from '../components/GlassInput';
import AnimatedPressable from '../components/AnimatedPressable';

export default function LoginScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { login, appleLogin, setUserAfterOAuth } = useAuth();
  const { signIn: signInWithGoogle, isLoading: googleLoading, isReady: googleReady } = useGoogleAuth();

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Enter your email and password to sign in.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'Check your email and password, then try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await signInWithGoogle();
      if (response?.user) {
        setUserAfterOAuth(response.user, (response as any)?.isNewUser);
      }
    } catch (error: any) {
      Alert.alert('Google Sign In Failed', error.message || 'Could not complete Google sign-in. Try again.');
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      await appleLogin();
    } catch (error: any) {
      Alert.alert('Apple Sign In Failed', error.message || 'Could not complete Apple sign-in. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || googleLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.inner}>
              {/* Branding */}
              <Animated.View
                entering={FadeInDown.duration(400).delay(0)}
                style={styles.brandingArea}
              >
                <View style={[styles.brandIcon, { backgroundColor: colors.tintWarm }]}>
                  <Wallet size={32} color={colors.tintWarmText} weight="duotone" />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>
                  Welcome back
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Track your money with confidence
                </Text>
              </Animated.View>

              {/* Form Card */}
              <Animated.View entering={FadeInDown.duration(400).delay(80)}>
                <View style={[
                  styles.formCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}>
                  <GlassInput
                    label="Email"
                    isDark={isDark}
                    textColor={colors.text}
                    placeholderColor={colors.textTertiary}
                    labelColor={colors.textSecondary}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <GlassInput
                    label="Password"
                    isDark={isDark}
                    textColor={colors.text}
                    placeholderColor={colors.textTertiary}
                    labelColor={colors.textSecondary}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </Animated.View>

              {/* Sign In Button */}
              <Animated.View entering={FadeInDown.duration(400).delay(160)}>
                <AnimatedPressable
                  onPress={handleLogin}
                  disabled={isLoading}
                  style={styles.signInWrapper}
                >
                  <View style={[styles.signInButton, { backgroundColor: colors.primary }]}>
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.signInText}>Sign In</Text>
                    )}
                  </View>
                </AnimatedPressable>
              </Animated.View>

              {/* Divider */}
              <Animated.View
                entering={FadeInDown.duration(400).delay(240)}
                style={styles.divider}
              >
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textTertiary }]}>OR</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </Animated.View>

              {/* Google Button */}
              <Animated.View entering={FadeInDown.duration(400).delay(320)}>
                <AnimatedPressable
                  onPress={handleGoogleLogin}
                  disabled={!googleReady || isLoading}
                  style={styles.socialWrapper}
                >
                  <View style={[
                    styles.socialButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.borderStrong,
                    },
                  ]}>
                    {googleLoading ? (
                      <ActivityIndicator color={colors.text} />
                    ) : (
                      <Text style={[styles.socialText, { color: colors.text }]}>
                        Continue with Google
                      </Text>
                    )}
                  </View>
                </AnimatedPressable>
              </Animated.View>

              {/* Apple Button */}
              {Platform.OS === 'ios' && appleAvailable && (
                <Animated.View entering={FadeInDown.duration(400).delay(400)}>
                  <AnimatedPressable
                    onPress={handleAppleLogin}
                    disabled={isLoading}
                    style={styles.socialWrapper}
                  >
                    <View style={[styles.socialButton, styles.appleButton, { borderColor: isDark ? '#38383a' : '#000000' }]}>
                      <Text style={styles.appleText}>
                        Continue with Apple
                      </Text>
                    </View>
                  </AnimatedPressable>
                </Animated.View>
              )}

              {/* Sign Up Link */}
              <Animated.View entering={FadeInDown.duration(400).delay(480)}>
                <AnimatedPressable
                  onPress={() => navigation.navigate('Register')}
                  style={styles.linkButton}
                >
                  <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                    Don&apos;t have an account?{' '}
                    <Text style={[styles.linkTextAccent, { color: colors.primary }]}>Sign up</Text>
                  </Text>
                </AnimatedPressable>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },

  // Branding
  brandingArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandIconText: {
    fontSize: 34,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },

  // Form
  formCard: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    borderWidth: 0.5,
    ...Platform.select({
      ios: {
        shadowColor: '#5E4A36',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },

  // Sign In
  signInWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  signInButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
  },
  signInText: {
    color: '#ffffff',
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
    height: 0.5,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: '600',
  },

  // Social Buttons
  socialWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  socialButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 0.5,
  },
  socialText: {
    fontSize: 16,
    fontWeight: '600',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  appleText: {
    color: '#ffffff',
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
  },
  linkTextAccent: {
    fontWeight: '600',
  },
});
