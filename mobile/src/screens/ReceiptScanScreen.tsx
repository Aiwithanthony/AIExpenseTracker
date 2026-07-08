import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { Text } from '../components/AppText';
// SafeAreaView removed: screen is inside a stack navigator with a visible header
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { Camera, Image as PhImage } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { api } from '../services/api';
import AnimatedPressable from '../components/AnimatedPressable';

// Design system tokens
const BENTO_RADIUS = 18;

export default function ReceiptScanScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const cardBg = colors.card;
  const inputBg = colors.inputBg;
  const borderColor = colors.border;

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
    <View style={[styles.background, { backgroundColor: colors.background }]}>
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
          <Text style={[styles.title, { color: colors.text }]}>Scan Receipt</Text>
          <Text style={[styles.subtitle, { color: colors.text, opacity: 0.5 }]}>
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
              <View
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: cardBg,
                    borderColor: borderColor,
                    borderWidth: 0.5,
                    borderRadius: BENTO_RADIUS,
                  },
                  processing && styles.actionCardDisabled,
                ]}
              >
                <View style={styles.actionCardRow}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: isDark ? `${colors.primary}26` : `${colors.primary}14` },
                    ]}
                  >
                    <Camera size={28} color={colors.primary} weight="duotone" />
                  </View>
                  <View style={styles.actionCardTextBlock}>
                    <Text style={[styles.actionCardTitle, { color: colors.text }]}>Take Photo</Text>
                    <Text style={[styles.actionCardSubtitle, { color: colors.text, opacity: 0.55 }]}>
                      Use your camera
                    </Text>
                  </View>
                </View>
              </View>
            </AnimatedPressable>
          </ReAnimated.View>

          {/* Choose from Gallery Card */}
          <ReAnimated.View entering={FadeInDown.duration(500).delay(300)}>
            <AnimatedPressable
              onPress={pickImage}
              disabled={processing}
              scaleValue={0.97}
            >
              <View
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: cardBg,
                    borderColor: borderColor,
                    borderWidth: 0.5,
                    borderRadius: BENTO_RADIUS,
                  },
                  processing && styles.actionCardDisabled,
                ]}
              >
                <View style={styles.actionCardRow}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: isDark ? `${colors.primary}26` : `${colors.primary}14` },
                    ]}
                  >
                    <PhImage size={28} color={colors.primary} weight="duotone" />
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
              </View>
            </AnimatedPressable>
          </ReAnimated.View>
        </View>

        {/* Processing / Progress Section */}
        {processing && (
          <ReAnimated.View entering={FadeInDown.duration(400).delay(100)}>
            <View
              style={[
                styles.progressCard,
                {
                  backgroundColor: cardBg,
                  borderColor: borderColor,
                  borderWidth: 0.5,
                  borderRadius: BENTO_RADIUS,
                },
              ]}
            >
              <ActivityIndicator size="large" color={colors.primary} />

              {/* Progress Bar */}
              <View style={[styles.progressBarContainer, { backgroundColor: inputBg }]}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: colors.primary,
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>

              {/* Status Text */}
              <Text style={[styles.statusText, { color: colors.text }]}>
                {status || 'Processing receipt...'}
              </Text>

              {/* Progress Percentage */}
              <Text style={[styles.percentageText, { color: colors.text, opacity: 0.5 }]}>
                {Math.round(progress)}%
              </Text>
            </View>
          </ReAnimated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
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

  // -- Title ---------------------------------------------------------------
  titleArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },

  // -- Action Cards --------------------------------------------------------
  cardsContainer: {
    gap: 16,
  },
  actionCard: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    minHeight: 72,
    overflow: 'hidden',
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

  // -- Progress Card -------------------------------------------------------
  progressCard: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
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
