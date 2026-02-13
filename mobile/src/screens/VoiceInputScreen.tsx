import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Animated } from 'react-native';
// SafeAreaView removed — this screen is inside a stack navigator with a visible header
import { useTheme } from '../context/ThemeContext';
import { AudioModule, setAudioModeAsync, RecordingPresets, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { api } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import ReanimatedAnimated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import GlassCard from '../components/GlassCard';
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

/* ── Pulsing ring around the mic button ── */
const PulsingRing: React.FC<{ active: boolean; delay: number; size: number }> = ({
  active,
  delay,
  size,
}) => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0, { duration: delay }),
          withTiming(1, { duration: 1200 }),
        ),
        -1,
        false,
      );
    } else {
      pulse.value = withTiming(0, { duration: 300 });
    }
  }, [active, delay, pulse]);

  const ringStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulse.value, [0, 1], [1, 1.6 + (size * 0.15)]);
    const opacity = interpolate(pulse.value, [0, 0.5, 1], [0.5, 0.25, 0]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <ReanimatedAnimated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: active ? '#FF3B30' : ACCENT_LIGHT,
        },
        ringStyle,
      ]}
    />
  );
};

/* ── Pulsing red dot indicator ── */
const PulsingDot: React.FC = () => {
  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    dotOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
      false,
    );
  }, [dotOpacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  return (
    <ReanimatedAnimated.View
      style={[
        {
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: '#FF3B30',
          marginRight: 8,
        },
        animStyle,
      ]}
    />
  );
};

export default function VoiceInputScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [processing, setProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { isRecording, canRecord } = useAudioRecorderState(audioRecorder);

  useEffect(() => {
    // Request permissions on mount
    (async () => {
      try {
        const { status } = await AudioModule.getRecordingPermissionsAsync();
        if (status !== 'granted') {
          const result = await AudioModule.requestRecordingPermissionsAsync();
          setPermissionGranted(result.granted === true);
        } else {
          setPermissionGranted(true);
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }
    })();
  }, []);

  // Update duration when recording
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        audioRecorder.stop().catch(() => {});
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isRecording, audioRecorder]);

  async function startRecording() {
    try {
      if (!permissionGranted) {
        Alert.alert(
          'Permission needed',
          'Please grant microphone permission in your device settings to record voice expenses.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Set audio mode for recording (required for iOS)
      // Use 'allowsRecording' not 'allowsRecordingIOS' for expo-audio
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Prepare and start recording
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (err: any) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', err.message || 'Failed to start recording');
    }
  }

  async function stopRecording() {
    if (!isRecording) return;

    setProcessing(true);
    setProgress(0);
    progressAnim.setValue(0);
    setStatus('Preparing audio...');

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    try {
      // Stop recording
      await audioRecorder.stop();

      // Wait a moment for URI to be available
      await new Promise(resolve => setTimeout(resolve, 100));

      const recordingUri = audioRecorder.uri;

      if (!recordingUri) {
        throw new Error('No recording URI');
      }

      const mimeType = 'audio/m4a';

      // Start progress animation (estimated 5 seconds total)
      const estimatedDuration = 5000; // 5 seconds
      const progressSteps = [
        { time: 0, status: 'Uploading audio...', progress: 10 },
        { time: 1000, status: 'Transcribing audio...', progress: 40 },
        { time: 2500, status: 'Processing expenses...', progress: 70 },
        { time: 4000, status: 'Finalizing...', progress: 90 },
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

      // Make API call
      const { expenses } = await api.processVoiceFile(recordingUri, mimeType);

      // Complete progress
      setStatus('Done!');
      setProgress(100);
      progressAnim.setValue(1);

      // Handle array of expenses
      const expenseArray = Array.isArray(expenses) ? expenses : [expenses];
      const count = expenseArray.length;

      if (count === 0) {
        Alert.alert('No expenses found', 'Please try recording again with a clearer description');
        setStatus('');
        setProgress(0);
        progressAnim.setValue(0);
        return;
      }

      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 300));

      Alert.alert(
        'Success',
        count === 1
          ? 'Expense logged from voice!'
          : `${count} expenses logged from voice!`,
        [
          { text: 'OK', onPress: () => navigation.navigate('Expenses') },
        ],
      );
    } catch (error: any) {
      console.error('Error processing voice', error);
      Alert.alert('Error', error.message || 'Failed to process voice recording');
      setStatus('');
      setProgress(0);
      progressAnim.setValue(0);
    } finally {
      setProcessing(false);
      setRecordingDuration(0);
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <LinearGradient
      colors={['#0D0221', '#1A0533', ACCENT + '40']}
      style={styles.gradientRoot}
    >
      <View style={styles.safeArea}>
        <View style={styles.container}>

          {/* ── Title Area ── */}
          <ReanimatedAnimated.View entering={FadeInDown.duration(500)} style={styles.titleArea}>
            <Text style={styles.title}>Voice Input</Text>
            <Text style={styles.subtitle}>Record your expense description</Text>
          </ReanimatedAnimated.View>

          {/* ── Main Content ── */}
          <View style={styles.recordingContainer}>

            {/* ── Microphone Button ── */}
            <ReanimatedAnimated.View entering={FadeIn.duration(600).delay(200)} style={styles.micSection}>
              <View style={styles.micRingWrapper}>
                {/* Concentric pulsing rings (visible when recording) */}
                <PulsingRing active={isRecording} delay={0} size={90} />
                <PulsingRing active={isRecording} delay={300} size={90} />
                <PulsingRing active={isRecording} delay={600} size={90} />

                <AnimatedPressable
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={processing || (!isRecording && !permissionGranted)}
                  scaleValue={0.92}
                  style={styles.micPressable}
                >
                  <BlurView
                    intensity={GLASS.blurIntensity}
                    tint={isDark ? 'dark' : 'light'}
                    style={[
                      styles.micButton,
                      isRecording && styles.micButtonRecording,
                    ]}
                  >
                    <Text style={styles.micIcon}>
                      {isRecording ? '\u23F9' : '\uD83C\uDFA4'}
                    </Text>
                  </BlurView>
                </AnimatedPressable>
              </View>
            </ReanimatedAnimated.View>

            {/* ── Recording State ── */}
            {isRecording ? (
              <ReanimatedAnimated.View
                entering={FadeInDown.duration(400)}
                style={styles.recordingView}
              >
                {/* Recording indicator with pulsing dot */}
                <View style={styles.recordingIndicator}>
                  <PulsingDot />
                  <Text style={styles.recordingText}>Recording...</Text>
                </View>

                {/* Duration */}
                <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>

                {/* Stop & Process button */}
                <AnimatedPressable
                  onPress={stopRecording}
                  disabled={processing}
                  scaleValue={0.95}
                  style={styles.actionButtonWrapper}
                >
                  <LinearGradient
                    colors={['#FF3B30', '#CC2D25']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionButton}
                  >
                    {processing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Stop & Process</Text>
                    )}
                  </LinearGradient>
                </AnimatedPressable>
              </ReanimatedAnimated.View>
            ) : (
              <ReanimatedAnimated.View
                entering={FadeInDown.duration(400)}
                style={styles.notRecordingView}
              >
                {/* Start Recording button */}
                <AnimatedPressable
                  onPress={startRecording}
                  disabled={processing || !permissionGranted}
                  scaleValue={0.95}
                  style={styles.actionButtonWrapper}
                >
                  <LinearGradient
                    colors={[ACCENT, ACCENT_LIGHT]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionButton}
                  >
                    <Text style={styles.buttonText}>Start Recording</Text>
                  </LinearGradient>
                </AnimatedPressable>
              </ReanimatedAnimated.View>
            )}

            {/* ── Progress / Processing Section ── */}
            {processing && !isRecording && (
              <ReanimatedAnimated.View
                entering={FadeInDown.duration(500).delay(100)}
                style={styles.processingWrapper}
              >
                <GlassCard
                  intensity={GLASS.blurIntensity}
                  tint={isDark ? 'dark' : 'light'}
                  style={styles.progressCard}
                >
                  <ActivityIndicator size="large" color={ACCENT_LIGHT} style={styles.spinner} />

                  {/* Progress Bar with gradient fill */}
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
                        colors={[ACCENT, ACCENT_LIGHT, '#A855F7']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                    </Animated.View>
                  </View>

                  {/* Status Text */}
                  <Text style={[styles.processingText, { color: colors.text }]}>
                    {status || 'Processing your voice...'}
                  </Text>

                  {/* Progress Percentage */}
                  <Text style={[styles.progressPercentage, { color: colors.text, opacity: 0.6 }]}>
                    {Math.round(progress)}%
                  </Text>
                </GlassCard>
              </ReanimatedAnimated.View>
            )}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientRoot: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },

  /* ── Title ── */
  titleArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },

  /* ── Recording Container ── */
  recordingContainer: {
    alignItems: 'center',
  },

  /* ── Mic Button ── */
  micSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  micRingWrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micPressable: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
  },
  micButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: GLASS.borderColorStrong,
    overflow: 'hidden',
  },
  micButtonRecording: {
    borderColor: 'rgba(255, 59, 48, 0.5)',
  },
  micIcon: {
    fontSize: 32,
    color: '#FFFFFF',
  },

  /* ── Recording View ── */
  recordingView: {
    alignItems: 'center',
    width: '100%',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
  },
  durationText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 28,
    letterSpacing: 2,
  },

  /* ── Not Recording View ── */
  notRecordingView: {
    alignItems: 'center',
    width: '100%',
  },

  /* ── Action Buttons ── */
  actionButtonWrapper: {
    borderRadius: 50,
    overflow: 'hidden',
    minWidth: 200,
  },
  actionButton: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },

  /* ── Processing / Progress ── */
  processingWrapper: {
    marginTop: 32,
    width: '100%',
  },
  progressCard: {
    alignItems: 'center',
    borderColor: GLASS.borderColor,
    backgroundColor: GLASS.bgLight,
  },
  spinner: {
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: GLASS.bgDark,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  progressPercentage: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
