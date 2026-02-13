# Change Log

## Session Changes (Latest First)

### 20. SettingsScreen — SafeAreaView header fix
**File:** `mobile/src/screens/SettingsScreen.tsx`
- Added `SafeAreaView` import from `react-native-safe-area-context`
- Wrapped header `LinearGradient` in `<SafeAreaView edges={['top']}>` so the header sits below the status bar and is fully tappable

### 19. GroupsScreen — SafeAreaView header fix
**File:** `mobile/src/screens/GroupsScreen.tsx`
- Added `SafeAreaView` import from `react-native-safe-area-context`
- Wrapped header `LinearGradient` in `<SafeAreaView edges={['top']}>` to fix the same status bar overlap issue

### 18. CalendarScreen — Day cell sizing fix (dates not appearing)
**File:** `mobile/src/screens/CalendarScreen.tsx`
- Root cause: `AnimatedPressable` drops `flex` on its inner `Pressable` when a `style` prop is passed, so `dayCellInner` with `flex: 1` collapsed to 0x0
- Added `CELL_INNER = CELL_SIZE - 4` constant
- Replaced `flex: 1` on `dayCellInner` with explicit `width: CELL_INNER` / `height: CELL_INNER`

### 17. CalendarScreen — SafeAreaView header fix
**File:** `mobile/src/screens/CalendarScreen.tsx`
- Added `SafeAreaView` import
- Wrapped header `LinearGradient` in `<SafeAreaView edges={['top']}>` so month navigation arrows are pressable and not hidden behind the status bar

### 16. CalendarScreen — Day cell width fix (template literal)
**File:** `mobile/src/screens/CalendarScreen.tsx`
- Replaced `width: '${100/7}%'` (unsupported template literal string in RN) with numeric `width: CELL_SIZE` / `height: CELL_SIZE`
- Bumped `dayNumber.fontSize` from 14 to 15
- Added `width: '100%'` to `dayGrid` style

### 15. HomeScreen — Quick Tools size reduction
**File:** `mobile/src/screens/HomeScreen.tsx`
- `toolCard.minHeight`: 110 → 80
- `toolCard.paddingVertical`: 16 → 10
- `toolIconContainer`: 48x48 → 38x38
- `toolIcon.fontSize`: 24 → 20
- `toolLabel.fontSize`: 14 → 13
- `toolSublabel.fontSize`: 11 → 10
- `toolsGrid.gap`: 12 → 10
- `toolsSection.marginTop`: 24 → 18
- `actionsSection.marginTop`: 14 → 12, `gap`: 10 → 8
- Saves ~80-90px vertical space, eliminating scrolling on most devices

### 14. CalendarScreen — Full rewrite with calendar grid and transactions
**File:** `mobile/src/screens/CalendarScreen.tsx`
- Built `buildCalendarGrid()` to generate a complete 7-column grid with previous/next month filler days
- Pre-indexes expenses by date into a `Record<string, DaySummary>` map for O(1) lookup
- Colored dot indicators: green (income), red (expense), purple (mixed)
- Net-amount badges on each day cell
- Selected date gets purple `LinearGradient` highlight; today gets accent border
- `FlatList` with calendar as `ListHeaderComponent` for smooth scrolling
- Transaction rows show category badge, description, merchant, amount, and time
- Empty state with message when no transactions on selected date
- Month navigation defaults selection to today when returning to current month

### 13. CalendarScreen — Bottom padding for tab bar
**File:** `mobile/src/screens/CalendarScreen.tsx`
- Added `contentContainerStyle={{ paddingBottom: 100 }}` to ScrollView since tab bar uses `position: 'absolute'`

### 12. HomeScreen — Bottom spacer increase for tab bar
**File:** `mobile/src/screens/HomeScreen.tsx`
- `bottomSpacer.height`: 40 → 100 to account for absolute-positioned tab bar

### 11. SettingsScreen — Bottom margin increase for tab bar
**File:** `mobile/src/screens/SettingsScreen.tsx`
- Account section `marginBottom`: 40 → 100

### 10. SettingsScreen — Subscription navigation link
**File:** `mobile/src/screens/SettingsScreen.tsx`
- Added "Subscription" row with star emoji in the NAVIGATION section (after Geolocation)
- Navigates to `Subscriptions` screen on press

### 9. AppNavigator — Bottom tab navigator restructure
**File:** `mobile/src/navigation/AppNavigator.tsx`
- Added `createBottomTabNavigator` and `BlurView` imports
- Created `MainTabs` component with 4 tabs: Home, Calendar, Groups, Settings
- Tab bar: glassmorphic `BlurView` background, `position: 'absolute'`, emoji icons, accent active tint
- Stack wraps tabs: `MainTabs` is one screen; push screens (Expenses, AddExpense, etc.) sit above
- Added `Subscriptions` screen to the stack
- Removed Home, Calendar, Settings as standalone stack screens (now in tabs)

### 8. SubscriptionsScreen — New screen created
**File:** `mobile/src/screens/SubscriptionsScreen.tsx`
- Shows current app subscription plan (FREE/PREMIUM) with gradient badge
- Premium features list with lock/check indicators per feature
- Action buttons: Upgrade (coming-soon alert), Cancel (confirmation dialog), Reactivate
- Fetches status via `api.getSubscriptionStatus()`

### 7. GroupsScreen — New screen created
**File:** `mobile/src/screens/GroupsScreen.tsx`
- Header with `LinearGradient`, loading/empty/list states
- `FlatList` of `GlassCard` items showing group name, member count, chevron
- Create group modal (bottom sheet with `BlurView` + `GlassInput`)
- Long-press to delete with confirmation dialog
- Premium gate: checks subscription status, shows upgrade prompt for free-tier users

### 6. AnimatedPressable — Added onLongPress support
**File:** `mobile/src/components/AnimatedPressable.tsx`
- Added `onLongPress` to the `AnimatedPressableProps` interface
- Destructured `onLongPress` in the component
- Passed `onLongPress` to the inner `Pressable` (disabled when `disabled` is true)

### 5. api.ts — Added 3 Subscription API methods
**File:** `mobile/src/services/api.ts`
- `getSubscriptionStatus()` → GET `/subscriptions/status`
- `cancelSubscription()` → POST `/subscriptions/cancel`
- `reactivateSubscription()` → POST `/subscriptions/reactivate`

### 4. api.ts — Added 6 Groups API methods
**File:** `mobile/src/services/api.ts`
- `getGroups()` → GET `/groups`
- `createGroup({ name, memberIds })` → POST `/groups`
- `getGroup(id)` → GET `/groups/:id`
- `getGroupExpenses(id)` → GET `/groups/:id/expenses`
- `addExpenseToGroup(groupId, data)` → POST `/groups/:id/expenses`
- `deleteGroup(id)` → DELETE `/groups/:id`

### 3. .gitignore — Updated for AI tool configs
**File:** `.gitignore`
- Added exclusions for `.agent/`, `.claude/`, `.codebuddy/`, `.codex/`, `.continue/`, `.cursor/`, `.cursorrules`, `.gemini/`, `.kiro/`, `.opencode/`, `.qoder/`, `.roo/`, `.trae/`, `.windsurf/`
- Added `*.jpeg`, `*.jpg`, `*.png`, `screenshots/`, `nul`

### 2. Git repository initialized
- Ran `git init` at project root
- Removed nested `.git` inside `mobile/`
- Created initial commit with all 204 project files

### 1. Installed @react-navigation/bottom-tabs
- Ran `npx expo install @react-navigation/bottom-tabs` from `mobile/`
