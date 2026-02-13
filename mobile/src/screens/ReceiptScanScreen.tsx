import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
// SafeAreaView removed: screen is inside a stack navigator with a visible header
import { LinearGradient } from 'expo-linear-gradient';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import AnimatedPressable from '../components/AnimatedPressable';

// Design system tokens
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

export default function ReceiptScanScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permission');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      await processReceipt(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permission');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      await processReceipt(result.assets[0].uri);
    }
  };

  const processReceipt = async (imageUri: string) => {
    setProcessing(true);
    setProgress(0);
    progressAnim.setValue(0);
    setStatus('Optimizing image...');

    try {
      // Step 1: Resize and optimize image for faster upload
      setProgress(10);
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1200 } }], // Max 1200px width (sufficient for OCR, reduces size)
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // Lower quality for smaller size
      );

      // Step 2: Combined upload, OCR, and processing in one request (much faster!)
      // Estimate total processing time (typically 3-5 seconds)
      const estimatedDuration = 4000; // 4 seconds
      const progressSteps = [
        { time: 0, status: 'Uploading receipt...', progress: 20 },
        { time: 800, status: 'Extracting text from receipt...', progress: 50 },
        { time: 2000, status: 'Processing receipt data...', progress: 80 },
        { time: 3200, status: 'Finalizing...', progress: 95 },
      ];

      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: estimatedDuration,
        useNativeDriver: false,
      }).start();

      // Update status at different stages
      progressSteps.forEach((step) => {
        setTimeout(() => {
          setStatus(step.status);
          setProgress(step.progress);
        }, step.time);
      });

      const expense = await api.processReceiptImage(manipulatedImage.uri);

      // Complete progress
      setStatus('Done!');
      setProgress(100);
      progressAnim.setValue(1);

      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 300));

      Alert.alert('Success', 'Receipt processed!', [
        { text: 'OK', onPress: () => navigation.navigate('Expenses') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process receipt');
      setStatus('');
      setProgress(0);
      progressAnim.setValue(0);
    } finally {
      setProcessing(false);
      setStatus('');
      setProgress(0);
    }
  };

  return (
    <LinearGradient
      colors={['#0D0221', '#1A0533', ACCENT + '40']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBackground}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title Area */}
        <ReAnimated.View
          entering={FadeInDown.duration(500).delay(0)}
          style={styles.titleArea}
        >
          <Text style={styles.title}>Scan Receipt</Text>
          <Text style={styles.subtitle}>
            Take a photo or select from gallery
          </Text>
        </ReAnimated.View>

        {/* Action Cards */}
        <View style={styles.cardsContainer}>
          {/* Take Photo Card */}
          <ReAnimated.View entering={FadeInDown.duration(500).delay(150)}>
            <AnimatedPressable
              onPress={takePhoto}
              disabled={processing}
              scaleValue={0.97}
            >
              <GlassCard
                intensity={GLASS.blurIntensity}
                tint={isDark ? 'dark' : 'light'}
                style={[
                  styles.actionCard,
                  { backgroundColor: GLASS.bgLight },
                  processing && styles.actionCardDisabled,
                ]}
              >
                <View style={styles.actionCardRow}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: 'rgba(106, 13, 173, 0.15)' },
                    ]}
                  >
                    <Text style={styles.iconEmoji}>{'\uD83D\uDCF7'}</Text>
                  </View>
                  <View style={styles.actionCardTextBlock}>
                    <Text style={[styles.actionCardTitle, { color: colors.text }]}>Take Photo</Text>
                    <Text style={[styles.actionCardSubtitle, { color: colors.text, opacity: 0.55 }]}>
                      Use your camera
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </AnimatedPressable>
          </ReAnimated.View>

          {/* Choose from Gallery Card */}
          <ReAnimated.View entering={FadeInDown.duration(500).delay(300)}>
            <AnimatedPressable
              onPress={pickImage}
              disabled={processing}
              scaleValue={0.97}
            >
              <GlassCard
                intensity={GLASS.blurIntensity}
                tint={isDark ? 'dark' : 'light'}
                style={[
                  styles.actionCard,
                  { backgroundColor: GLASS.bgLight },
                  processing && styles.actionCardDisabled,
                ]}
              >
                <View style={styles.actionCardRow}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: 'rgba(0, 122, 255, 0.15)' },
                    ]}
                  >
                    <Text style={styles.iconEmoji}>
                      {'\uD83D\uDDBC\uFE0F'}
                    </Text>
                  </View>
                  <View style={styles.actionCardTextBlock}>
                    <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                      Choose from Gallery
                    </Text>
                    <Text style={[styles.actionCardSubtitle, { color: colors.text, opacity: 0.55 }]}>
                      Select an image
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </AnimatedPressable>
          </ReAnimated.View>
        </View>

        {/* Processing / Progress Section */}
        {processing && (
          <ReAnimated.View entering={FadeInDown.duration(400).delay(100)}>
            <GlassCard
              intensity={GLASS.blurIntensity}
              tint={isDark ? 'dark' : 'light'}
              style={[
                styles.progressCard,
                { backgroundColor: GLASS.bgMedium },
              ]}
            >
              <ActivityIndicator size="large" color={ACCENT_LIGHT} />

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[ACCENT, ACCENT_LIGHT]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressGradient}
                  />
                </Animated.View>
              </View>

              {/* Status Text */}
              <Text style={[styles.statusText, { color: colors.text }]}>
                {status || 'Processing receipt...'}
              </Text>

              {/* Progress Percentage */}
              <Text style={[styles.percentageText, { color: colors.text, opacity: 0.5 }]}>
                {Math.round(progress)}%
              </Text>
            </GlassCard>
          </ReAnimated.View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  // ── Title ──────────────────────────────────────────────────────────
  titleArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },

  // ── Action Cards ───────────────────────────────────────────────────
  cardsContainer: {
    gap: 16,
  },
  actionCard: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    minHeight: 72,
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 24,
  },
  actionCardTextBlock: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionCardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 3,
  },

  // ── Progress Card ──────────────────────────────────────────────────
  progressCard: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
    borderRadius: 4,
  },
  statusText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  percentageText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
  },
});
