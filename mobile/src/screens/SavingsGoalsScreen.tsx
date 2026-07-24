import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Text } from '../components/AppText';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Trophy, Trash, Plus, CheckCircle } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import AnimatedPressable from '../components/AnimatedPressable';
import DateField from '../components/DateField';
import { useCachedFetch } from '../hooks/useCachedFetch';

const BENTO_RADIUS = 18;

interface Goal {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'completed' | 'failed';
  targetAmount: number;
  currentProgress: number;
  startDate: string;
  endDate: string;
}

function ProgressRing({
  size = 60,
  strokeWidth = 6,
  progress,
  color,
  trackColor,
}: {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0..1
  color: string;
  trackColor: string;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${c}`}
        strokeDashoffset={c * (1 - clamped)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

export default function SavingsGoalsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  // Savings goals are challenges of type 'savings_goal'. Active goals get a
  // server-side progress recompute (income − expenses in the window) on load.
  const { data: goals, loading, refreshing, error, refresh } = useCachedFetch<Goal[]>(
    'savings-goals',
    async () => {
      const all: any = await api.getChallenges();
      const list = (Array.isArray(all) ? all : []).filter((c: any) => c.type === 'savings_goal');
      return Promise.all(
        list.map((g: any) =>
          g.status === 'active'
            ? api.updateChallengeProgress(g.id).catch(() => g)
            : Promise.resolve(g),
        ),
      ) as Promise<Goal[]>;
    },
  );

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d;
  });

  const openCreate = () => {
    setName('');
    setTarget('');
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    setDeadline(d);
    setShowModal(true);
  };

  const handleCreate = async () => {
    const value = parseFloat(target);
    if (!name.trim() || !value || value <= 0) {
      Alert.alert('Missing fields', 'Give the goal a name and a target amount.');
      return;
    }
    setSaving(true);
    try {
      await api.createChallenge({
        name: name.trim(),
        type: 'savings_goal',
        targetAmount: value,
        startDate: new Date().toISOString(),
        endDate: deadline.toISOString(),
      });
      setShowModal(false);
      refresh();
    } catch (e: any) {
      Alert.alert('Could not create goal', e.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (goal: Goal) => {
    Alert.alert('Delete goal', `Delete "${goal.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteChallenge(goal.id);
            refresh();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not delete goal.');
          }
        },
      },
    ]);
  };

  const fmt = (v: number) => (Math.abs(v) >= 10000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0));
  const daysLeft = (end: string) =>
    Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86400000));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : error ? (
          <GlassCard tint={isDark ? 'dark' : 'light'} style={styles.emptyCard}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Can't reach the server</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Pull down to retry.</Text>
          </GlassCard>
        ) : !goals || goals.length === 0 ? (
          <GlassCard tint={isDark ? 'dark' : 'light'} style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Trophy size={44} color={colors.textTertiary} weight="duotone" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No goals yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Set a target and a deadline. Progress tracks what you actually save
              (income minus spending) while the goal is active.
            </Text>
          </GlassCard>
        ) : (
          goals.map((g, i) => {
            const progress = g.targetAmount > 0 ? (g.currentProgress || 0) / g.targetAmount : 0;
            const done = g.status === 'completed' || progress >= 1;
            const ringColor = done ? colors.success : colors.primary;
            return (
              <Animated.View key={g.id} entering={FadeInDown.duration(350).delay(i * 60)}>
                <GlassCard tint={isDark ? 'dark' : 'light'} style={styles.goalCard}>
                  <View style={styles.goalRow}>
                    <View style={styles.ringWrap}>
                      <ProgressRing progress={progress} color={ringColor} trackColor={colors.inputBg} />
                      <View style={styles.ringLabel}>
                        {done ? (
                          <CheckCircle size={20} color={colors.success} weight="fill" />
                        ) : (
                          <Text style={[styles.ringPct, { color: colors.text }]}>
                            {Math.round(Math.max(0, Math.min(1, progress)) * 100)}%
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.goalInfo}>
                      <Text style={[styles.goalName, { color: colors.text }]} numberOfLines={1}>
                        {g.name}
                      </Text>
                      <Text style={[styles.goalAmounts, { color: colors.textSecondary }]}>
                        {fmt(Math.max(0, g.currentProgress || 0))} / {fmt(g.targetAmount)}{' '}
                        {user?.currency || 'USD'}
                      </Text>
                      <Text style={[styles.goalDeadline, { color: colors.textTertiary }]}>
                        {done ? 'Completed' : `${daysLeft(g.endDate)} days left`}
                      </Text>
                    </View>
                    <AnimatedPressable onPress={() => handleDelete(g)} scaleValue={0.9}>
                      <Trash size={18} color={colors.textTertiary} weight="duotone" />
                    </AnimatedPressable>
                  </View>
                </GlassCard>
              </Animated.View>
            );
          })
        )}

        <AnimatedPressable onPress={openCreate} scaleValue={0.97}>
          <View style={[styles.addButton, { backgroundColor: colors.primary }]}>
            <Plus size={20} color="#FFFFFF" weight="bold" />
            <Text style={styles.addButtonText}>New Goal</Text>
          </View>
        </AnimatedPressable>
      </ScrollView>

      {/* Create modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New savings goal</Text>

            <GlassInput
              label="Name *"
              isDark={isDark}
              textColor={colors.text}
              labelColor={colors.textSecondary}
              placeholderColor={colors.textTertiary}
              placeholder="Emergency fund"
              value={name}
              onChangeText={setName}
            />
            <GlassInput
              label={`Target amount (${user?.currency || 'USD'}) *`}
              isDark={isDark}
              textColor={colors.text}
              labelColor={colors.textSecondary}
              placeholderColor={colors.textTertiary}
              placeholder="1000"
              value={target}
              onChangeText={setTarget}
              keyboardType="decimal-pad"
            />
            <DateField label="Deadline" value={deadline} onChange={setDeadline} />

            <AnimatedPressable onPress={handleCreate} disabled={saving} scaleValue={0.97}>
              <View style={[styles.saveButton, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}>
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Create Goal</Text>
                )}
              </View>
            </AnimatedPressable>
            <AnimatedPressable onPress={() => !saving && setShowModal(false)} scaleValue={0.97}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </AnimatedPressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  emptyCard: { alignItems: 'center', padding: 28 },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  goalCard: { padding: 16, marginBottom: 14 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ringWrap: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontSize: 13, fontWeight: '800' },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 16, fontWeight: '700' },
  goalAmounts: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  goalDeadline: { fontSize: 12, marginTop: 2 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: BENTO_RADIUS,
    paddingVertical: 16,
    marginTop: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0.5,
    padding: 22,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  saveButton: { borderRadius: BENTO_RADIUS, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  cancelText: { textAlign: 'center', fontSize: 15, fontWeight: '600', marginTop: 16 },
});
