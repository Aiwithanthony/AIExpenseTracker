import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Text, TextInput } from '../components/AppText';
// SafeAreaView import removed — this screen is inside a stack navigator with a visible header
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import AnimatedPressable from '../components/AnimatedPressable';

const BENTO_RADIUS = 18;

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

  const cardBg = colors.card;
  const inputBg = colors.inputBg;
  const borderColor = colors.border;

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <Animated.View
      entering={item.isUser ? FadeInUp.duration(350).delay(50) : FadeInDown.duration(350).delay(50)}
      style={[
        styles.messageContainer,
        item.isUser ? styles.userMessage : styles.assistantMessage,
      ]}
    >
      {item.isUser ? (
        <View
          style={[
            styles.userBubble,
            { backgroundColor: colors.primary },
          ]}
        >
          <Text style={styles.userMessageText}>
            {item.text}
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.assistantBubble,
            {
              backgroundColor: cardBg,
              borderColor: borderColor,
            },
          ]}
        >
          <Text style={[styles.messageText, { color: colors.text }]}>
            {item.text}
          </Text>
        </View>
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
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.background,
              borderBottomColor: borderColor,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI Assistant</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Ask me about your spending</Text>
        </View>

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
          ListFooterComponent={
            loading ? (
              <View style={[styles.messageContainer, styles.assistantMessage]}>
                <View
                  style={[
                    styles.assistantBubble,
                    {
                      backgroundColor: cardBg,
                      borderColor: borderColor,
                    },
                  ]}
                >
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                </View>
              </View>
            ) : null
          }
        />

        {/* Input area */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.background,
              borderTopColor: borderColor,
              paddingBottom: Math.max(insets.bottom, 12),
              ...(Platform.OS === 'android' && keyboardHeight > 0 && { marginBottom: keyboardHeight - insets.bottom })
            }
          ]}
        >
          <View style={styles.inputRow}>
            {/* Text input */}
            <View style={styles.inputFieldWrapper}>
              <View
                style={[
                  styles.inputBackground,
                  {
                    backgroundColor: inputBg,
                    borderColor: borderColor,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ask a question about your spending..."
                  placeholderTextColor={colors.textSecondary}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  editable={!loading}
                />
              </View>
            </View>

            {/* Send button */}
            <AnimatedPressable
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || loading}
              scaleValue={0.9}
              style={styles.sendButtonWrapper}
            >
              {(!inputText.trim() || loading) ? (
                <View
                  style={[
                    styles.sendButton,
                    styles.sendButtonDisabled,
                    {
                      backgroundColor: inputBg,
                      borderColor: borderColor,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <Text style={[styles.sendButtonText, { color: colors.textSecondary, opacity: 0.5 }]}>Send</Text>
                  )}
                </View>
              ) : (
                <View
                  style={[
                    styles.sendButton,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={[styles.sendButtonText, { color: '#fff' }]}>Send</Text>
                </View>
              )}
            </AnimatedPressable>
          </View>
        </View>
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
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
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
  userBubble: {
    padding: 12,
    borderRadius: BENTO_RADIUS,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    padding: 12,
    borderRadius: BENTO_RADIUS,
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    fontSize: 16,
    color: '#fff',
  },
  inputContainer: {
    borderTopWidth: 0.5,
    padding: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputFieldWrapper: {
    flex: 1,
    marginRight: 8,
  },
  inputBackground: {
    borderRadius: 20,
    borderWidth: 0.5,
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
  },
  sendButtonDisabled: {
    borderWidth: 0.5,
  },
  sendButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
