import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import AnimatedPressable from '../components/AnimatedPressable';

const GLASS = {
  borderColor: 'rgba(255, 255, 255, 0.2)',
  bgLight: 'rgba(255, 255, 255, 0.08)',
  blurIntensity: 60,
  borderRadius: 16,
};
const ACCENT = '#6A0DAD';
const ACCENT_LIGHT = '#8B2FC9';

interface Group {
  id: string;
  name: string;
  members?: any[];
  createdAt?: string;
}

export default function GroupsScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const [groupsData, subStatus] = await Promise.all([
        api.getGroups(),
        api.getSubscriptionStatus().catch(() => ({ hasActiveSubscription: false, tier: 'free', expiresAt: null })),
      ]);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setIsPremium((subStatus as any).hasActiveSubscription || (subStatus as any).tier === 'premium');
    } catch (error: any) {
      setGroups([]);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups]),
  );

  const handleCreateGroup = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    setCreating(true);
    try {
      await api.createGroup({ name: trimmed, memberIds: [] });
      setNewGroupName('');
      setShowCreateModal(false);
      await loadGroups();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = (group: Group) => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteGroup(group.id);
              await loadGroups();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete group');
            }
          },
        },
      ],
    );
  };

  const handlePressCreate = () => {
    if (isPremium === false) {
      Alert.alert(
        'Premium Feature',
        'Shared expense groups are available on the Premium plan. Upgrade in Settings > Subscription to unlock this feature.',
        [{ text: 'OK' }],
      );
      return;
    }
    setNewGroupName('');
    setShowCreateModal(true);
  };

  const renderGroupItem = ({ item, index }: { item: Group; index: number }) => (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 80)}>
      <AnimatedPressable
        onPress={() => {}}
        onLongPress={() => handleDeleteGroup(item)}
        scaleValue={0.97}
        style={styles.groupItemWrapper}
      >
        <GlassCard style={styles.groupItem} tint={isDark ? 'dark' : 'light'}>
          <View style={styles.groupInfo}>
            <Text style={[styles.groupName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.groupMeta, { color: colors.textSecondary }]}>
              {item.members?.length || 0} member{(item.members?.length || 0) !== 1 ? 's' : ''}
            </Text>
          </View>
          <Text style={styles.chevron}>{'\u203A'}</Text>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D0D' : colors.background }]}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <LinearGradient
            colors={['#1A0030', '#2D004F', ACCENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.title}>{'\uD83D\uDC65'} Groups</Text>
          </LinearGradient>
        </Animated.View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.centerContainer}>
          <GlassCard style={styles.loadingCard} tint={isDark ? 'dark' : 'light'}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading groups...</Text>
          </GlassCard>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.centerContainer}>
          <GlassCard style={styles.emptyCard} tint={isDark ? 'dark' : 'light'}>
            <Text style={styles.emptyEmoji}>{'\uD83D\uDC65'}</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Groups Yet</Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              Create a group to start tracking shared expenses with friends and family.
            </Text>
            <AnimatedPressable onPress={handlePressCreate} scaleValue={0.97} style={styles.emptyCta}>
              <LinearGradient
                colors={[ACCENT, ACCENT_LIGHT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaButton}
              >
                <Text style={styles.ctaText}>Create Your First Group</Text>
              </LinearGradient>
            </AnimatedPressable>
          </GlassCard>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroupItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Create Button */}
      {groups.length > 0 && (
        <View style={styles.fabContainer}>
          <AnimatedPressable onPress={handlePressCreate} scaleValue={0.95}>
            <LinearGradient
              colors={[ACCENT, ACCENT_LIGHT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fab}
            >
              <Text style={styles.fabText}>+ New Group</Text>
            </LinearGradient>
          </AnimatedPressable>
        </View>
      )}

      {/* Create Group Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !creating && setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <BlurView
            intensity={isDark ? 80 : 50}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.modalContent,
              { backgroundColor: isDark ? 'rgba(20,10,40,0.9)' : 'rgba(255,255,255,0.9)' },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: GLASS.borderColor }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create Group</Text>
              <AnimatedPressable
                onPress={() => !creating && setShowCreateModal(false)}
                scaleValue={0.9}
              >
                <BlurView
                  intensity={30}
                  tint={isDark ? 'dark' : 'light'}
                  style={styles.modalCancelButton}
                >
                  <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
                </BlurView>
              </AnimatedPressable>
            </View>

            <View style={styles.modalBody}>
              <GlassInput
                label="Group Name"
                isDark={isDark}
                textColor={colors.text}
                labelColor={colors.textSecondary}
                placeholderColor={colors.textSecondary}
                placeholder="e.g. Roommates, Trip to Paris"
                value={newGroupName}
                onChangeText={setNewGroupName}
                autoFocus
              />

              <AnimatedPressable
                onPress={handleCreateGroup}
                disabled={creating}
                scaleValue={0.97}
                style={{ marginTop: 8 }}
              >
                <LinearGradient
                  colors={[ACCENT, ACCENT_LIGHT]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.saveButton, creating && { opacity: 0.6 }]}
                >
                  {creating ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </LinearGradient>
              </AnimatedPressable>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: GLASS.borderRadius,
    borderBottomRightRadius: GLASS.borderRadius,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  loadingCard: {
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  emptyCta: {
    width: '100%',
  },
  ctaButton: {
    borderRadius: GLASS.borderRadius,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  groupItemWrapper: {
    marginBottom: 12,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '600',
  },
  groupMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  chevron: {
    fontSize: 22,
    color: ACCENT_LIGHT,
    fontWeight: '300',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
  fab: {
    borderRadius: GLASS.borderRadius,
    paddingVertical: 16,
    alignItems: 'center',
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS.borderColor,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GLASS.borderColor,
    overflow: 'hidden',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  saveButton: {
    borderRadius: GLASS.borderRadius,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
