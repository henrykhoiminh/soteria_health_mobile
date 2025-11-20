# Claude AI Development Context

This file contains technical context, architectural decisions, and implementation details for AI-assisted development of the Soteria Health Mobile app.

## Project Overview

**Type:** React Native mobile app (Expo Router)
**Backend:** Supabase (PostgreSQL + Auth + Storage)
**Primary Users:** Individuals on wellness journeys (Injury Prevention or Recovery)
**Key Features:** Routine execution, custom routine builder, social features, health team system

---

## Current Architecture

### Tech Stack
- **Framework:** Expo Router (file-based routing)
- **Language:** TypeScript (strict mode)
- **UI:** React Native with StyleSheet
- **State:** React Context (AuthContext) + local useState
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Icons:** @expo/vector-icons (Ionicons)
- **Gestures:** react-native-gesture-handler (minimal usage after recent changes)

### Key Dependencies
```json
{
  "@supabase/supabase-js": "^2.x",
  "expo-router": "~6.x",
  "expo-image-picker": "latest",
  "@react-native-async-storage/async-storage": "latest",
  "@react-native-picker/picker": "latest",
  "@react-native-community/slider": "latest",
  "react-native-gesture-handler": "latest"
}
```

---

## File Structure

### Critical Files & Their Purposes

```
app/(tabs)/
├── index.tsx           # Dashboard - Today's progress, pain tracking, recommendations
├── routines.tsx        # Browse/search routines with filters
├── builder.tsx         # 4-step routine builder (Journey → Exercises → Metadata → Review)
└── profile.tsx         # User profile with settings and Reset Journey

app/(auth)/
├── login.tsx           # Login with logo
├── signup.tsx          # Sign up
├── verify-email.tsx    # Email verification
└── onboarding.tsx      # Multi-step onboarding (2-5 steps based on journey type)

app/routines/
├── [id].tsx            # Routine detail view
└── [id]/execute.tsx    # Routine execution with timer

components/
├── DraggableExerciseList.tsx    # Exercise cards with reorder/edit/delete (NO gestures)
├── JourneyBadge.tsx             # Journey type badge with icon
├── PainCheckInModal.tsx         # 3-step pain check-in modal
└── HealthTeamInvitationCard.tsx # Health team invitation UI

lib/
├── contexts/AuthContext.tsx     # Global auth + profile state
├── supabase/client.ts           # Supabase client config
└── utils/
    ├── auth.ts                  # Auth, profile, upload
    ├── dashboard.ts             # Dashboard data, recommendations
    ├── pain-checkin.ts          # Pain check-in logic
    ├── routine-builder.ts       # Builder utilities & validation
    └── health-team.ts           # Health team functions

sql/migrations/
├── add_health_team_system.sql           # Role system
├── add_health_team_invitations.sql      # Invitation system
├── add_health_team_stats.sql            # Stats tracking
├── add_leave_health_team_function.sql   # Leave/demote function
└── add_health_team_delete_policy.sql    # Delete RLS policy
```

---

## Recent Major Changes (Latest Session)

### 1. Routine Builder UX Overhaul

**Problem:** Navigation buttons were obstructing content, scroll gestures causing crashes

**Solution:**
- ✅ Removed `position: 'absolute'` from navigation buttons
- ✅ Navigation now part of normal flow at bottom of each step
- ✅ Removed swipe-to-delete gesture (was conflicting with ScrollView)
- ✅ Simplified to tap-based UI: clock icon (edit time) + trash icon (delete)
- ✅ Reorder mode with up/down arrow buttons (no drag-and-drop)
- ✅ Added exit button (X) in header with confirmation dialog
- ✅ Fixed Journey Focus cards to inline layout (icon + label on same line)

**Key Files Changed:**
- `app/(tabs)/builder.tsx` - Navigation positioning, exit flow
- `components/DraggableExerciseList.tsx` - Removed gestures, simplified UI

### 2. Health Team Delete Functionality

**Problem:** Health team members couldn't delete official routines due to RLS policy

**Solution:**
- ✅ Added delete confirmation dialog when editing official routines
- ✅ Created `handleDeleteRoutine()` function with error handling
- ✅ Created RLS policy migration: `add_health_team_delete_policy.sql`
- ✅ Policy allows health_team/admin to delete official routines
- ✅ Shows detailed error messages if delete fails

**Key Files Changed:**
- `app/(tabs)/builder.tsx` - Delete dialog and handler
- `sql/migrations/add_health_team_delete_policy.sql` - New RLS policy

### 3. Update Routine Functionality Fixed

**Problem:** Update button wasn't actually updating routines

**Solution:**
- ✅ Removed `.eq('created_by', userId)` constraint from update query
- ✅ Removed `.eq('is_custom', true)` constraint
- ✅ Allows health team to update ANY routine (RLS handles permissions)
- ✅ Regular users can still only update their own routines (via RLS)

**Key Files Changed:**
- `lib/utils/routine-builder.ts` - `updateCustomRoutine()` function

---

## Critical Implementation Patterns

### 1. Gesture Handling - AVOID COMPLEXITY

**❌ DON'T:**
- Use drag-and-drop gestures inside ScrollViews
- Use swipe gestures for critical actions
- Use `GestureDetector` with complex pan gestures
- Rely on `react-native-reanimated` for list interactions

**✅ DO:**
- Use simple tap buttons for all interactions
- Use up/down arrow buttons for reordering
- Keep gestures minimal and well-tested
- Test scroll behavior with 5+ items before committing

**Example - Exercise Card UI:**
```typescript
// Default mode: Show edit and delete buttons
{!reorderMode && isEditMode && (
  <>
    <TouchableOpacity onPress={() => onEdit(exercise)}>
      <Ionicons name="time-outline" size={28} />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => onRemove(exercise.id)}>
      <Ionicons name="trash-outline" size={24} />
    </TouchableOpacity>
  </>
)}

// Reorder mode: Show up/down arrows
{reorderMode && (
  <View style={styles.reorderButtons}>
    <TouchableOpacity onPress={onMoveUp} disabled={index === 0}>
      <Ionicons name="chevron-up" size={28} />
    </TouchableOpacity>
    <TouchableOpacity onPress={onMoveDown} disabled={index === totalCount - 1}>
      <Ionicons name="chevron-down" size={28} />
    </TouchableOpacity>
  </View>
)}
```

### 2. Navigation in ScrollViews

**❌ DON'T:**
- Use `position: 'absolute'` for navigation inside ScrollView content
- Use fixed positioning that overlaps scrollable content
- Rely on `paddingBottom` alone to prevent obstruction

**✅ DO:**
- Place navigation buttons as normal children in the flow
- Use `marginTop` and `paddingTop` for spacing
- Add `borderTopWidth` for visual separation
- Let content scroll naturally with navigation at bottom

**Example - Step Navigation:**
```typescript
<View style={styles.stepContainer}>
  {/* Content here */}

  {/* Navigation as normal child */}
  <View style={styles.stepNavigation}>
    <TouchableOpacity style={styles.backButton} onPress={onBack}>
      <Ionicons name="arrow-back" size={20} />
      <Text>Back</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.nextButton} onPress={onNext}>
      <Text>Next</Text>
      <Ionicons name="arrow-forward" size={20} />
    </TouchableOpacity>
  </View>
</View>

// Styles
stepNavigation: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 16,
  marginTop: 24,        // Spacing from content
  paddingTop: 16,       // Internal padding
  borderTopWidth: 1,    // Visual separator
  borderTopColor: AppColors.borderLight,
  // NO position: 'absolute'
}
```

### 3. Health Team Permissions

**Database Functions Always Check Roles:**
```sql
-- Example pattern
CREATE OR REPLACE FUNCTION some_function()
RETURNS ... AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Always get user role first
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = auth.uid();

  -- Check authorization
  IF v_user_role NOT IN ('health_team', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Proceed with operation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**TypeScript Always Checks Before Showing UI:**
```typescript
const [isHealthTeam, setIsHealthTeam] = useState(false);

useEffect(() => {
  const checkHealthTeamStatus = async () => {
    if (!user) return;
    const healthTeamStatus = await isHealthTeamMember(user.id);
    setIsHealthTeam(healthTeamStatus);
  };
  checkHealthTeamStatus();
}, [user]);

// Conditionally show health team features
{isHealthTeam && (
  <TouchableOpacity onPress={handleCreateOfficialRoutine}>
    <Text>Create Official Routine</Text>
  </TouchableOpacity>
)}
```

### 4. Supabase Query Error Handling

**❌ DON'T:**
```typescript
// Bad - doesn't check for errors
await supabase.from('routines').delete().eq('id', routineId);
Alert.alert('Success', 'Deleted!');
```

**✅ DO:**
```typescript
// Good - checks error and count
const { error, count } = await supabase
  .from('routines')
  .delete({ count: 'exact' })
  .eq('id', routineId);

if (error) {
  console.error('Error:', error);
  Alert.alert('Error', error.message);
  return;
}

if (count === 0) {
  Alert.alert('Error', 'No routine was deleted. Check permissions.');
  return;
}

Alert.alert('Success', 'Routine deleted!');
```

### 5. Modal Confirmation Dialogs

**Standard Pattern for Destructive Actions:**
```typescript
const handleDelete = (id: string, name: string) => {
  Alert.alert(
    'Delete Routine?',  // Title
    `Are you sure you want to delete "${name}"? This cannot be undone.`,  // Message
    [
      { text: 'Cancel', style: 'cancel' },  // Safe option first
      {
        text: 'Delete',
        style: 'destructive',  // Red color
        onPress: async () => {
          // Perform delete operation
          try {
            setLoading(true);
            const { error, count } = await supabase
              .from('routines')
              .delete({ count: 'exact' })
              .eq('id', id);

            if (error || count === 0) {
              Alert.alert('Error', 'Failed to delete');
              return;
            }

            Alert.alert('Success', 'Deleted successfully');
            router.replace('/routines');
          } catch (error) {
            Alert.alert('Error', 'An error occurred');
          } finally {
            setLoading(false);
          }
        },
      },
    ]
  );
};
```

---

## Database Schema Reference

### Key Tables

**profiles**
- `id` (uuid, PK) - Links to auth.users
- `role` (text) - 'user' | 'health_team' | 'admin'
- `full_name`, `username`, `profile_picture_url`
- `journey_focus` (text) - 'Injury Prevention' | 'Recovery'
- `journey_started_at` (timestamptz)
- `recovery_area` (text), `recovery_notes` (text)
- `fitness_level` (text) - 'Beginner' | 'Intermediate' | 'Advanced'

**routines**
- `id` (uuid, PK)
- `name`, `description`
- `category` (text) - 'Mind' | 'Body' | 'Soul'
- `difficulty` (text) - 'Beginner' | 'Intermediate' | 'Advanced'
- `journey_focus` (text[]) - Array: ['Injury Prevention'] and/or ['Recovery']
- `exercises` (jsonb) - Array of exercise objects
- `is_custom` (boolean) - true for user-created
- `created_by` (uuid) - Creator user ID
- `author_type` (text) - 'official' | 'community' | null
- `tags` (text[]), `body_parts` (text[])
- `duration_minutes` (integer)

**health_team_invitations**
- `id` (uuid, PK)
- `inviter_id` (uuid) - Admin who sent invite
- `invitee_id` (uuid) - User being invited
- `status` (text) - 'pending' | 'accepted' | 'declined'
- `created_at`, `responded_at` (timestamptz)

**pain_checkins**
- `id` (uuid, PK)
- `user_id` (uuid)
- `check_in_date` (date)
- `pain_level` (integer) - 0-10
- `pain_locations` (text[]) - Body parts, Mind, Soul
- `notes` (text, optional)

### Important RLS Policies

**Routines - Delete Policy:**
```sql
-- Health team can delete official routines
-- Users can delete their own custom routines
CREATE POLICY "health_team_can_delete_official_routines"
ON routines FOR DELETE
USING (
  (author_type = 'official' AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('health_team', 'admin')
  ))
  OR
  (is_custom = true AND created_by = auth.uid())
);
```

**Routines - Update Policy:**
```sql
-- Health team can update official routines
-- Users can update their own custom routines
CREATE POLICY "health_team_can_update_official_routines"
ON routines FOR UPDATE
USING (
  (author_type = 'official' AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('health_team', 'admin')
  ))
  OR
  (is_custom = true AND created_by = auth.uid())
);
```

---

## Known Issues & Workarounds

### 1. Expo Metro Bundler Cache
**Issue:** Changes not reflecting, stale imports
**Fix:** `npm start -- --clear` or kill port 8081

### 2. TypeScript Unused Variable Warnings
**Issue:** `'variable' is declared but its value is never read`
**Fix:** These are just warnings, not errors. Can ignore or fix by removing unused imports/variables

### 3. Gesture Handler Conflicts
**Issue:** App crashes when scrolling with many items
**Fix:** Avoid complex gestures. Use simple TouchableOpacity buttons instead.

### 4. RLS Policy "No Rows Returned"
**Issue:** Query returns empty even though data exists
**Fix:** Check RLS policies. Use `count: 'exact'` to verify if delete/update affected rows.

---

## Testing Checklist

### Before Committing Routine Builder Changes:
- [ ] Test with 1 exercise (edge case)
- [ ] Test with 5+ exercises (scroll behavior)
- [ ] Test with 30 exercises (max limit)
- [ ] Test reorder mode with first and last items (boundary checks)
- [ ] Test edit duration modal
- [ ] Test delete confirmation
- [ ] Test exit confirmation (both creating and editing)
- [ ] Test Update button for existing routines
- [ ] Test as regular user AND health team member

### Before Committing Health Team Changes:
- [ ] Test invitation flow (send, accept, decline)
- [ ] Test creating official routine
- [ ] Test editing official routine
- [ ] Test deleting official routine
- [ ] Test RLS policies (try as regular user, should fail)
- [ ] Test leave health team (can't be last admin)
- [ ] Test stats display

---

## Common Commands

```bash
# Start with cache clear
npm start -- --clear

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Kill port 8081 (if stuck)
lsof -ti:8081 | xargs kill -9

# TypeScript check (no emit)
npx tsc --noEmit

# Check for diagnostics
# (Use mcp__ide__getDiagnostics tool)
```

---

## Migration Order (Database Setup)

**MUST RUN IN THIS ORDER:**

1. `database_migration_journey_enhancements.sql`
2. `database_migration_routine_search_tagging.sql`
3. `example_routine_tagging.sql` (optional)
4. `add_username_system.sql`
5. `social_migration/01_create_social_tables.sql`
6. `social_migration/add_circle_invitations.sql`
7. `social_migration/fix_friend_activity_rls.sql`
8. `social_migration/fix_circle_invitation_constraint.sql`
9. `social_migration/MASTER_FIX_infinite_recursion.sql` ⚠️ CRITICAL
10. `social_migration/fix_activity_feeds_separation.sql`
11. `social_migration/add_circle_routines_enhancements.sql`
12. `social_migration/update_circle_routine_completions_constraint.sql`
13. `social_migration/update_circle_routine_stats_to_total_completions.sql`
14. `social_migration/fix_circle_routines_delete_policy.sql`
15. `add_pain_checkins_table.sql`
16. `add_hard_reset_function.sql`
17. `migrations/add_health_team_system.sql`
18. `migrations/add_health_team_invitations.sql`
19. `migrations/add_health_team_stats.sql`
20. `migrations/add_leave_health_team_function.sql`
21. `migrations/add_health_team_delete_policy.sql` ⚠️ REQUIRED FOR DELETE

---

## Next Steps / Planned Features

### High Priority
- [ ] Test health team delete policy in production
- [ ] Add loading states to all async operations
- [ ] Improve error messages for RLS policy failures
- [ ] Add confirmation when leaving edit mode with unsaved changes

### Medium Priority
- [ ] Health team management UI (view members, send invitations)
- [ ] Health team stats dashboard
- [ ] Bulk operations for routines
- [ ] Routine versioning/history

### Low Priority
- [ ] Drag-and-drop reordering (only if gestures can be made reliable)
- [ ] Routine templates
- [ ] AI-powered routine recommendations
- [ ] Exercise preview videos

---

## Code Style & Conventions

### TypeScript
- Use strict mode
- Explicit return types for functions
- Interface over type for objects
- Null checks before accessing properties

### React Components
- Functional components only
- Hooks at top of component
- Early returns for loading/error states
- Destructure props in function signature

### Styling
- StyleSheet.create() for all styles
- Consistent spacing: 4, 8, 12, 16, 24, 32, 40
- Border radius: 8 (inputs), 12 (cards), 16 (badges)
- Use AppColors constants, never hardcoded colors

### Naming
- Components: PascalCase
- Files: PascalCase for components, camelCase for utils
- Functions: camelCase, descriptive verbs (handleSubmit, fetchData)
- Constants: UPPER_SNAKE_CASE
- Styles: camelCase (buttonContainer, primaryText)

---

## Debugging Tips

### App Crashes on Scroll
1. Check for gesture handlers in components
2. Remove any Animated.Value or pan gestures
3. Simplify to TouchableOpacity
4. Test with 10+ items

### Update/Delete Not Working
1. Check RLS policies in Supabase dashboard
2. Add `{ count: 'exact' }` to query
3. Log `error` and `count` from response
4. Verify user role in profiles table

### Navigation Buttons Obstructing Content
1. Remove `position: 'absolute'` from button container
2. Add buttons as normal child in component tree
3. Use `marginTop` for spacing, not `paddingBottom` on content
4. Test scroll behavior with long content

### Modal Not Showing
1. Check `visible` prop is true
2. Verify state is updating correctly
3. Use `transparent` and `animationType` props
4. Check z-index and positioning

---

## Important Notes for AI

1. **Always check for existing patterns** before implementing new ones
2. **Test gesture-heavy features** extensively before committing
3. **Never use position: absolute** for navigation inside ScrollViews
4. **Always add error handling** to Supabase queries
5. **Check RLS policies** when users report "permission denied" errors
6. **Use confirmation dialogs** for all destructive actions
7. **Keep UI simple** - tap buttons over complex gestures
8. **Reference this file** at the start of each session for context

---

## Session History Summary

### Session 1-15 (Prior Work)
- Initial app setup with authentication
- Journey focus system (Injury Prevention / Recovery)
- Pain check-in system for Recovery users
- Routine builder (basic version)
- Social features (friends, circles)
- Health team invitation system

### Session 16 (Latest - Routine Builder & Delete)
- Fixed navigation button positioning (removed absolute positioning)
- Removed swipe-to-delete gestures (causing crashes)
- Simplified exercise card UI (tap-based interactions)
- Added exit button with confirmation
- Fixed update routine functionality (removed constraints)
- Added delete official routine functionality
- Created health team delete RLS policy
- Updated README.md with latest changes
- Created this CLAUDE.md file

---

**Last Updated:** 2025-11-17
**Current Version:** Expo SDK 54, React Native 0.76+
