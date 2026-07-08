import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Animated } from 'react-native';
import { Text } from '../components/AppText';
// SafeAreaView removed — this screen is inside a stack navigator with a visible header
import { Microphone, Stop } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { AudioModule, setAudioModeAsync, RecordingPresets, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { api } from '../services/api';
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

const BENTO_RADIUS = 18;

/* ── Pulsing ring around the mic button ── */
const PulsingRing: React.FC<{ active: boolean; delay: number; size: number; color: string }> = ({
  active,
  delay,
  size,
  color,
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
          borderColor: active ? '#E0503C' : color,
        },
        ringStyle,
      ]}
    />
  );
};

/* ── Pulsing red dot indicator ── */
const PulsingDot: React.FC<{ color?: string }> = ({ color = '#E0503C' }) => {
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
          backgroundColor: color,
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

  const cardBg = colors.card;
  const inputBg = colors.inputBg;
  const borderColor = colors.border;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.safeArea}>
        <View style={styles.container}>

          {/* ── Title Area ── */}
          <ReanimatedAnimated.View entering={FadeInDown.duration(400)} style={styles.titleArea}>
            <Text style={[styles.title, { color: colors.text }]}>Voice Input</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Record your expense description
            </Text>
          </ReanimatedAnimated.View>

          {/* ── Main Content ── */}
          <View style={styles.recordingContainer}>

            {/* ── Microphone Button ── */}
            <ReanimatedAnimated.View entering={FadeIn.duration(600).delay(200)} style={styles.micSection}>
              <View style={styles.micRingWrapper}>
                {/* Concentric pulsing rings (visible when recording) */}
                <PulsingRing active={isRecording} delay={0} size={90} color={colors.primary} />
                <PulsingRing active={isRecording} delay={300} size={90} color={colors.primary} />
                <PulsingRing active={isRecording} delay={600} size={90} color={colors.primary} />

                <AnimatedPressable
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={processing || (!isRecording && !permissionGranted)}
                  scaleValue={0.92}
                  style={styles.micPressable}
                >
                  <View
                    style={[
                      styles.micButton,
                      {
                        backgroundColor: isRecording ? colors.error : colors.primary,
                        borderWidth: 0.5,
                        borderColor: borderColor,
                      },
                    ]}
                  >
                    {isRecording ? (
                      <Stop size={40} color="#FFFFFF" weight="fill" />
                    ) : (
                      <Microphone size={40} color="#FFFFFF" weight="fill" />
                    )}
                  </View>
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
                  <PulsingDot color={colors.error} />
                  <Text style={[styles.recordingText, { color: colors.error }]}>Recording...</Text>
                </View>

                {/* Duration */}
                <Text style={[styles.durationText, { color: colors.text }]}>
                  {formatDuration(recordingDuration)}
                </Text>

                {/* Stop & Process button */}
                <AnimatedPressable
                  onPress={stopRecording}
                  disabled={processing}
                  scaleValue={0.95}
                  style={styles.actionButtonWrapper}
                >
                  <View style={[styles.actionButton, { backgroundColor: colors.error }]}>
                    {processing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Stop & Process</Text>
                    )}
                  </View>
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
                  <View style={[styles.actionButton, { backgroundColor: colors.primary }]}>
                    <Text style={styles.buttonText}>Start Recording</Text>
                  </View>
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
                  tint={isDark ? 'dark' : 'light'}
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
                  <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />

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
                  <Text style={[styles.processingText, { color: colors.text }]}>
                    {status || 'Processing your voice...'}
                  </Text>

                  {/* Progress Percentage */}
                  <Text style={[styles.progressPercentage, { color: colors.textSecondary }]}>
                    {Math.round(progress)}%
                  </Text>
                </GlassCard>
              </ReanimatedAnimated.View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
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
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
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
    overflow: 'hidden',
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
  },
  durationText: {
    fontSize: 48,
    fontWeight: '700',
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
  },
  spinner: {
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
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
  },
  progressPercentage: {
    marginTop: 8,
    fontSize: 14,
  },
});
