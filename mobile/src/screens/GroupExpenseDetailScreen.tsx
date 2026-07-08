import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { PaperPlaneRight } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useCachedFetch } from '../hooks/useCachedFetch';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import AnimatedPressable from '../components/AnimatedPressable';

const BENTO_RADIUS = 18;

interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  user?: { id: string; name: string; email: string };
}

interface Split {
  userId: string;
  amount: number;
  user?: { id: string; name: string; email: string };
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  splitType: string;
  paidBy: string;
  paidByUser?: { id: string; name: string; email: string };
  date: string;
  createdAt?: string;
  splits?: Split[];
}

export default function GroupExpenseDetailScreen({ route, navigation }: any) {
  const { groupId, expenseId, expense: initialExpense } = route.params;
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [expense] = useState<Expense>(initialExpense);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const cardBg = colors.card;
  const inputBg = colors.inputBg;
  const borderColor = colors.border;

  // Cached: comments render instantly on re-entry and refresh silently.
  const { data, loading, refreshing, refresh: loadComments } = useCachedFetch<Comment[]>(
    `group-expense-comments:${groupId}:${expenseId}`,
    async () => {
      const result = await (api as any).getExpenseComments(groupId, expenseId);
      return Array.isArray(result) ? result : [];
    },
  );
  const comments = data ?? [];

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text) return;

    setSubmitting(true);
    try {
      await (api as any).addExpenseComment(groupId, expenseId, text);
      setCommentText('');
      await loadComments();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (comment: Comment) => {
    if (comment.userId !== user?.id) return;
    Alert.alert('Delete Comment', 'Remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await (api as any).deleteExpenseComment(groupId, expenseId, comment.id);
            await loadComments();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete comment');
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const splitBadgeColor = () => {
    switch (expense.splitType?.toUpperCase()) {
      case 'EQUAL': return '#34C759';
      case 'EXACT': return '#FF9500';
      case 'PERCENTAGE': return '#5AC8FA';
      case 'SHARES': return '#BF5AF2';
      default: return colors.primary;
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.card,
              borderBottomWidth: 0.5,
              borderBottomColor: borderColor,
            },
          ]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={[styles.backArrow, { color: colors.primary }]}>{'\u2039'}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {expense.description}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {formatDate(expense.date || expense.createdAt || '')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadComments}
            tintColor={colors.primary}
          />
        }
      >
        {/* Expense Summary */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <GlassCard style={styles.summaryCard} tint={isDark ? 'dark' : 'light'}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryAmount, { color: colors.text }]}>
                {expense.currency} {Number(expense.amount).toFixed(2)}
              </Text>
              <View style={[styles.splitBadge, { backgroundColor: splitBadgeColor() + '22' }]}>
                <Text style={[styles.splitBadgeText, { color: splitBadgeColor() }]}>
                  {expense.splitType?.toUpperCase() || 'EQUAL'}
                </Text>
              </View>
            </View>
            <Text style={[styles.summaryPaidBy, { color: colors.textSecondary }]}>
              Paid by {expense.paidByUser?.name || 'Unknown'}
            </Text>
          </GlassCard>
        </Animated.View>

        {/* Splits */}
        {expense.splits && expense.splits.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Split Breakdown</Text>
            <View style={[styles.splitsList, { backgroundColor: cardBg, borderColor }]}>
              {expense.splits.map((split, index) => (
                <View
                  key={split.userId}
                  style={[
                    styles.splitRow,
                    index < expense.splits!.length - 1 && {
                      borderBottomWidth: 0.5,
                      borderBottomColor: borderColor,
                    },
                  ]}
                >
                  <Text style={[styles.splitName, { color: colors.text }]}>
                    {split.user?.name || 'Unknown'}
                    {split.userId === user?.id ? ' (You)' : ''}
                  </Text>
                  <Text style={[styles.splitAmount, { color: colors.textSecondary }]}>
                    {expense.currency} {Number(split.amount).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Comments Section */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Discussion ({comments.length})
          </Text>

          {loading ? (
            <GlassCard style={styles.loadingCard} tint={isDark ? 'dark' : 'light'}>
              <ActivityIndicator size="small" color={colors.primary} />
            </GlassCard>
          ) : comments.length === 0 ? (
            <GlassCard style={styles.emptyCard} tint={isDark ? 'dark' : 'light'}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No comments yet. Be the first to add one!
              </Text>
            </GlassCard>
          ) : (
            comments.map((comment, index) => (
              <Animated.View
                key={comment.id}
                entering={FadeInDown.duration(300).delay(index * 50)}
              >
                <AnimatedPressable
                  onLongPress={() => handleDeleteComment(comment)}
                  scaleValue={0.99}
                  style={{ marginBottom: 8 }}
                >
                  <View
                    style={[
                      styles.commentCard,
                      { backgroundColor: cardBg, borderColor },
                    ]}
                  >
                    <View style={styles.commentHeader}>
                      <Text style={[styles.commentAuthor, { color: colors.text }]}>
                        {comment.user?.name || 'Unknown'}
                        {comment.userId === user?.id ? ' (You)' : ''}
                      </Text>
                      <Text style={[styles.commentTime, { color: colors.textSecondary }]}>
                        {formatTime(comment.createdAt)}
                      </Text>
                    </View>
                    <Text style={[styles.commentText, { color: colors.text }]}>
                      {comment.text}
                    </Text>
                  </View>
                </AnimatedPressable>
              </Animated.View>
            ))
          )}
        </Animated.View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Comment Input */}
      <SafeAreaView
        edges={['bottom']}
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: borderColor,
          },
        ]}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.commentInput,
              { backgroundColor: inputBg, color: colors.text, borderColor },
            ]}
            placeholder="Add a comment..."
            placeholderTextColor={colors.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <AnimatedPressable
            onPress={handleAddComment}
            disabled={!commentText.trim() || submitting}
            scaleValue={0.93}
          >
            <View
              style={[
                styles.sendButton,
                {
                  backgroundColor:
                    commentText.trim() ? colors.primary : colors.inputBg,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <PaperPlaneRight size={20} color="#FFFFFF" weight="fill" />
              )}
            </View>
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomLeftRadius: BENTO_RADIUS,
    borderBottomRightRadius: BENTO_RADIUS,
  },
  backButton: {
    marginBottom: 6,
    alignSelf: 'flex-start',
    paddingRight: 16,
    paddingVertical: 4,
  },
  backArrow: {
    fontSize: 36,
    fontWeight: '300',
    lineHeight: 36,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    padding: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '800',
  },
  splitBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  splitBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  summaryPaidBy: {
    fontSize: 15,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
  },
  splitsList: {
    borderRadius: BENTO_RADIUS,
    borderWidth: 0.5,
    overflow: 'hidden',
    marginBottom: 20,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  splitName: {
    fontSize: 15,
    fontWeight: '600',
  },
  splitAmount: {
    fontSize: 15,
    fontWeight: '500',
  },
  loadingCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 12,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  commentCard: {
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 14,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '700',
  },
  commentTime: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputBar: {
    borderTopWidth: 0.5,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 0.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
