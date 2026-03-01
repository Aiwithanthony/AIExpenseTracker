import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
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

interface Member {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface SearchResult {
  id: string;
  name: string;
  email: string;
}

interface GroupDetails {
  id: string;
  name: string;
  inviteCode: string;
}

export default function InviteMembersScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Email invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  // Adding member state
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  // Removing member state
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const currentUserIsAdmin = members.some(
    (m) => m.userId === user?.id && m.role === 'admin',
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [membersData, groupData] = await Promise.all([
        api.getGroupMembers(groupId),
        api.getGroup(groupId),
      ]);
      setMembers(Array.isArray(membersData) ? membersData : []);
      setGroupDetails(groupData as GroupDetails);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load group data');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await api.searchUsers(trimmed);
        // Filter out users who are already members
        const memberUserIds = new Set(members.map((m) => m.userId));
        const filtered = (results as SearchResult[]).filter(
          (r) => !memberUserIds.has(r.id),
        );
        setSearchResults(filtered);
        setHasSearched(true);
      } catch (error: any) {
        setSearchResults([]);
        setHasSearched(true);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, members]);

  const handleCopyCode = async () => {
    if (!groupDetails?.inviteCode) return;
    try {
      await Clipboard.setStringAsync(groupDetails.inviteCode);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    } catch {
      Alert.alert('Invite Code', groupDetails.inviteCode);
    }
  };

  const handleAddMember = async (userId: string) => {
    setAddingUserId(userId);
    try {
      await api.addGroupMembers(groupId, [userId]);
      Alert.alert('Success', 'Member added to the group');
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add member');
    } finally {
      setAddingUserId(null);
    }
  };

  const handleRemoveMember = (member: Member) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.user.name} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingUserId(member.userId);
            try {
              await api.removeGroupMember(groupId, member.userId);
              await loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove member');
            } finally {
              setRemovingUserId(null);
            }
          },
        },
      ],
    );
  };

  const handleSendInvite = async () => {
    const trimmed = inviteEmail.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }
    setSendingInvite(true);
    try {
      await api.createGroupInvite(groupId, trimmed);
      Alert.alert('Success', `Invitation sent to ${trimmed}`);
      setInviteEmail('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send invite');
    } finally {
      setSendingInvite(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0D0D0D' : colors.background }]}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <LinearGradient
            colors={['#1A0030', '#2D004F', ACCENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerRow}>
              <AnimatedPressable onPress={() => navigation.goBack()} scaleValue={0.9} style={styles.backButton}>
                <Text style={styles.backText}>{'\u2039'}</Text>
              </AnimatedPressable>
              <Text style={styles.title}>Members</Text>
              <View style={styles.headerSpacer} />
            </View>
          </LinearGradient>
        </SafeAreaView>
        <View style={styles.centerContainer}>
          <GlassCard style={styles.loadingCard} tint={isDark ? 'dark' : 'light'}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading members...</Text>
          </GlassCard>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D0D' : colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <LinearGradient
            colors={['#1A0030', '#2D004F', ACCENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerRow}>
              <AnimatedPressable onPress={() => navigation.goBack()} scaleValue={0.9} style={styles.backButton}>
                <Text style={styles.backText}>{'\u2039'}</Text>
              </AnimatedPressable>
              <Text style={styles.title}>Members</Text>
              <View style={styles.headerSpacer} />
            </View>
          </LinearGradient>
        </Animated.View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Current Members Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Members ({members.length})
            </Text>
            {members.map((member, index) => (
              <Animated.View
                key={member.id}
                entering={FadeInDown.duration(400).delay(150 + index * 60)}
              >
                <GlassCard style={styles.memberCard} tint={isDark ? 'dark' : 'light'}>
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.text }]}>
                      {member.user.name}
                    </Text>
                    <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>
                      {member.user.email}
                    </Text>
                  </View>
                  <View style={styles.memberActions}>
                    {member.role === 'admin' ? (
                      <View style={[styles.roleBadge, styles.roleBadgeAdmin]}>
                        <Text style={styles.roleBadgeTextAdmin}>Admin</Text>
                      </View>
                    ) : (
                      <View style={[styles.roleBadge, styles.roleBadgeMember]}>
                        <Text style={[styles.roleBadgeTextMember, { color: colors.textSecondary }]}>Member</Text>
                      </View>
                    )}
                    {currentUserIsAdmin && member.role !== 'admin' && (
                      <AnimatedPressable
                        onPress={() => handleRemoveMember(member)}
                        scaleValue={0.9}
                        disabled={removingUserId === member.userId}
                        style={styles.removeButton}
                      >
                        {removingUserId === member.userId ? (
                          <ActivityIndicator size="small" color="#FF3B30" />
                        ) : (
                          <Text style={styles.removeButtonText}>{'\u2715'}</Text>
                        )}
                      </AnimatedPressable>
                    )}
                  </View>
                </GlassCard>
              </Animated.View>
            ))}
          </Animated.View>

          {/* Invite Code Section */}
          {groupDetails?.inviteCode && (
            <Animated.View entering={FadeInDown.duration(400).delay(300)}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
                Invite Code
              </Text>
              <GlassCard style={styles.inviteCodeCard} tint={isDark ? 'dark' : 'light'}>
                <Text style={[styles.inviteCodeLabel, { color: colors.textSecondary }]}>
                  Group Invite Code
                </Text>
                <Text style={[styles.inviteCode, { color: colors.text }]}>
                  {groupDetails.inviteCode}
                </Text>
                <AnimatedPressable onPress={handleCopyCode} scaleValue={0.97} style={styles.copyButtonWrapper}>
                  <LinearGradient
                    colors={[ACCENT, ACCENT_LIGHT]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.copyButton}
                  >
                    <Text style={styles.copyButtonText}>Copy Code</Text>
                  </LinearGradient>
                </AnimatedPressable>
                <Text style={[styles.inviteDescription, { color: colors.textSecondary }]}>
                  Share this code with friends to let them join
                </Text>
              </GlassCard>
            </Animated.View>
          )}

          {/* Search & Add Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(450)}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
              Add Members
            </Text>
            <GlassInput
              isDark={isDark}
              textColor={colors.text}
              labelColor={colors.textSecondary}
              placeholderColor={colors.textSecondary}
              placeholder="Search by name or email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {searching && (
              <View style={styles.searchLoading}>
                <ActivityIndicator size="small" color={ACCENT} />
                <Text style={[styles.searchLoadingText, { color: colors.textSecondary }]}>
                  Searching...
                </Text>
              </View>
            )}

            {!searching && hasSearched && searchResults.length === 0 && (
              <GlassCard style={styles.emptySearchCard} tint={isDark ? 'dark' : 'light'}>
                <Text style={[styles.emptySearchText, { color: colors.textSecondary }]}>
                  No users found
                </Text>
              </GlassCard>
            )}

            {searchResults.map((result, index) => (
              <Animated.View
                key={result.id}
                entering={FadeInDown.duration(300).delay(index * 50)}
              >
                <GlassCard style={styles.searchResultCard} tint={isDark ? 'dark' : 'light'}>
                  <View style={styles.searchResultInfo}>
                    <Text style={[styles.searchResultName, { color: colors.text }]}>
                      {result.name}
                    </Text>
                    <Text style={[styles.searchResultEmail, { color: colors.textSecondary }]}>
                      {result.email}
                    </Text>
                  </View>
                  <AnimatedPressable
                    onPress={() => handleAddMember(result.id)}
                    scaleValue={0.95}
                    disabled={addingUserId === result.id}
                    style={styles.addButtonWrapper}
                  >
                    <LinearGradient
                      colors={[ACCENT, ACCENT_LIGHT]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.addButton, addingUserId === result.id && { opacity: 0.6 }]}
                    >
                      {addingUserId === result.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.addButtonText}>Add</Text>
                      )}
                    </LinearGradient>
                  </AnimatedPressable>
                </GlassCard>
              </Animated.View>
            ))}
          </Animated.View>

          {/* Email Invite Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(600)}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
              Invite via Email
            </Text>
            <GlassInput
              isDark={isDark}
              textColor={colors.text}
              labelColor={colors.textSecondary}
              placeholderColor={colors.textSecondary}
              placeholder="Enter email address..."
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <AnimatedPressable
              onPress={handleSendInvite}
              disabled={sendingInvite}
              scaleValue={0.97}
              style={styles.sendInviteWrapper}
            >
              <LinearGradient
                colors={[ACCENT, ACCENT_LIGHT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.sendInviteButton, sendingInvite && { opacity: 0.6 }]}
              >
                {sendingInvite ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendInviteText}>Send Invite</Text>
                )}
              </LinearGradient>
            </AnimatedPressable>
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    borderBottomLeftRadius: GLASS.borderRadius,
    borderBottomRightRadius: GLASS.borderRadius,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
    marginTop: -2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
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
  scrollContent: {
    padding: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },

  // Members
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
    marginRight: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeAdmin: {
    backgroundColor: ACCENT,
  },
  roleBadgeMember: {
    backgroundColor: GLASS.bgLight,
    borderWidth: 1,
    borderColor: GLASS.borderColor,
  },
  roleBadgeTextAdmin: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  roleBadgeTextMember: {
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '700',
  },

  // Invite Code
  inviteCodeCard: {
    alignItems: 'center',
    padding: 24,
  },
  inviteCodeLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  inviteCode: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 6,
    marginBottom: 20,
    fontVariant: ['tabular-nums'],
  },
  copyButtonWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  copyButton: {
    borderRadius: GLASS.borderRadius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  inviteDescription: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Search
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  searchLoadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptySearchCard: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 8,
  },
  emptySearchText: {
    fontSize: 15,
    fontWeight: '500',
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 8,
  },
  searchResultInfo: {
    flex: 1,
    marginRight: 12,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
  },
  searchResultEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  addButtonWrapper: {
    minWidth: 64,
  },
  addButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Email Invite
  sendInviteWrapper: {
    marginTop: 4,
  },
  sendInviteButton: {
    borderRadius: GLASS.borderRadius,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  sendInviteText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  bottomSpacer: {
    height: 40,
  },
});
