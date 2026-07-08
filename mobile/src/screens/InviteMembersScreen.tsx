import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { X } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import AnimatedPressable from '../components/AnimatedPressable';

const BENTO_RADIUS = 18;

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

  const cardBg = colors.card;
  const inputBg = colors.inputBg;
  const borderColor = colors.border;

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
    setSendingInvite(true);
    try {
      const invite = await api.createGroupInvite(groupId, trimmed || undefined);
      const link = invite.webLink || invite.deepLink;
      const groupName = groupDetails?.name || 'our group';

      // No mailer exists — share the invite link via the OS share sheet so the
      // recipient can open it and join.
      await Share.share({
        message: `Join "${groupName}" on Expense Tracker: ${link}`,
      });
      setInviteEmail('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create invite link');
    } finally {
      setSendingInvite(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={[styles.header, { borderBottomColor: borderColor, borderBottomWidth: 0.5 }]}>
            <View style={styles.headerRow}>
              <AnimatedPressable onPress={() => navigation.goBack()} scaleValue={0.9} style={styles.backButton}>
                <Text style={[styles.backText, { color: colors.primary }]}>{'\u2039'}</Text>
              </AnimatedPressable>
              <Text style={[styles.title, { color: colors.text }]}>Members</Text>
              <View style={styles.headerSpacer} />
            </View>
          </View>
        </SafeAreaView>
        <View style={styles.centerContainer}>
          <View style={[styles.loadingCard, { backgroundColor: cardBg, borderColor, borderWidth: 0.5, borderRadius: BENTO_RADIUS }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading members...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <View style={[styles.header, { borderBottomColor: borderColor, borderBottomWidth: 0.5 }]}>
            <View style={styles.headerRow}>
              <AnimatedPressable onPress={() => navigation.goBack()} scaleValue={0.9} style={styles.backButton}>
                <Text style={[styles.backText, { color: colors.primary }]}>{'\u2039'}</Text>
              </AnimatedPressable>
              <Text style={[styles.title, { color: colors.text }]}>Members</Text>
              <View style={styles.headerSpacer} />
            </View>
          </View>
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
                <View style={[styles.memberCard, { backgroundColor: cardBg, borderColor, borderWidth: 0.5, borderRadius: BENTO_RADIUS }]}>
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
                      <View style={[styles.roleBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.roleBadgeTextAdmin}>Admin</Text>
                      </View>
                    ) : (
                      <View style={[styles.roleBadge, { backgroundColor: inputBg, borderWidth: 0.5, borderColor }]}>
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
                          <X size={18} color={colors.error} weight="bold" />
                        )}
                      </AnimatedPressable>
                    )}
                  </View>
                </View>
              </Animated.View>
            ))}
          </Animated.View>

          {/* Invite Code Section */}
          {groupDetails?.inviteCode && (
            <Animated.View entering={FadeInDown.duration(400).delay(300)}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
                Invite Code
              </Text>
              <View style={[styles.inviteCodeCard, { backgroundColor: cardBg, borderColor, borderWidth: 0.5, borderRadius: BENTO_RADIUS }]}>
                <Text style={[styles.inviteCodeLabel, { color: colors.textSecondary }]}>
                  Group Invite Code
                </Text>
                <Text style={[styles.inviteCode, { color: colors.text }]}>
                  {groupDetails.inviteCode}
                </Text>
                <AnimatedPressable onPress={handleCopyCode} scaleValue={0.97} style={styles.copyButtonWrapper}>
                  <View style={[styles.copyButton, { backgroundColor: colors.primary }]}>
                    <Text style={styles.copyButtonText}>Copy Code</Text>
                  </View>
                </AnimatedPressable>
                <Text style={[styles.inviteDescription, { color: colors.textSecondary }]}>
                  Share this code with friends to let them join
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Search & Add Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(450)}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
              Add Members
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  color: colors.text,
                  borderColor,
                  borderWidth: 0.5,
                },
              ]}
              placeholder="Search by name or email..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {searching && (
              <View style={styles.searchLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.searchLoadingText, { color: colors.textSecondary }]}>
                  Searching...
                </Text>
              </View>
            )}

            {!searching && hasSearched && searchResults.length === 0 && (
              <View style={[styles.emptySearchCard, { backgroundColor: cardBg, borderColor, borderWidth: 0.5, borderRadius: BENTO_RADIUS }]}>
                <Text style={[styles.emptySearchText, { color: colors.textSecondary }]}>
                  No users found
                </Text>
              </View>
            )}

            {searchResults.map((result, index) => (
              <Animated.View
                key={result.id}
                entering={FadeInDown.duration(300).delay(index * 50)}
              >
                <View style={[styles.searchResultCard, { backgroundColor: cardBg, borderColor, borderWidth: 0.5, borderRadius: BENTO_RADIUS }]}>
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
                    <View
                      style={[styles.addButton, { backgroundColor: colors.primary }, addingUserId === result.id && { opacity: 0.6 }]}
                    >
                      {addingUserId === result.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.addButtonText}>Add</Text>
                      )}
                    </View>
                  </AnimatedPressable>
                </View>
              </Animated.View>
            ))}
          </Animated.View>

          {/* Invite via Link Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(600)}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
              Invite via Link
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  color: colors.text,
                  borderColor,
                  borderWidth: 0.5,
                },
              ]}
              placeholder="Optional: note who you're inviting (email)"
              placeholderTextColor={colors.textSecondary}
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
              <View
                style={[styles.sendInviteButton, { backgroundColor: colors.primary }, sendingInvite && { opacity: 0.6 }]}
              >
                {sendingInvite ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendInviteText}>Create &amp; Share Invite Link</Text>
                )}
              </View>
            </AnimatedPressable>
            <Text style={[styles.inviteDescription, { color: colors.textSecondary, marginTop: 10 }]}>
              Generates a link you can send via any app. The recipient opens it to join.
            </Text>
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
    fontWeight: '300',
    marginTop: -2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
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

  // Input
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: BENTO_RADIUS,
    marginBottom: 8,
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
    borderRadius: BENTO_RADIUS,
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
    borderRadius: BENTO_RADIUS,
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
