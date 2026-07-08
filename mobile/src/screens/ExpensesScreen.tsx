import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import AnimatedPressable from '../components/AnimatedPressable';
import CategoryIcon from '../components/CategoryIcon';
import {
  Wallet,
  Funnel,
  Notepad,
  MagnifyingGlass,
  CaretRight,
  CaretDown,
  SortDescending,
  SortAscending,
  SquaresFour,
} from 'phosphor-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BENTO_RADIUS = 18;

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

type SortMode = 'latest' | 'earliest' | 'category';

// Matches DataContext's cache size so its refresh equals our page 1.
const PAGE_SIZE = 100;

/** Insertion timestamp — when the transaction was recorded (falls back to its date). */
const insertedAt = (exp: Expense): number =>
  new Date((exp as any).createdAt || exp.date).getTime();

/** Local calendar-day key, used to segment the chronological views by date. */
const dayKey = (d: string | Date): string => {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
};

/** Human date header: Today / Yesterday / "7 Feb" (year added when not this year). */
const dateLabel = (d: string | Date): string => {
  const x = new Date(d);
  const now = new Date();
  if (dayKey(x) === dayKey(now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(x) === dayKey(yesterday)) return 'Yesterday';
  return x.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: x.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
};

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
  // 'latest' = most recently added first (default), 'earliest' = oldest first,
  // 'category' = the classic grouped-by-category view with section totals.
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  // Server-side pagination: the list used to silently cap at the first 100
  // rows; now it loads further pages as you scroll. Refs track raw server
  // rows (before the client-side type filter) so paging math stays correct.
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const fetchedCountRef = useRef(0);
  const totalCountRef = useRef(0);
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

  // Update local state when cache updates. The cache holds the first
  // PAGE_SIZE rows, so treat it as a reset back to page 1.
  useEffect(() => {
    setExpenses(cachedExpenses);
    pageRef.current = 1;
    fetchedCountRef.current = cachedExpenses.length;
    totalCountRef.current = Math.max(totalCountRef.current, cachedExpenses.length);
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

  const buildParams = (page: number) => {
    const params: any = { limit: PAGE_SIZE, page };
    if (filters.categoryId) params.categoryId = filters.categoryId;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.minAmount) params.minAmount = parseFloat(filters.minAmount);
    if (filters.maxAmount) params.maxAmount = parseFloat(filters.maxAmount);
    if (searchQuery) params.search = searchQuery;
    return params;
  };

  const applyTypeFilter = (rows: Expense[]): Expense[] =>
    filters.type
      ? rows.filter((exp: Expense) => (exp as any).type === filters.type)
      : rows;

  const loadExpenses = async () => {
    // Only show loading if we don't have cached data
    if (cachedExpenses.length === 0) {
      setLoading(true);
    }

    try {
      const data: any = await api.getExpenses(buildParams(1));
      const raw = (data?.expenses || []) as Expense[];
      pageRef.current = 1;
      fetchedCountRef.current = raw.length;
      totalCountRef.current = data?.total ?? raw.length;

      setExpenses(applyTypeFilter(raw));
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

  /** Fetch the next page when the list nears its end (infinite scroll). */
  const loadMore = async () => {
    if (loading || loadingMore) return;
    if (fetchedCountRef.current >= totalCountRef.current) return;

    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const data: any = await api.getExpenses(buildParams(nextPage));
      const raw = (data?.expenses || []) as Expense[];
      pageRef.current = nextPage;
      fetchedCountRef.current += raw.length;
      totalCountRef.current = data?.total ?? totalCountRef.current;

      const more = applyTypeFilter(raw);
      setExpenses((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...more.filter((e) => !seen.has(e.id))];
      });
    } catch (error) {
      console.warn('Error loading more expenses:', error);
    } finally {
      setLoadingMore(false);
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

  // Build the list: chronological (flat, headerless) or grouped by category
  const groupedExpenses = useMemo(() => {
    if (sortMode !== 'category') {
      // Chronological: order by transaction date (then insertion time within a
      // day) and segment into one section per calendar day.
      const dir = sortMode === 'latest' ? -1 : 1;
      const sorted = [...filteredExpenses].sort((a, b) => {
        const byDate = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (byDate !== 0) return byDate * dir;
        return (insertedAt(a) - insertedAt(b)) * dir;
      });

      const sections: ExpenseSection[] = [];
      let currentKey = '';
      for (const exp of sorted) {
        const key = dayKey(exp.date);
        if (key !== currentKey) {
          currentKey = key;
          sections.push({ title: dateLabel(exp.date), data: [], total: 0 });
        }
        const section = sections[sections.length - 1];
        section.data.push(exp);
        const amt = getDisplayAmount(exp);
        // Day total is the net: income adds, spending subtracts.
        section.total += (exp as any).type === 'income' ? amt : -amt;
      }
      return sections;
    }

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
  }, [filteredExpenses, sortMode]);

  const renderExpense = ({ item, index }: { item: Expense; index: number }) => {
    const amount = getDisplayAmount(item);
    const formattedAmount = amount.toFixed(2);
    const expenseType = (item as any).type || 'expense';

    return (
      <AnimatedPressable
        onPress={() => {
          navigation.navigate('EditExpense', {
            expenseId: item.id,
            expense: item
          });
        }}
        scaleValue={0.98}
        style={styles.expenseItemWrapper}
      >
        <View
          style={[
            styles.expenseItem,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.expenseEmoji, { backgroundColor: expenseType === 'income' ? colors.tintCool : colors.tintWarm }]}>
            {expenseType === 'income' ? (
              <Wallet size={22} color={colors.tintCoolText} weight="duotone" />
            ) : (
              <CategoryIcon name={item.category?.name} size={22} color={colors.tintWarmText} />
            )}
          </View>
          <View style={styles.expenseContent}>
            <Text style={[styles.expenseDescription, { color: colors.text }]} numberOfLines={1}>
              {item.description}
            </Text>
            <Text style={[styles.expenseMerchant, { color: colors.textTertiary }]} numberOfLines={1}>
              {(item.merchant || item.category?.name || 'Uncategorized') + ' · ' +
                new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <View style={styles.expenseAmount}>
            <Text style={[
              styles.amountText,
              { color: expenseType === 'income' ? colors.success : colors.text }
            ]}>
              {expenseType === 'income' ? '+' : '−'}{formattedAmount}
            </Text>
            <Text style={[styles.currencyText, { color: colors.textTertiary }]}>
              {item.convertedCurrency === userCurrency ? userCurrency : item.currency}
            </Text>
          </View>
        </View>
      </AnimatedPressable>
    );
  };

  const renderSectionHeader = ({ section }: { section: ExpenseSection }) => {
    // Chronological modes use a single unnamed section — no header to draw.
    if (!section.title) return null;

    const formattedTotal = section.total.toFixed(2);
    const currency = userCurrency;

    return (
      <View style={[styles.sectionHeader, { backgroundColor: 'transparent' }]}>
        <View style={styles.sectionHeaderContent}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {section.title}
            </Text>
          </View>
          <Text style={[styles.sectionTotal, { color: colors.primary }]}>
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

  // ─── Header Bar ─────────────────────────────────────────────
  const renderHeader = (showAdd: boolean = true) => (
    <View style={[styles.headerWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.headerButtonsRow}>
          <AnimatedPressable
            onPress={() => setShowFilters(true)}
            scaleValue={0.93}
            style={{ flex: 1 }}
          >
            <View
              style={[
                styles.headerButton,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
                hasActiveFilters && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Funnel size={16} color={hasActiveFilters ? colors.primary : colors.text} weight="duotone" />
                <Text style={[styles.headerButtonText, { color: hasActiveFilters ? colors.primary : colors.text }]}>
                  Filters
                </Text>
              </View>
            </View>
          </AnimatedPressable>
          {showAdd && (
            <AnimatedPressable
              onPress={() => navigation.navigate('AddExpense')}
              scaleValue={0.93}
            >
              <View style={[styles.addButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.addButtonText}>+ Add</Text>
              </View>
            </AnimatedPressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );

  // ─── Loading State ─────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader(false)}
        <View style={styles.center}>
          <GlassCard
            tint={isDark ? 'dark' : 'light'}
            style={styles.loadingCard}
          >
            <ActivityIndicator size="large" color={colors.primary} />
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
              tint={isDark ? 'dark' : 'light'}
              style={styles.emptyCard}
            >
              <View style={styles.emptyIcon}>
                <Notepad size={44} color={colors.textTertiary} weight="duotone" />
              </View>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No transactions found
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                {hasActiveFilters
                  ? 'No matches for your current filters. Try broadening your search.'
                  : 'Tap the button below to record your first income or expense'}
              </Text>
              {!hasActiveFilters && (
                <AnimatedPressable
                  onPress={() => navigation.navigate('AddExpense')}
                  scaleValue={0.97}
                >
                  <View style={[styles.emptyActionButton, { backgroundColor: colors.primary }]}>
                    <Text style={styles.emptyActionButtonText}>
                      Record a Transaction
                    </Text>
                  </View>
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

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={{ marginRight: 8 }}>
            <MagnifyingGlass size={18} color={colors.textTertiary} weight="duotone" />
          </View>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search transactions..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {hasActiveFilters && (
            <AnimatedPressable onPress={clearFilters} scaleValue={0.9}>
              <View style={[styles.clearBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.clearBadgeText, { color: colors.primary }]}>Clear</Text>
              </View>
            </AnimatedPressable>
          )}
        </View>
      </View>

      {/* Sort: Latest / Earliest / By category */}
      <View style={styles.sortRow}>
        {([
          { key: 'latest', label: 'Latest', Icon: SortDescending },
          { key: 'earliest', label: 'Earliest', Icon: SortAscending },
          { key: 'category', label: 'Category', Icon: SquaresFour },
        ] as const).map(({ key, label, Icon }) => {
          const active = sortMode === key;
          return (
            <AnimatedPressable
              key={key}
              onPress={() => setSortMode(key)}
              scaleValue={0.96}
              style={styles.sortChipWrapper}
            >
              <View
                style={[
                  styles.sortChip,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.inputBg, borderColor: colors.borderStrong },
                ]}
              >
                <Icon size={14} color={active ? '#fefefe' : colors.textSecondary} weight={active ? 'bold' : 'duotone'} />
                <Text style={[styles.sortChipText, { color: active ? '#fefefe' : colors.text }]}>
                  {label}
                </Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>

      <SectionList
        sections={groupedExpenses}
        renderItem={renderExpense}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginVertical: 16 }}
            />
          ) : null
        }
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
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
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
                <View style={[styles.modalDoneButton, { backgroundColor: colors.primary }]}>
                  <Text style={styles.modalDoneText}>Done</Text>
                </View>
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
                    <View
                      style={[
                        styles.filterChip,
                        !filters.categoryId
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : {
                              backgroundColor: colors.inputBg,
                              borderColor: colors.border,
                            },
                      ]}
                    >
                      <Text style={[
                        styles.filterChipText,
                        { color: !filters.categoryId ? '#fff' : colors.text },
                      ]}>
                        All
                      </Text>
                    </View>
                  </AnimatedPressable>
                  {categories.map(cat => (
                    <AnimatedPressable
                      key={cat.id}
                      onPress={() => setFilters({ ...filters, categoryId: filters.categoryId === cat.id ? '' : cat.id })}
                      scaleValue={0.95}
                    >
                      <View
                        style={[
                          styles.filterChip,
                          filters.categoryId === cat.id
                            ? { backgroundColor: colors.primary, borderColor: colors.primary }
                            : {
                                backgroundColor: colors.inputBg,
                                borderColor: colors.border,
                              },
                        ]}
                      >
                        <Text style={[
                          styles.filterChipText,
                          { color: filters.categoryId === cat.id ? '#fff' : colors.text },
                        ]}>
                          {cat.name}
                        </Text>
                      </View>
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
                      <View
                        style={[
                          styles.typeButton,
                          filters.type === type.value
                            ? { backgroundColor: colors.primary, borderColor: colors.primary }
                            : {
                                backgroundColor: colors.inputBg,
                                borderColor: colors.border,
                              },
                        ]}
                      >
                        <Text style={[
                          styles.typeButtonText,
                          { color: filters.type === type.value ? '#fff' : colors.text },
                        ]}>
                          {type.label}
                        </Text>
                      </View>
                    </AnimatedPressable>
                  ))}
                </View>
              </View>

              {/* Advanced Filters Toggle */}
              <AnimatedPressable
                onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
                scaleValue={0.98}
              >
                <View
                  style={[
                    styles.advancedToggle,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {showAdvancedFilters ? (
                      <CaretDown size={14} color={colors.text} weight="bold" />
                    ) : (
                      <CaretRight size={14} color={colors.text} weight="bold" />
                    )}
                    <Text style={[styles.advancedToggleText, { color: colors.text }]}>Advanced Filters</Text>
                  </View>
                </View>
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
                          backgroundColor: colors.inputBg,
                          color: colors.text,
                          borderColor: colors.border,
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
                          backgroundColor: colors.inputBg,
                          color: colors.text,
                          borderColor: colors.border,
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
                          backgroundColor: colors.inputBg,
                          color: colors.text,
                          borderColor: colors.border,
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
                          backgroundColor: colors.inputBg,
                          color: colors.text,
                          borderColor: colors.border,
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
                <View style={[styles.clearFiltersButton, { backgroundColor: colors.error }]}>
                  <Text style={styles.clearFiltersButtonText}>Reset Filters</Text>
                </View>
              </AnimatedPressable>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
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
    borderBottomWidth: 0.5,
    paddingBottom: 16,
  },
  headerSafeArea: {},
  headerButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
  },
  headerButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    minHeight: 44,
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
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
  },
  sortChipWrapper: {
    flex: 1,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BENTO_RADIUS,
    borderWidth: 0.5,
    paddingHorizontal: 14,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
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
    fontVariant: ['tabular-nums'],
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
    marginBottom: 6,
  },
  expenseItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 64,
    borderRadius: BENTO_RADIUS,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  expenseEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseEmojiText: {
    fontSize: 18,
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
    fontVariant: ['tabular-nums'],
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    borderWidth: 0.5,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 0.5,
    minHeight: 44,
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
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  advancedToggle: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: 16,
  },
  advancedToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterInput: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 0.5,
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
