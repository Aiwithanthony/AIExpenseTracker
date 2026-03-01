# Change Log

## Session Changes (Latest First)

### 36. Fix 11 pre-existing TypeScript errors across 3 files
**Files:**
- `shared/types.ts` — Added `LocationRule` interface (with `minTimeSpent` matching backend field name)
- `mobile/src/services/api.ts` — Added `<Expense>` type param to `getExpense()`, `<LocationRule[]>` to `getLocationRules()`, imported types from `shared/types`
- `mobile/src/services/locationTracking.ts` — Added missing `shouldShowBanner` and `shouldShowList` properties to notification handler (required by updated `expo-notifications`)
- `mobile/src/screens/GeolocationScreen.tsx` — Imported `LocationRule` from `shared/types`, removed duplicate local interface, fixed `minDuration` → `minTimeSpent` reference

**Root causes:**
1. Untyped API methods (`getExpense`, `getLocationRules`) returning `unknown` due to missing generic type parameter on `this.request()`
2. `expo-notifications` `NotificationBehavior` interface added required `shouldShowBanner` and `shouldShowList` properties

**Result:** Mobile `npx tsc --noEmit` now reports 0 errors (was 11)

### 35. InviteMembersScreen — New screen for managing group members and invites
**File:** `mobile/src/screens/InviteMembersScreen.tsx`
- Current members list with role badges (Admin/Member) and remove button (admin-only)
- Invite code display with large text and "Copy Code" button (uses `expo-clipboard`)
- Search & add members section with debounced user search (300ms), filtered to exclude existing members
- Email invite section to send token-based invites with 7-day expiry
- Uses `useFocusEffect` to refresh data on screen focus

### 34. SettleUpScreen — New screen for viewing debts and recording settlements
**File:** `mobile/src/screens/SettleUpScreen.tsx`
- Displays simplified debts from `getGroupBalances()` with personalized labels ("You owe X" / "X owes you")
- "Mark as Paid" button per debt with confirmation dialog, creates settlement via API
- Collapsible settlement history section with formatted dates and optional notes
- Pull-to-refresh, loading state, "All settled up!" empty state
- Glass morphism design with purple gradient header

### 33. AddGroupExpenseScreen — New screen for adding split group expenses
**File:** `mobile/src/screens/AddGroupExpenseScreen.tsx`
- Form fields: amount, description, currency (defaults to group base currency), date picker
- "Paid By" horizontal member chip selector (defaults to current user)
- Split type toggle: Equal / Exact / Percentage with animated gradient selection
- Member selection checkboxes with computed per-person amounts for equal splits
- Per-person amount inputs for Exact/Percentage with color-coded validation summary
- Validates sum matches total (Exact) or 100% (Percentage) within 0.01 tolerance

### 32. GroupDetailScreen — New group dashboard screen
**File:** `mobile/src/screens/GroupDetailScreen.tsx`
- Balance summary card showing net balance (green for owed, red for owing)
- Action buttons row: "Add Expense", "Settle Up", "Members" navigating to respective screens
- Chronological expense list with payer name, split type badge, and formatted amounts
- Copyable invite code display at bottom
- Loads group, expenses, and balances in parallel via `Promise.all` on focus

### 31. GroupsScreen — Enhanced with navigation, pull-to-refresh, join-by-code
**File:** `mobile/src/screens/GroupsScreen.tsx`
- Added navigation to `GroupDetail` screen on group card press
- Added pull-to-refresh with `RefreshControl`
- Added "Join Group" modal with invite code input
- Enhanced create modal with description and base currency fields
- Two FAB buttons: "Join Group" (outline) and "+ New Group" (gradient)
- Updated group card to show description preview

### 30. Mobile Navigation — Registered 4 new group screens
**File:** `mobile/src/navigation/AppNavigator.tsx`
- Added `GroupDetail`, `AddGroupExpense`, `SettleUp`, `InviteMembers` stack screens (all `headerShown: false`)

### 29. Mobile API — Added ~15 new group API methods
**File:** `mobile/src/services/api.ts`
- Updated `createGroup()` to accept description/baseCurrency
- Added: `updateGroup`, `getGroupMembers`, `addGroupMembers`, `removeGroupMember`
- Added: `createGroupExpense`, `deleteGroupExpense`, `getGroupBalances`
- Added: `createSettlement`, `getSettlements`
- Added: `joinGroupByCode`, `createGroupInvite`, `acceptGroupInvite`, `searchUsers`
- Removed old `addExpenseToGroup()` method

### 28. GroupsController — Full rewrite with 18 routes
**File:** `backend/src/groups/groups.controller.ts`
- Non-parameterized routes (`search-users`, `join`, `accept-invite/:token`) declared before `:id` routes to prevent conflicts
- Routes: CRUD (create/findAll/findOne/updateGroup/deleteGroup), members (get/add/remove), expenses (add/get/delete), balances, settlements (create/get), invites
- All routes use `@UseGuards(JwtAuthGuard)` and `@CurrentUser()` decorator

### 27. GroupsModule — Updated with new entities and services
**File:** `backend/src/groups/groups.module.ts`
- TypeOrmModule.forFeature: 7 entities (ExpenseGroup, GroupExpense, GroupMember, GroupExpenseSplit, GroupSettlement, GroupInvite, User)
- Added `CurrencyModule` import for FX rate conversion
- Added `SplitCalculationService` provider

### 26. GroupsService — Full rewrite with 18 methods for expense splitting
**File:** `backend/src/groups/groups.service.ts`
- Injects 7 repositories + 3 services (SubscriptionsService, CurrencyService, SplitCalculationService)
- Group CRUD: create (generates invite code, adds creator as admin), findAll (via GroupMember JOIN), findOne, updateGroup (admin-only), deleteGroup (admin-only)
- Members: getGroupMembers, addMembers, removeMember (admin or self-remove), joinByCode, searchUsers
- Expenses: addExpense (validates splits based on splitType), getGroupExpenses (with splits/payer relations), deleteExpense
- Balances: getGroupBalances (computes net balances from expenses/settlements, converts currencies, runs debt simplification)
- Settlements: createSettlement, getSettlements
- Invites: createInvite (7-day expiry token), acceptInvite
- Helpers: assertMembership, assertAdmin, generateInviteCode, generateUniqueInviteCode

### 25. Group Expense Splitting — Backend schema and services
**New files:**
- `backend/src/entities/group-member.entity.ts` — Join table replacing `memberIds` simple-array. Columns: id, groupId, userId, role ('admin'|'member'), joinedAt. Unique constraint on [groupId, userId]
- `backend/src/entities/group-expense-split.entity.ts` — Per-user expense split amounts. Columns: id, groupExpenseId, userId, amount (decimal 18,2). Unique constraint on [groupExpenseId, userId]
- `backend/src/entities/group-settlement.entity.ts` — Settlement records. Columns: id, groupId, fromUserId, toUserId, amount (decimal 18,2), currency, note, createdAt
- `backend/src/entities/group-invite.entity.ts` — Email invites with token. Columns: id, groupId, email, token (unique), invitedBy, expiresAt, acceptedAt, createdAt
- `backend/src/groups/groups.dto.ts` — 8 DTOs with class-validator decorators: CreateGroupDto, UpdateGroupDto, SplitEntryDto, AddGroupExpenseDto, CreateSettlementDto, JoinGroupDto, AddMembersDto, CreateInviteDto
- `backend/src/groups/split-calculation.service.ts` — Pure logic service: calculateEqualSplit (rounding remainder to payer), validateExactSplit, calculatePercentageSplit, simplifyDebts (greedy matching algorithm)

**Modified files:**
- `backend/src/entities/expense-group.entity.ts` — Added description, baseCurrency (default 'USD'), inviteCode (unique). Removed memberIds simple-array. Added OneToMany → GroupMember, GroupSettlement
- `backend/src/entities/group-expense.entity.ts` — Removed expenseId FK to personal Expense. Renamed userId → paidBy. Added splitType enum (EQUAL/EXACT/PERCENTAGE), payer ManyToOne → User, splits OneToMany → GroupExpenseSplit (cascade: true)
- `backend/src/entities/user.entity.ts` — Fixed createdGroups inverse relation from `group.createdBy` to `group.creator`
- `backend/src/database/database.module.ts` — Consolidated all entities into single ALL_ENTITIES array. Registered 4 new entities + fixed missing entities in 3rd config block
- `backend/src/currency/currency.service.ts` — Added in-memory FX rate cache with 1-hour TTL. Added getRatesForBase() for batch rate lookup
- `shared/types.ts` — Added SplitType enum, GroupMember, GroupExpenseSplit, GroupSettlement, GroupInvite, SimplifiedDebt, GroupBalance interfaces. Updated ExpenseGroup and GroupExpense interfaces

### 24. GroupsScreen slow load — Fixed broken query, removed eager loading, optimized subscription check
**Files:**
- `backend/src/groups/groups.service.ts`
- `backend/src/subscriptions/subscriptions.service.ts`

**Fix 1 — Broken MongoDB-style query (groups.service.ts `findAll`)**
- Replaced `{ memberIds: { $contains: [userId] } as any }` (MongoDB syntax, invalid on SQL databases) with a `QueryBuilder` using `LIKE` to search the `simple-array` column
- Added `orderBy('group.updatedAt', 'DESC')` so newest groups appear first

**Fix 2 — Eager loading of all expenses (groups.service.ts `findAll` + `findOne`)**
- Removed `'expenses'` from `relations` in both `findAll` and `findOne` — loading every `GroupExpense` row is unnecessary for listing groups or checking membership
- `findAll` now only joins `creator`; `findOne` only joins `creator`
- Expenses are still loaded on demand via `getGroupExpenses()`

**Fix 3 — Redundant DB query in subscription check (subscriptions.service.ts `checkSubscriptionStatus`)**
- Removed separate `usersRepository.findOne()` call — `findOne()` already loads the `user` relation
- Now uses `subscription.user` directly, eliminating one database round-trip per status check

### 23. GroupsScreen — Cancel button restyled as text-only link
**File:** `mobile/src/screens/GroupsScreen.tsx`
- Replaced `BlurView`-wrapped Cancel button with a plain text-only link (common iOS pattern)
- Removed `BlurView`, background color, border, `minWidth`, and `overflow: 'hidden'` from the Cancel button
- Set text color to `ACCENT_LIGHT` (`#8B2FC9`) for clear visibility on both dark and light backgrounds
- Changed `fontWeight` from `'700'` to `'400'` for a lighter, link-style appearance
- Increased `fontSize` from 15 to 16
- Root cause: the `BlurView` Cancel button was rendering as a barely-visible gray box on dark backgrounds despite previous intensity/contrast tweaks

### 22. GroupsScreen — Cancel button visibility improvement
**File:** `mobile/src/screens/GroupsScreen.tsx`
- Increased `BlurView` intensity from 30 to 50 (dark) / 40 (light) for better visibility
- Added explicit background color: `rgba(255, 255, 255, 0.15)` (dark) / `rgba(0, 0, 0, 0.08)` (light)
- Enhanced border color contrast: `rgba(255, 255, 255, 0.3)` (dark) / `rgba(0, 0, 0, 0.2)` (light)
- Changed text color to pure white/black instead of theme-dependent `colors.text` for maximum contrast
- Increased `paddingVertical` from 8 to 10
- Increased `fontSize` from 14 to 15
- Increased `fontWeight` from 600 to 700
- Added `minWidth: 70` to ensure button is always wide enough
- Root cause: Cancel button in Create Group modal was barely visible due to low contrast and subtle styling

### 21. All Entities — Decimal column precision increase for high-rate currencies (LBP fix)
**Files:**
- `backend/src/entities/expense.entity.ts` — `amount`, `convertedAmount`
- `backend/src/entities/budget.entity.ts` — `amount`
- `backend/src/entities/bill.entity.ts` — `amount`
- `backend/src/entities/wallet.entity.ts` — `balance`
- `backend/src/entities/group-expense.entity.ts` — `amount`
- `backend/src/entities/payment.entity.ts` — `amount`
- `backend/src/entities/template.entity.ts` — `amount`
- `backend/src/entities/challenge.entity.ts` — `targetAmount`, `currentProgress`
- `backend/src/entities/category.entity.ts` — `budgetLimit`
- Changed all `decimal` columns from `precision: 10, scale: 2` to `precision: 18, scale: 2`
- Root cause: currencies with high exchange rates (e.g. LBP ~89,500 per 1 USD) produced converted amounts exceeding the 10-digit limit (max 99,999,999.99), causing `numeric field overflow` errors in the database
- The conversion was working correctly but the DB rejected the result, so `convertedAmount` was never saved and the UI fell back to showing the original USD amount with just the LBP symbol
- New limit: up to 9,999,999,999,999,999.99 — sufficient for all supported currencies

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
