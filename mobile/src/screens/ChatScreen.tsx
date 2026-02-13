import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
// SafeAreaView import removed — this screen is inside a stack navigator with a visible header
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your expense assistant. Ask me anything about your spending! For example: 'How much did I spend this month?' or 'What's my biggest expense category?'",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // Listen to keyboard events
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when new message is added
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const startVoiceRecording = async () => {
    // Voice recording will be implemented with speech-to-text integration
    // For now, show a message that voice input is coming soon
    setRecording(true);
    // TODO: Implement speech-to-text integration
    setTimeout(() => {
      setRecording(false);
      // Placeholder: In the future, this will convert voice to text
      // For now, users can type their questions
    }, 1000);
  };

  const stopVoiceRecording = async () => {
    setRecording(false);
    // TODO: Implement speech-to-text when ready
  };

  const sendMessage = async (text?: string) => {
    const question = text || inputText.trim();
    if (!question) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: question,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const response = await api.askQuestion(question);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.answer,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error.message || 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <Animated.View
      entering={item.isUser ? FadeInUp.duration(350).delay(50) : FadeInDown.duration(350).delay(50)}
      style={[
        styles.messageContainer,
        item.isUser ? styles.userMessage : styles.assistantMessage,
      ]}
    >
      {item.isUser ? (
        <LinearGradient
          colors={[ACCENT, ACCENT_LIGHT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userBubbleGradient}
        >
          <Text style={styles.userMessageText}>
            {item.text}
          </Text>
        </LinearGradient>
      ) : (
        <BlurView
          intensity={40}
          tint={isDark ? 'dark' : 'light'}
          style={styles.assistantBubbleBlur}
        >
          <Text style={[styles.messageText, { color: colors.text }]}>
            {item.text}
          </Text>
        </BlurView>
      )}
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header with LinearGradient */}
        <LinearGradient
          colors={['#1a0a2e', '#2d1052', '#1a0a2e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSubtitle}>Ask me about your spending</Text>
        </LinearGradient>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={[styles.messagesList, { backgroundColor: colors.background }]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />

        {/* Input area wrapped in BlurView */}
        <BlurView
          intensity={GLASS.blurIntensity}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.inputContainerBlur,
            {
              borderTopColor: GLASS.borderColor,
              paddingBottom: Math.max(insets.bottom, 12),
              ...(Platform.OS === 'android' && keyboardHeight > 0 && { marginBottom: keyboardHeight - insets.bottom })
            }
          ]}
        >
          <View style={styles.inputRow}>
            {/* Voice button */}
            <AnimatedPressable
              onPress={recording ? stopVoiceRecording : startVoiceRecording}
              disabled={loading}
              scaleValue={0.9}
              style={styles.voiceButtonWrapper}
            >
              <BlurView
                intensity={40}
                tint={isDark ? 'dark' : 'light'}
                style={[
                  styles.voiceButton,
                  {
                    borderColor: recording ? colors.error : ACCENT,
                  },
                  recording && { borderColor: colors.error },
                ]}
              >
                <Text style={styles.voiceButtonText}>
                  {recording ? '\uD83C\uDFA4' : '\uD83C\uDFA4'}
                </Text>
              </BlurView>
            </AnimatedPressable>

            {/* Text input with glass styling */}
            <View style={styles.inputFieldWrapper}>
              <BlurView
                intensity={30}
                tint={isDark ? 'dark' : 'light'}
                style={[
                  styles.inputBlurBackground,
                  { borderColor: GLASS.borderColor },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ask a question about your spending..."
                  placeholderTextColor={colors.textSecondary}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  editable={!loading && !recording}
                />
              </BlurView>
            </View>

            {/* Send button */}
            <AnimatedPressable
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || loading || recording}
              scaleValue={0.9}
              style={styles.sendButtonWrapper}
            >
              {(!inputText.trim() || loading) ? (
                <View
                  style={[
                    styles.sendButton,
                    styles.sendButtonDisabled,
                    { backgroundColor: GLASS.bgMedium, borderColor: GLASS.borderColor },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <Text style={[styles.sendButtonText, { color: colors.textSecondary, opacity: 0.5 }]}>Send</Text>
                  )}
                </View>
              ) : (
                <LinearGradient
                  colors={[ACCENT, ACCENT_LIGHT]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendButton}
                >
                  <Text style={[styles.sendButtonText, { color: '#fff' }]}>Send</Text>
                </LinearGradient>
              )}
            </AnimatedPressable>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    maxWidth: '80%',
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
  },
  userBubbleGradient: {
    padding: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  assistantBubbleBlur: {
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    fontSize: 16,
    color: '#fff',
  },
  inputContainerBlur: {
    borderTopWidth: 1,
    overflow: 'hidden',
    padding: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  voiceButtonWrapper: {
    marginRight: 8,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  voiceButtonText: {
    fontSize: 20,
  },
  inputFieldWrapper: {
    flex: 1,
    marginRight: 8,
  },
  inputBlurBackground: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButtonWrapper: {
    // wrapper for AnimatedPressable
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    borderWidth: 1,
  },
  sendButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
