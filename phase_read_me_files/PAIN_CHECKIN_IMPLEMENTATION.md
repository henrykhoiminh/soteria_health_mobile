# Pain Check-In System Implementation Guide

## ✅ Completed Implementation

### 1. Database Setup (SQL Migration)
**File:** `sql/pain_checkins.sql`

Execute this SQL migration in your Supabase SQL Editor to:
- Create `pain_checkins` table with proper schema
- Add indexes for performance
- Set up Row Level Security (RLS) policies
- Create helper functions:
  - `get_todays_pain_checkin()` - Get today's check-in
  - `get_pain_checkin_history()` - Get historical check-ins
  - `get_pain_statistics()` - Calculate pain trends and stats

**To Run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `sql/pain_checkins.sql`
3. Execute the migration

### 2. TypeScript Types
**File:** `types/index.ts`

Added pain check-in types:
- `PainLocation` - Body part locations (Neck, Shoulders, etc.)
- `PainCheckIn` - Check-in data structure
- `PainTrend` - Trend analysis types
- `PainStatistics` - Statistics interface

### 3. Utility Functions
**File:** `lib/utils/pain-checkin.ts`

Implements all pain check-in logic:
- `hasCheckedInToday()` - Check if user completed today's check-in
- `getTodayCheckIn()` - Retrieve today's check-in data
- `submitPainCheckIn()` - Submit or update a check-in
- `getPainCheckInHistory()` - Get historical data (default 30 days)
- `getPainStatistics()` - Get calculated statistics
- `getPainLevelInfo()` - Get color/label for pain level
- `getEncouragementMessage()` - Get motivational message
- `getPainTrendInfo()` - Get trend description and icon

### 4. Modal Component
**File:** `components/PainCheckInModal.tsx`

Features:
- ✅ Cannot be dismissed without submitting
- ✅ Pain level slider (0-10) with color-coded labels
- ✅ Dynamic body part selector (shows only if pain > 0)
- ✅ Optional notes field
- ✅ Encouragement message after submission
- ✅ Auto-closes after 2 seconds
- ✅ Dark mode styling consistent with app

**Package Installed:** `@react-native-community/slider`

### 5. App Integration
**File:** `app/_layout.tsx`

The modal automatically appears:
- On first app open each day
- Only for authenticated users
- Only if they haven't checked in today
- After completing onboarding

## 📋 Remaining Tasks

### 6. Add Pain Tracking to Dashboard/Profile Screen

You need to add a Pain Tracking section to show:
- Current pain level
- Line chart showing pain trend (last 30 days)
- Trend indicator (↓ decreasing, → stable, ↑ increasing)
- Pain-free days count
- Average pain levels (7-day and 30-day)

**Suggested Location:** Add to `app/(tabs)/index.tsx` (Dashboard) or `app/(tabs)/profile.tsx`

**Example Implementation:**

```typescript
import { getPainCheckInHistory, getPainStatistics } from '@/lib/utils/pain-checkin'
import { PainCheckIn, PainStatistics } from '@/types'

// In your screen component:
const [painHistory, setPainHistory] = useState<PainCheckIn[]>([])
const [painStats, setPainStats] = useState<PainStatistics | null>(null)

useEffect(() => {
  async function loadPainData() {
    if (!user) return

    const history = await getPainCheckInHistory(user.id, 30)
    const stats = await getPainStatistics(user.id, 30)

    setPainHistory(history)
    setPainStats(stats)
  }

  loadPainData()
}, [user])

// In your JSX:
<View style={styles.painTrackingSection}>
  <Text style={styles.sectionTitle}>Pain Tracking</Text>

  {/* Current Pain Level */}
  <View style={styles.currentPainCard}>
    <Text style={styles.painNumber}>{painStats?.current_pain || 0}</Text>
    <Text style={styles.painLabel}>{getPainLevelInfo(painStats?.current_pain || 0).label}</Text>
  </View>

  {/* Trend Indicator */}
  {painStats && (
    <View style={styles.trendCard}>
      <Text style={styles.trendIcon}>{getPainTrendInfo(painStats.trend).icon}</Text>
      <Text style={styles.trendText}>{getPainTrendInfo(painStats.trend).description}</Text>
    </View>
  )}

  {/* Stats Grid */}
  <View style={styles.statsGrid}>
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{painStats?.avg_7_days.toFixed(1) || '0.0'}</Text>
      <Text style={styles.statLabel}>7-Day Avg</Text>
    </View>
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{painStats?.avg_30_days.toFixed(1) || '0.0'}</Text>
      <Text style={styles.statLabel}>30-Day Avg</Text>
    </View>
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{painStats?.pain_free_days || 0}</Text>
      <Text style={styles.statLabel}>Pain-Free Days</Text>
    </View>
  </View>

  {/* Line Chart - Use react-native-chart-kit or similar */}
  {/* Implementation depends on your preferred chart library */}
</View>
```

### Optional: Add Chart Library

For the line chart visualization, install a charting library:

```bash
npm install react-native-chart-kit react-native-svg
```

Or use `victory-native` for more advanced charts:

```bash
npm install victory-native
```

## 🎨 Design Specifications

### Pain Level Colors:
- 0: Green (`#34C759`) - Pain Free
- 1-3: Yellow (`#FFD60A`) - Mild
- 4-6: Orange (`#FF9500`) - Moderate
- 7-10: Red (`#FF3B30`) - Severe

### Encouragement Messages:
- 0-2: "Great job staying pain-free! Keep it up! 🎉"
- 3-5: "You're managing well. Keep up with your routines! 💪"
- 6-8: "We're here to help. Check out recovery routines for your pain areas."
- 9-10: "We recommend consulting a healthcare professional for severe pain."

### Trend Indicators:
- Decreasing: ↓ (Green) - Recent pain lower than previous week
- Stable: → (Yellow) - Pain levels consistent
- Increasing: ↑ (Red) - Recent pain higher than previous week
- Insufficient Data: — (Gray) - Not enough check-ins

## 🔧 Testing

1. **Run SQL Migration**: Execute `sql/pain_checkins.sql` in Supabase
2. **Test Modal**: Open app - modal should appear if not checked in today
3. **Test Submission**: Submit a check-in with different pain levels
4. **Test Persistence**: Close and reopen app - modal should not appear again today
5. **Test Tomorrow**: Change system date or wait until next day - modal should reappear

## 📱 User Flow

1. User opens app for first time that day
2. Pain Check-In modal appears (cannot be dismissed)
3. User moves slider to select pain level (0-10)
4. If pain > 0, user can optionally select affected body parts
5. User can optionally add notes
6. User taps "Submit Check-In"
7. Encouragement message appears for 2 seconds
8. Modal closes automatically
9. User proceeds to Dashboard
10. Dashboard shows pain tracking section with trends
11. Modal will not appear again until next day

## 🔐 Security

- ✅ Row Level Security (RLS) enabled
- ✅ Users can only see/modify their own check-ins
- ✅ One check-in per user per day (enforced by UNIQUE constraint)
- ✅ Pain level validation (0-10 range)
- ✅ All database operations use authenticated user ID

## 📊 Database Schema

```sql
pain_checkins (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  pain_level integer NOT NULL (0-10),
  pain_locations text[],
  notes text,
  check_in_date date NOT NULL,
  created_at timestamptz,
  updated_at timestamptz,
  UNIQUE(user_id, check_in_date)
)
```

## 🎯 Next Steps

1. Execute SQL migration in Supabase
2. Add Pain Tracking section to Dashboard or Profile screen
3. (Optional) Install and integrate chart library for trend visualization
4. Test the complete flow
5. Gather user feedback and iterate

## 💡 Future Enhancements

- Push notifications for missed check-ins
- Weekly/monthly pain reports
- Correlation between routines and pain reduction
- Export pain data as CSV/PDF
- Share progress with healthcare providers
- Pain location heat map visualization
- Medication tracking integration
