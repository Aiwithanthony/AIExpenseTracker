import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Plant } from 'phosphor-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import AnimatedPressable from '../components/AnimatedPressable';

const BENTO_RADIUS = 18;

export default function RegisterScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Name is collected on the Set-up-your-profile step right after signup.
      await register(email, password, undefined, phoneNumber || undefined);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
              {/* Branding Area */}
              <Animated.View
                entering={FadeInDown.duration(400).delay(0)}
                style={styles.brandingArea}
              >
                <View style={[styles.brandIcon, { backgroundColor: colors.tintCool }]}>
                  <Plant size={32} color={colors.tintCoolText} weight="duotone" />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>Create account</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>A cozier way to track your money</Text>
              </Animated.View>

              {/* Form Card */}
              <Animated.View entering={FadeInDown.duration(400).delay(80)}>
                <GlassCard style={styles.formCard} tint={isDark ? 'dark' : 'light'}>
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

                  <GlassInput
                    label="Phone Number"
                    isDark={isDark}
                    textColor={colors.text}
                    placeholderColor={colors.textTertiary}
                    labelColor={colors.textSecondary}
                    placeholder="Phone Number (Optional)"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                  />
                </GlassCard>
              </Animated.View>

              {/* Sign Up Button */}
              <Animated.View entering={FadeInDown.duration(400).delay(160)}>
                <AnimatedPressable
                  onPress={handleRegister}
                  disabled={loading}
                  style={styles.signUpButtonWrapper}
                >
                  <View
                    style={[
                      styles.signUpButton,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.signUpButtonText}>Sign Up</Text>
                    )}
                  </View>
                </AnimatedPressable>
              </Animated.View>

              {/* Sign In Link */}
              <Animated.View entering={FadeInDown.duration(400).delay(240)}>
                <AnimatedPressable
                  onPress={() => navigation.navigate('Login')}
                  style={styles.linkButton}
                >
                  <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                    Already have an account?{' '}
                    <Text style={[styles.linkTextAccent, { color: colors.primary }]}>Sign in</Text>
                  </Text>
                </AnimatedPressable>
              </Animated.View>
            </ScrollView>
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
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
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
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
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
    borderRadius: BENTO_RADIUS,
    overflow: 'hidden',
  },
  signUpButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: BENTO_RADIUS,
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
  },
  linkTextAccent: {
    fontWeight: '600',
  },
});
