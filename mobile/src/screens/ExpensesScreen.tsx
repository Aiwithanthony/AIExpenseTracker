import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import AnimatedPressable from '../components/AnimatedPressable';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Design system tokens
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

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  convertedAmount?: number;
  convertedCurrency?: string;
  merchant?: string;
  date: string;
  category?: {
    id: string;
    name: string;
  };
}

interface ExpenseSection {
  title: string;
  data: Expense[];
  total: number;
}

export default function ExpensesScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const userCurrency = user?.currency || 'USD';

  // Prefer convertedAmount when it matches the user's default currency
  const getDisplayAmount = (exp: Expense): number => {
    if (
      exp.convertedAmount != null &&
      exp.convertedCurrency &&
      exp.convertedCurrency === userCurrency
    ) {
      const ca = typeof exp.convertedAmount === 'string'
        ? parseFloat(exp.convertedAmount as any)
        : Number(exp.convertedAmount);
      if (!isNaN(ca) && ca !== 0) return ca;
    }
    const raw = typeof exp.amount === 'string' ? parseFloat(exp.amount as any) : Number(exp.amount);
    return isNaN(raw) ? 0 : raw;
  };

  const {
    expenses: cachedExpenses,
    categories: cachedCategories,
    refreshExpenses,
    refreshCategories
  } = useData();
  const [expenses, setExpenses] = useState<Expense[]>(cachedExpenses);
  const [loading, setLoading] = useState(cachedExpenses.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [categories, setCategories] = useState<any[]>(cachedCategories);
  const [filters, setFilters] = useState({
    categoryId: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    type: '',
  });
  // TODO: REMOVE SELECTION MODE BEFORE PRODUCTION - Testing purposes only!
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialize from cache on mount
  useEffect(() => {
    if (cachedExpenses.length > 0) {
      setExpenses(cachedExpenses);
      setLoading(false);
    }
    if (cachedCategories.length > 0) {
      setCategories(cachedCategories);
    }
  }, []);

  // Update local state when cache updates
  useEffect(() => {
    setExpenses(cachedExpenses);
  }, [cachedExpenses]);

  useEffect(() => {
    setCategories(cachedCategories);
  }, [cachedCategories]);

  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if explicitly requested (from edit/delete)
      if (route.params?.refresh) {
        refreshExpenses();
        refreshCategories();
        // Clear the refresh flag
        navigation.setParams({ refresh: false });
      }
      // Otherwise, use cached data (already loaded in background)
    }, [route.params?.refresh, refreshExpenses, refreshCategories, navigation])
  );

  useEffect(() => {
    loadExpenses();
  }, [filters]);

  const loadCategories = async () => {
    // Use cached categories, refresh if needed
    if (cachedCategories.length > 0) {
      setCategories(cachedCategories);
    } else {
      await refreshCategories();
    }
  };

  const loadExpenses = async () => {
    // Only show loading if we don't have cached data
    if (cachedExpenses.length === 0) {
      setLoading(true);
    }

    try {
      const params: any = { limit: 100 };
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.minAmount) params.minAmount = parseFloat(filters.minAmount);
      if (filters.maxAmount) params.maxAmount = parseFloat(filters.maxAmount);
      if (searchQuery) params.search = searchQuery;

      const data: any = await api.getExpenses(params);
      let filteredExpenses = (data?.expenses || []) as Expense[];

      // Filter by type if specified
      if (filters.type) {
        filteredExpenses = filteredExpenses.filter(
          (exp: Expense) => (exp as any).type === filters.type
        );
      }

      setExpenses(filteredExpenses);
      // Also update cache (silently, in background)
      if (!filters.categoryId && !filters.startDate && !filters.endDate &&
          !filters.minAmount && !filters.maxAmount && !filters.type && !searchQuery) {
        // Only update cache if no filters applied (base data)
        refreshExpenses();
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      categoryId: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      type: '',
    });
    setSearchQuery('');
  };

  // TODO: REMOVE SELECTION MODE FUNCTIONS BEFORE PRODUCTION - Testing purposes only!
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedIds(new Set());
  };

  const toggleSelectExpense = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAllExpenses = () => {
    if (selectedIds.size === filteredExpenses.length) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all
      setSelectedIds(new Set(filteredExpenses.map(exp => exp.id)));
    }
  };

  const deleteSelectedTransactions = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    const idsToDelete = Array.from(selectedIds);

    Alert.alert(
      '\u26A0\uFE0F Delete Selected Transactions',
      `Are you sure you want to delete ${count} transaction${count === 1 ? '' : 's'}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Delete selected expenses
              const deletePromises = idsToDelete.map(id =>
                api.deleteExpense(id)
              );
              await Promise.all(deletePromises);

              // Exit selection mode and reload expenses
              setSelectionMode(false);
              setSelectedIds(new Set());
              await loadExpenses();

              Alert.alert('Success', `${count} transaction${count === 1 ? '' : 's'} deleted.`);
            } catch (error) {
              console.error('Error deleting transactions:', error);
              Alert.alert('Error', 'Failed to delete some transactions. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '') || searchQuery !== '';

  // Filter expenses by search query
  const filteredExpenses = useMemo(() => {
    if (!searchQuery) return expenses;
    const query = searchQuery.toLowerCase();
    return expenses.filter(exp =>
      exp.description.toLowerCase().includes(query) ||
      exp.merchant?.toLowerCase().includes(query) ||
      exp.category?.name.toLowerCase().includes(query)
    );
  }, [expenses, searchQuery]);

  // Group expenses by category
  const groupedExpenses = useMemo(() => {
    const grouped: Record<string, Expense[]> = {};
    const uncategorized: Expense[] = [];

    filteredExpenses.forEach((expense) => {
      const categoryName = expense.category?.name || 'Uncategorized';
      if (categoryName === 'Uncategorized') {
        uncategorized.push(expense);
      } else {
        if (!grouped[categoryName]) {
          grouped[categoryName] = [];
        }
        grouped[categoryName].push(expense);
      }
    });

    // Convert to sections array and sort by total amount (descending)
    const sections: ExpenseSection[] = Object.entries(grouped)
      .map(([title, data]) => {
        const total = data.reduce((sum, exp) => sum + getDisplayAmount(exp), 0);
        return { title, data, total };
      })
      .sort((a, b) => b.total - a.total);

    // Add uncategorized section at the end if there are any
    if (uncategorized.length > 0) {
      const uncategorizedTotal = uncategorized.reduce((sum, exp) => sum + getDisplayAmount(exp), 0);
      sections.push({
        title: 'Uncategorized',
        data: uncategorized,
        total: uncategorizedTotal,
      });
    }

    return sections;
  }, [filteredExpenses]);

  const renderExpense = ({ item, index }: { item: Expense; index: number }) => {
    const amount = getDisplayAmount(item);
    const formattedAmount = amount.toFixed(2);
    const expenseType = (item as any).type || 'expense';
    const isSelected = selectedIds.has(item.id);

    return (
      <AnimatedPressable
        onPress={() => {
          if (selectionMode) {
            toggleSelectExpense(item.id);
          } else {
            navigation.navigate('EditExpense', {
              expenseId: item.id,
              expense: item
            });
          }
        }}
        scaleValue={0.98}
        style={styles.expenseItemWrapper}
      >
        <BlurView
          intensity={isDark ? 40 : 30}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.expenseItem,
            {
              backgroundColor: isDark ? GLASS.bgLight : 'rgba(255, 255, 255, 0.7)',
            },
            selectionMode && isSelected && {
              borderColor: ACCENT,
              borderWidth: 2,
              backgroundColor: ACCENT + '15',
            },
          ]}
          onTouchEnd={() => {
            // Long press handling for selection mode
          }}
        >
          {selectionMode && (
            <View style={[
              styles.checkbox,
              { borderColor: isSelected ? ACCENT : colors.border },
              isSelected && { backgroundColor: ACCENT }
            ]}>
              {isSelected && <Text style={styles.checkmark}>{'\u2713'}</Text>}
            </View>
          )}
          <View style={styles.expenseContent}>
            <Text style={[styles.expenseDescription, { color: colors.text }]}>
              {item.description}
            </Text>
            <Text style={[styles.expenseMerchant, { color: colors.textSecondary }]}>
              {item.merchant || 'No merchant'}
            </Text>
            <Text style={[styles.expenseDate, { color: colors.textSecondary }]}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.expenseAmount}>
            <Text style={[
              styles.amountText,
              { color: expenseType === 'income' ? colors.success : colors.error }
            ]}>
              {expenseType === 'income' ? '+' : '-'}{formattedAmount}
            </Text>
            <Text style={[styles.currencyText, { color: colors.textSecondary }]}>
              {item.convertedCurrency === userCurrency ? userCurrency : item.currency}
            </Text>
          </View>
        </BlurView>
      </AnimatedPressable>
    );
  };

  const renderSectionHeader = ({ section }: { section: ExpenseSection }) => {
    const formattedTotal = section.total.toFixed(2);
    const currency = userCurrency;

    return (
      <View style={[styles.sectionHeader, { backgroundColor: 'transparent' }]}>
        <View style={styles.sectionHeaderContent}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionDot, { backgroundColor: ACCENT }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {section.title}
            </Text>
          </View>
          <Text style={[styles.sectionTotal, { color: ACCENT }]}>
            {formattedTotal} {currency}
          </Text>
        </View>
        <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
          {section.data.length} {section.data.length === 1 ? 'transaction' : 'transactions'}
        </Text>
      </View>
    );
  };

  const renderSectionFooter = () => <View style={styles.sectionFooter} />;

  // ─── Glass Header Bar ─────────────────────────────────────────────
  const renderHeader = (showAdd: boolean = true) => (
    <View style={styles.headerWrapper}>
      <LinearGradient
        colors={isDark
          ? ['#0D0221', '#1A0533', ACCENT + '80'] as const
          : ['#1A0533', '#2D1052', ACCENT_LIGHT + '90'] as const
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Transactions</Text>
          </View>
          <View style={styles.headerButtonsRow}>
            {!selectionMode ? (
              <>
                <AnimatedPressable
                  onPress={() => setShowFilters(true)}
                  scaleValue={0.93}
                  style={{ flex: 1 }}
                >
                  <BlurView
                    intensity={40}
                    tint="light"
                    style={[
                      styles.glassHeaderButton,
                      hasActiveFilters && { borderColor: ACCENT, backgroundColor: ACCENT + '40' },
                    ]}
                  >
                    <Text style={styles.glassHeaderButtonText}>
                      {'\uD83D\uDD0D'} Filters
                    </Text>
                  </BlurView>
                </AnimatedPressable>
                {/* TODO: REMOVE THIS BUTTON BEFORE PRODUCTION - Testing purposes only! */}
                <AnimatedPressable
                  onPress={toggleSelectionMode}
                  scaleValue={0.93}
                >
                  <BlurView
                    intensity={40}
                    tint="light"
                    style={styles.glassHeaderButton}
                  >
                    <Text style={styles.glassHeaderButtonIcon}>{'\uD83D\uDDD1\uFE0F'}</Text>
                  </BlurView>
                </AnimatedPressable>
                {showAdd && (
                  <AnimatedPressable
                    onPress={() => navigation.navigate('AddExpense')}
                    scaleValue={0.93}
                  >
                    <LinearGradient
                      colors={[ACCENT, ACCENT_LIGHT]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.addButtonGradient}
                    >
                      <Text style={styles.addButtonText}>+ Add</Text>
                    </LinearGradient>
                  </AnimatedPressable>
                )}
              </>
            ) : (
              <>
                <AnimatedPressable
                  onPress={toggleSelectionMode}
                  scaleValue={0.93}
                >
                  <BlurView
                    intensity={40}
                    tint="light"
                    style={styles.glassHeaderButton}
                  >
                    <Text style={styles.glassHeaderButtonText}>Cancel</Text>
                  </BlurView>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={selectAllExpenses}
                  scaleValue={0.93}
                  style={{ flex: 1 }}
                >
                  <BlurView
                    intensity={40}
                    tint="light"
                    style={[styles.glassHeaderButton, { borderColor: ACCENT + '60' }]}
                  >
                    <Text style={[styles.glassHeaderButtonText, { color: '#FFFFFF' }]}>
                      {selectedIds.size === filteredExpenses.length ? 'Deselect' : 'Select All'}
                    </Text>
                  </BlurView>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={deleteSelectedTransactions}
                  disabled={selectedIds.size === 0}
                >
                  <LinearGradient
                    colors={selectedIds.size > 0
                      ? [colors.error, '#FF6B6B'] as const
                      : ['#555', '#444'] as const
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.addButtonGradient,
                      selectedIds.size === 0 && { opacity: 0.4 },
                    ]}
                  >
                    <Text style={styles.addButtonText}>
                      Delete ({selectedIds.size})
                    </Text>
                  </LinearGradient>
                </AnimatedPressable>
              </>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );

  // ─── Loading State ─────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader(false)}
        <View style={styles.center}>
          <GlassCard
            intensity={GLASS.blurIntensity}
            tint={isDark ? 'dark' : 'light'}
            style={styles.loadingCard}
          >
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading transactions...
            </Text>
          </GlassCard>
        </View>
      </View>
    );
  }

  // ─── Empty State ───────────────────────────────────────────────────
  if (groupedExpenses.length === 0 && !loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <GlassCard
              intensity={GLASS.blurIntensity}
              tint={isDark ? 'dark' : 'light'}
              style={[styles.emptyCard, { backgroundColor: GLASS.bgLight }]}
            >
              <Text style={styles.emptyIcon}>{'\uD83D\uDCDD'}</Text>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No transactions yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                {hasActiveFilters
                  ? 'Try adjusting your filters or add a new transaction'
                  : 'Add your first transaction to get started tracking your finances'}
              </Text>
              {!hasActiveFilters && (
                <AnimatedPressable
                  onPress={() => navigation.navigate('AddExpense')}
                  scaleValue={0.97}
                >
                  <LinearGradient
                    colors={[ACCENT, ACCENT_LIGHT]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.emptyActionButton}
                  >
                    <Text style={styles.emptyActionButtonText}>
                      Add Your First Transaction
                    </Text>
                  </LinearGradient>
                </AnimatedPressable>
              )}
            </GlassCard>
          </Animated.View>
        </View>
      </View>
    );
  }

  // ─── Main Content ──────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}

      {/* Search Bar - Hide in selection mode */}
      {!selectionMode && (
        <View style={styles.searchWrapper}>
          <BlurView
            intensity={isDark ? 40 : 25}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.searchContainer,
              { backgroundColor: isDark ? GLASS.bgLight : 'rgba(255,255,255,0.6)' },
            ]}
          >
            <Text style={styles.searchIcon}>{'\uD83D\uDD0E'}</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search transactions..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {hasActiveFilters && (
              <AnimatedPressable onPress={clearFilters} scaleValue={0.9}>
                <View style={[styles.clearBadge, { backgroundColor: ACCENT + '20' }]}>
                  <Text style={[styles.clearBadgeText, { color: ACCENT }]}>Clear</Text>
                </View>
              </AnimatedPressable>
            )}
          </BlurView>
        </View>
      )}

      {/* Selection Mode Info Bar */}
      {selectionMode && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <BlurView
            intensity={40}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.selectionInfoBar, { backgroundColor: ACCENT + '15' }]}
          >
            <View style={[styles.selectionDot, { backgroundColor: ACCENT }]} />
            <Text style={[styles.selectionInfoText, { color: ACCENT }]}>
              {selectedIds.size} of {filteredExpenses.length} selected
            </Text>
          </BlurView>
        </Animated.View>
      )}

      <SectionList
        sections={groupedExpenses}
        renderItem={renderExpense}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />

      {/* ─── Filters Modal ───────────────────────────────────────────── */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
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
              { backgroundColor: isDark ? 'rgba(20,10,40,0.85)' : 'rgba(255,255,255,0.85)' },
            ]}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: GLASS.borderColor }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Refine your transactions
                </Text>
              </View>
              <AnimatedPressable
                onPress={() => setShowFilters(false)}
                scaleValue={0.9}
              >
                <LinearGradient
                  colors={[ACCENT, ACCENT_LIGHT]}
                  style={styles.modalDoneButton}
                >
                  <Text style={styles.modalDoneText}>Done</Text>
                </LinearGradient>
              </AnimatedPressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Category Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.text }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <AnimatedPressable
                    onPress={() => setFilters({ ...filters, categoryId: '' })}
                    scaleValue={0.95}
                  >
                    <BlurView
                      intensity={30}
                      tint={isDark ? 'dark' : 'light'}
                      style={[
                        styles.filterChip,
                        !filters.categoryId
                          ? { backgroundColor: ACCENT, borderColor: ACCENT }
                          : { backgroundColor: GLASS.bgLight, borderColor: GLASS.borderColor },
                      ]}
                    >
                      <Text style={[
                        styles.filterChipText,
                        { color: !filters.categoryId ? '#fff' : colors.text },
                      ]}>
                        All
                      </Text>
                    </BlurView>
                  </AnimatedPressable>
                  {categories.map(cat => (
                    <AnimatedPressable
                      key={cat.id}
                      onPress={() => setFilters({ ...filters, categoryId: filters.categoryId === cat.id ? '' : cat.id })}
                      scaleValue={0.95}
                    >
                      <BlurView
                        intensity={30}
                        tint={isDark ? 'dark' : 'light'}
                        style={[
                          styles.filterChip,
                          filters.categoryId === cat.id
                            ? { backgroundColor: ACCENT, borderColor: ACCENT }
                            : { backgroundColor: GLASS.bgLight, borderColor: GLASS.borderColor },
                        ]}
                      >
                        <Text style={[
                          styles.filterChipText,
                          { color: filters.categoryId === cat.id ? '#fff' : colors.text },
                        ]}>
                          {cat.name}
                        </Text>
                      </BlurView>
                    </AnimatedPressable>
                  ))}
                </ScrollView>
              </View>

              {/* Type Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.text }]}>Type</Text>
                <View style={styles.typeSelector}>
                  {[
                    { label: 'All', value: '' },
                    { label: 'Expense', value: 'expense' },
                    { label: 'Income', value: 'income' },
                  ].map((type) => (
                    <AnimatedPressable
                      key={type.value}
                      onPress={() => setFilters({ ...filters, type: type.value })}
                      scaleValue={0.95}
                      style={{ flex: 1 }}
                    >
                      <BlurView
                        intensity={30}
                        tint={isDark ? 'dark' : 'light'}
                        style={[
                          styles.typeButton,
                          filters.type === type.value
                            ? { backgroundColor: ACCENT, borderColor: ACCENT }
                            : { backgroundColor: GLASS.bgLight, borderColor: GLASS.borderColor },
                        ]}
                      >
                        <Text style={[
                          styles.typeButtonText,
                          { color: filters.type === type.value ? '#fff' : colors.text },
                        ]}>
                          {type.label}
                        </Text>
                      </BlurView>
                    </AnimatedPressable>
                  ))}
                </View>
              </View>

              {/* Advanced Filters Toggle */}
              <AnimatedPressable
                onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
                scaleValue={0.98}
              >
                <BlurView
                  intensity={30}
                  tint={isDark ? 'dark' : 'light'}
                  style={[styles.advancedToggle, { borderColor: GLASS.borderColor, backgroundColor: GLASS.bgLight }]}
                >
                  <Text style={[styles.advancedToggleText, { color: colors.text }]}>
                    {showAdvancedFilters ? '\u25BC' : '\u25B6'} Advanced Filters
                  </Text>
                </BlurView>
              </AnimatedPressable>

              {showAdvancedFilters && (
                <Animated.View entering={FadeInDown.duration(300)}>
                  {/* Date Range */}
                  <View style={styles.filterSection}>
                    <Text style={[styles.filterLabel, { color: colors.text }]}>Start Date</Text>
                    <TextInput
                      style={[
                        styles.filterInput,
                        {
                          backgroundColor: isDark ? GLASS.bgLight : 'rgba(255,255,255,0.5)',
                          color: colors.text,
                          borderColor: GLASS.borderColor,
                        },
                      ]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                      value={filters.startDate}
                      onChangeText={(text) => setFilters({ ...filters, startDate: text })}
                    />
                  </View>

                  <View style={styles.filterSection}>
                    <Text style={[styles.filterLabel, { color: colors.text }]}>End Date</Text>
                    <TextInput
                      style={[
                        styles.filterInput,
                        {
                          backgroundColor: isDark ? GLASS.bgLight : 'rgba(255,255,255,0.5)',
                          color: colors.text,
                          borderColor: GLASS.borderColor,
                        },
                      ]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                      value={filters.endDate}
                      onChangeText={(text) => setFilters({ ...filters, endDate: text })}
                    />
                  </View>

                  {/* Amount Range */}
                  <View style={styles.filterSection}>
                    <Text style={[styles.filterLabel, { color: colors.text }]}>Min Amount</Text>
                    <TextInput
                      style={[
                        styles.filterInput,
                        {
                          backgroundColor: isDark ? GLASS.bgLight : 'rgba(255,255,255,0.5)',
                          color: colors.text,
                          borderColor: GLASS.borderColor,
                        },
                      ]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      value={filters.minAmount}
                      onChangeText={(text) => setFilters({ ...filters, minAmount: text })}
                    />
                  </View>

                  <View style={styles.filterSection}>
                    <Text style={[styles.filterLabel, { color: colors.text }]}>Max Amount</Text>
                    <TextInput
                      style={[
                        styles.filterInput,
                        {
                          backgroundColor: isDark ? GLASS.bgLight : 'rgba(255,255,255,0.5)',
                          color: colors.text,
                          borderColor: GLASS.borderColor,
                        },
                      ]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      value={filters.maxAmount}
                      onChangeText={(text) => setFilters({ ...filters, maxAmount: text })}
                    />
                  </View>
                </Animated.View>
              )}

              {/* Clear All Filters */}
              <AnimatedPressable
                onPress={clearFilters}
                scaleValue={0.97}
              >
                <LinearGradient
                  colors={[colors.error, '#FF6B6B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.clearFiltersButton}
                >
                  <Text style={styles.clearFiltersButtonText}>Clear All Filters</Text>
                </LinearGradient>
              </AnimatedPressable>

              <View style={{ height: 40 }} />
            </ScrollView>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  // ─── Header ────────────────────────────────────────────────────────
  headerWrapper: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingBottom: 20,
  },
  headerSafeArea: {},
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
  },
  glassHeaderButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassHeaderButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  glassHeaderButtonIcon: {
    fontSize: 16,
  },
  addButtonGradient: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    minHeight: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // ─── Search ────────────────────────────────────────────────────────
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: GLASS.borderRadius,
    borderWidth: 1,
    borderColor: GLASS.borderColor,
    overflow: 'hidden',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  clearBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  clearBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Selection Info ────────────────────────────────────────────────
  selectionInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS.borderColor,
    gap: 8,
  },
  selectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectionInfoText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ─── List ──────────────────────────────────────────────────────────
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  // ─── Section Headers ──────────────────────────────────────────────
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionTotal: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 14,
    marginTop: 2,
  },
  sectionFooter: {
    height: 4,
  },

  // ─── Expense Items ─────────────────────────────────────────────────
  expenseItemWrapper: {
    marginBottom: 10,
  },
  expenseItem: {
    padding: 16,
    borderRadius: GLASS.borderRadius,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GLASS.borderColor,
    overflow: 'hidden',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  expenseContent: {
    flex: 1,
    marginRight: 12,
  },
  expenseDescription: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  expenseMerchant: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 3,
  },
  expenseDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  expenseAmount: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  currencyText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  // ─── Empty State ───────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyActionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // ─── Loading State ─────────────────────────────────────────────────
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },

  // ─── Modal ─────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  modalDoneButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalDoneText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },

  // ─── Filter Controls ──────────────────────────────────────────────
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 40,
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    padding: 14,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  advancedToggle: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  advancedToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterInput: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
  },
  clearFiltersButton: {
    padding: 16,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  clearFiltersButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
