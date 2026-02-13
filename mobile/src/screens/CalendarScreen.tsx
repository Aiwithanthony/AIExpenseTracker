import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import AnimatedPressable from '../components/AnimatedPressable';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Each day cell = 1/7 of the calendar card's inner width (card has 16px padding on each side, 16px margin on each side)
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 64) / 7);
const CELL_INNER = CELL_SIZE - 4; // subtract 2px padding on each side

const GLASS = {
  borderColor: 'rgba(255, 255, 255, 0.2)',
  bgLight: 'rgba(255, 255, 255, 0.08)',
  bgMedium: 'rgba(255, 255, 255, 0.12)',
  blurIntensity: 60,
  borderRadius: 16,
};
const ACCENT = '#6A0DAD';
const ACCENT_LIGHT = '#8B2FC9';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  convertedAmount?: number;
  convertedCurrency?: string;
  date: string;
  type?: string;
  merchant?: string;
  category?: {
    name: string;
  };
}

/** Represents one cell in the calendar grid. */
interface DayCell {
  day: number;            // day of month (1-31)
  isCurrentMonth: boolean;
  dateKey: string;        // "YYYY-MM-DD" for quick lookup
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Pad a number to 2 digits. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Build "YYYY-MM-DD" from parts. */
function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

/** Build a 6-row (42 cell) grid for the given year/month,
 *  including leading days from the previous month and trailing
 *  days from the next month so every row is full. */
function buildCalendarGrid(year: number, month: number): DayCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const startDow = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Previous month fill
  const prevMonthDays = new Date(year, month, 0).getDate(); // last day of prev month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;

  // Next month
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  const cells: DayCell[] = [];

  // Leading days from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    cells.push({ day: d, isCurrentMonth: false, dateKey: toDateKey(prevYear, prevMonth, d) });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isCurrentMonth: true, dateKey: toDateKey(year, month, d) });
  }

  // Trailing days from next month (fill to complete last row: make total a multiple of 7)
  const remainder = cells.length % 7;
  if (remainder > 0) {
    const needed = 7 - remainder;
    for (let d = 1; d <= needed; d++) {
      cells.push({ day: d, isCurrentMonth: false, dateKey: toDateKey(nextYear, nextMonth, d) });
    }
  }

  return cells;
}

// ──────────────────────────────────────────────────────────────────────────────
// Pre-index expenses by date for O(1) lookup
// ──────────────────────────────────────────────────────────────────────────────

interface DaySummary {
  expenses: Expense[];
  totalIncome: number;
  totalExpense: number;
}

function indexExpenses(
  expenses: Expense[],
  getDisplayAmount: (e: Expense) => number,
): Record<string, DaySummary> {
  const map: Record<string, DaySummary> = {};
  for (const exp of expenses) {
    // Parse date – the API may return ISO strings or YYYY-MM-DD
    const key = exp.date.substring(0, 10); // "YYYY-MM-DD"
    if (!map[key]) {
      map[key] = { expenses: [], totalIncome: 0, totalExpense: 0 };
    }
    map[key].expenses.push(exp);
    const amt = getDisplayAmount(exp);
    if (exp.type === 'income') {
      map[key].totalIncome += amt;
    } else {
      map[key].totalExpense += amt;
    }
  }
  return map;
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export default function CalendarScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const userCurrency = user?.currency || 'USD';

  /** Resolve the display amount respecting currency conversion. */
  const getDisplayAmount = useCallback((exp: Expense): number => {
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
  }, [userCurrency]);

  // ── State ────────────────────────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today.getFullYear(), today.getMonth(), today.getDate()), [today]);

  // viewYear/viewMonth control which month the grid shows
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // selectedDateKey is the "YYYY-MM-DD" the user tapped; defaults to today
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Derived data ─────────────────────────────────────────────────────────
  const grid = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const dayMap = useMemo(() => indexExpenses(expenses, getDisplayAmount), [expenses, getDisplayAmount]);

  const selectedDayData: DaySummary | undefined = dayMap[selectedDateKey];
  const selectedExpenses = selectedDayData?.expenses ?? [];

  // ── API fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadMonth();
  }, [viewYear, viewMonth]);

  const loadMonth = async () => {
    setLoading(true);
    try {
      const startDate = `${viewYear}-${pad2(viewMonth + 1)}-01`;
      const endDate = `${viewYear}-${pad2(viewMonth + 1)}-${new Date(viewYear, viewMonth + 1, 0).getDate()}`;
      const data: any = await api.getExpenses({ startDate, endDate, limit: 1000 });
      setExpenses(Array.isArray(data?.expenses) ? data.expenses : []);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Navigation ───────────────────────────────────────────────────────────
  const navigateMonth = (dir: -1 | 1) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
    // Select the 1st of the new month (or today if it's the current month)
    const now = new Date();
    if (y === now.getFullYear() && m === now.getMonth()) {
      setSelectedDateKey(todayKey);
    } else {
      setSelectedDateKey(toDateKey(y, m, 1));
    }
  };

  // ── Format helpers ───────────────────────────────────────────────────────
  const formatTime = (dateStr: string): string => {
    const d = new Date(dateStr);
    const h = d.getHours();
    const min = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${pad2(min)} ${ampm}`;
  };

  const selectedDayLabel = useMemo(() => {
    // Parse the selected key to produce a human-readable label
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    return `${dayName}, ${MONTH_NAMES[m - 1]} ${d}`;
  }, [selectedDateKey]);

  // ── Render helpers ───────────────────────────────────────────────────────

  /** Colored dot indicator for a calendar cell. */
  const DotIndicator = ({ summary }: { summary: DaySummary }) => {
    const hasIncome = summary.totalIncome > 0;
    const hasExpense = summary.totalExpense > 0;
    if (!hasIncome && !hasExpense) return null;

    let dotColor: string;
    if (hasIncome && hasExpense) {
      dotColor = ACCENT_LIGHT; // mixed
    } else if (hasIncome) {
      dotColor = colors.success;
    } else {
      dotColor = colors.error;
    }

    return <View style={[styles.dot, { backgroundColor: dotColor }]} />;
  };

  /** Render a single day cell. */
  const renderDayCell = (cell: DayCell, index: number) => {
    const isSelected = cell.dateKey === selectedDateKey;
    const isToday = cell.dateKey === todayKey;
    const summary = dayMap[cell.dateKey];
    const hasTransactions = summary && (summary.totalIncome > 0 || summary.totalExpense > 0);

    // Net total for badge text
    const net = summary ? summary.totalIncome - summary.totalExpense : 0;

    return (
      <AnimatedPressable
        key={`${cell.dateKey}-${index}`}
        onPress={() => {
          setSelectedDateKey(cell.dateKey);
          // If tapping a day from a different month, navigate there
          if (!cell.isCurrentMonth) {
            const [y, m] = cell.dateKey.split('-').map(Number);
            setViewYear(y);
            setViewMonth(m - 1);
          }
        }}
        scaleValue={0.92}
        style={styles.dayCellPressable}
      >
        {isSelected ? (
          <LinearGradient
            colors={[ACCENT_LIGHT, ACCENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dayCellInner}
          >
            <Text style={[styles.dayNumber, styles.dayNumberSelected]}>{cell.day}</Text>
            {hasTransactions && <DotIndicator summary={summary!} />}
            {hasTransactions && (
              <Text style={[styles.dayBadge, styles.dayBadgeSelected]} numberOfLines={1}>
                {net >= 0 ? '+' : ''}{Math.abs(net) >= 1000 ? `${(net / 1000).toFixed(1)}k` : net.toFixed(0)}
              </Text>
            )}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.dayCellInner,
              isToday && styles.dayCellToday,
              hasTransactions && cell.isCurrentMonth && styles.dayCellWithData,
            ]}
          >
            <Text
              style={[
                styles.dayNumber,
                { color: cell.isCurrentMonth ? colors.text : colors.textSecondary },
                !cell.isCurrentMonth && styles.dayNumberMuted,
                isToday && styles.dayNumberToday,
              ]}
            >
              {cell.day}
            </Text>
            {hasTransactions && cell.isCurrentMonth && <DotIndicator summary={summary!} />}
            {hasTransactions && cell.isCurrentMonth && (
              <Text
                style={[styles.dayBadge, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {net >= 0 ? '+' : ''}{Math.abs(net) >= 1000 ? `${(net / 1000).toFixed(1)}k` : net.toFixed(0)}
              </Text>
            )}
          </View>
        )}
      </AnimatedPressable>
    );
  };

  /** Render one expense row in the selected-day transaction list. */
  const renderExpenseItem = ({ item: expense }: { item: Expense }) => {
    const amount = getDisplayAmount(expense);
    const isIncome = expense.type === 'income';
    const sign = isIncome ? '+' : '-';
    const amountColor = isIncome ? colors.success : colors.error;
    const displayCurrency = (expense.convertedCurrency === userCurrency) ? userCurrency : expense.currency;

    return (
      <AnimatedPressable
        onPress={() => navigation.navigate('EditExpense', { expenseId: expense.id })}
        scaleValue={0.98}
        style={styles.txPressable}
      >
        <BlurView
          intensity={40}
          tint={isDark ? 'dark' : 'light'}
          style={styles.txCard}
        >
          {/* Left: category icon placeholder + details */}
          <View style={styles.txLeft}>
            <View style={[styles.txCategoryBadge, { backgroundColor: isIncome ? 'rgba(52,199,89,0.15)' : 'rgba(255,59,48,0.15)' }]}>
              <Text style={styles.txCategoryIcon}>{isIncome ? '\u2191' : '\u2193'}</Text>
            </View>
            <View style={styles.txDetails}>
              <Text style={[styles.txDescription, { color: colors.text }]} numberOfLines={1}>
                {expense.description}
              </Text>
              <View style={styles.txMetaRow}>
                {expense.category && (
                  <Text style={[styles.txMeta, { color: colors.textSecondary }]}>
                    {expense.category.name}
                  </Text>
                )}
                {expense.merchant && (
                  <Text style={[styles.txMeta, { color: colors.textSecondary }]}>
                    {expense.category ? '  \u00B7  ' : ''}{expense.merchant}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Right: amount + time */}
          <View style={styles.txRight}>
            <Text style={[styles.txAmount, { color: amountColor }]}>
              {sign}{amount.toFixed(2)} {displayCurrency}
            </Text>
            <Text style={[styles.txTime, { color: colors.textSecondary }]}>
              {formatTime(expense.date)}
            </Text>
          </View>
        </BlurView>
      </AnimatedPressable>
    );
  };

  // ── Main render ──────────────────────────────────────────────────────────

  /** Header content rendered above the FlatList. */
  const ListHeader = () => (
    <>
      {/* Calendar grid card */}
      <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.calendarWrapper}>
        <GlassCard style={styles.calendarCard} tint={isDark ? 'dark' : 'light'}>
          {/* Week day headers */}
          <View style={styles.weekHeader}>
            {WEEK_DAYS.map((wd) => (
              <View key={wd} style={styles.weekDayCell}>
                <Text style={[styles.weekDayText, { color: colors.textSecondary }]}>
                  {wd.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          {loading ? (
            <View style={styles.gridLoading}>
              <ActivityIndicator size="small" color={ACCENT} />
            </View>
          ) : (
            <View style={styles.dayGrid}>
              {grid.map((cell, i) => renderDayCell(cell, i))}
            </View>
          )}
        </GlassCard>
      </Animated.View>

      {/* Section title for transactions */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.txSectionHeader}>
        <Text style={[styles.txSectionTitle, { color: colors.text }]}>
          {selectedDayLabel}
        </Text>
        {selectedDayData && (
          <View style={styles.txSectionSummary}>
            {selectedDayData.totalIncome > 0 && (
              <Text style={[styles.txSummaryBadge, { color: colors.success }]}>
                +{selectedDayData.totalIncome.toFixed(2)}
              </Text>
            )}
            {selectedDayData.totalExpense > 0 && (
              <Text style={[styles.txSummaryBadge, { color: colors.error }]}>
                -{selectedDayData.totalExpense.toFixed(2)}
              </Text>
            )}
          </View>
        )}
      </Animated.View>
    </>
  );

  /** Empty state when no transactions for selected date. */
  const EmptyList = () => (
    <Animated.View entering={FadeInDown.duration(300).delay(250)} style={styles.emptyWrapper}>
      <GlassCard style={styles.emptyCard} tint={isDark ? 'dark' : 'light'}>
        <Text style={styles.emptyEmoji}>{'\uD83D\uDCC5'}</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No transactions on this date</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Tap + on the Home tab to add one.
        </Text>
      </GlassCard>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D0D' : colors.background }]}>
      {/* Month header with navigation arrows – SafeAreaView keeps it below the status bar */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <LinearGradient
          colors={['#1A0030', '#2D004F', ACCENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <AnimatedPressable onPress={() => navigateMonth(-1)} style={styles.arrowWrapper}>
            <BlurView intensity={GLASS.blurIntensity} tint={isDark ? 'dark' : 'light'} style={styles.arrowCircle}>
              <Text style={styles.arrowText}>{'\u2039'}</Text>
            </BlurView>
          </AnimatedPressable>

          <Text style={styles.monthTitle}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>

          <AnimatedPressable onPress={() => navigateMonth(1)} style={styles.arrowWrapper}>
            <BlurView intensity={GLASS.blurIntensity} tint={isDark ? 'dark' : 'light'} style={styles.arrowCircle}>
              <Text style={styles.arrowText}>{'\u203A'}</Text>
            </BlurView>
          </AnimatedPressable>
        </LinearGradient>
      </SafeAreaView>

      {/* Transactions list (with calendar grid as list header) */}
      <FlatList
        data={selectedExpenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpenseItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={loading ? null : EmptyList}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ── Header ──────────────────────────────────────────────────────────────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: GLASS.borderRadius,
    borderBottomRightRadius: GLASS.borderRadius,
  },
  arrowWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  arrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  arrowText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  /* ── Calendar card ───────────────────────────────────────────────────────── */
  calendarWrapper: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  calendarCard: {
    padding: 12,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  gridLoading: {
    height: CELL_SIZE * 5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Day cells ───────────────────────────────────────────────────────────── */
  dayCellPressable: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    padding: 2,
  },
  dayCellInner: {
    width: CELL_INNER,
    height: CELL_INNER,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    gap: 1,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: ACCENT_LIGHT,
  },
  dayCellWithData: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  dayNumber: {
    fontSize: 15,
    fontWeight: '600',
  },
  dayNumberSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayNumberMuted: {
    opacity: 0.35,
  },
  dayNumberToday: {
    color: ACCENT_LIGHT,
    fontWeight: '800',
  },

  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  dayBadge: {
    fontSize: 8,
    fontWeight: '600',
  },
  dayBadgeSelected: {
    color: 'rgba(255,255,255,0.85)',
  },

  /* ── Transaction section header ──────────────────────────────────────────── */
  txSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  txSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  txSectionSummary: {
    flexDirection: 'row',
    gap: 10,
  },
  txSummaryBadge: {
    fontSize: 13,
    fontWeight: '700',
  },

  /* ── Transaction rows ────────────────────────────────────────────────────── */
  txPressable: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  txCategoryBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txCategoryIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  txDetails: {
    flex: 1,
  },
  txDescription: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  txRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  txTime: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  /* ── Empty state ─────────────────────────────────────────────────────────── */
  emptyWrapper: {
    marginHorizontal: 16,
    marginTop: 4,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* ── FlatList content ────────────────────────────────────────────────────── */
  listContent: {
    paddingBottom: 120,
  },
});
