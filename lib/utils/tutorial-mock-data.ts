// Mock data for dashboard tutorial during onboarding
// Shows an "ideal" dashboard state to help users understand the app

export const TUTORIAL_MOCK_DATA = {
  // Avatar states showing different light levels
  avatarStates: [
    {
      category: 'Mind' as const,
      lightState: 'Glowing' as const,
      name: 'Mind',
      hoursUntilDormant: 36,
    },
    {
      category: 'Body' as const,
      lightState: 'Awakening' as const,
      name: 'Body',
      hoursUntilDormant: 24,
    },
    {
      category: 'Soul' as const,
      lightState: 'Sleepy' as const,
      name: 'Soul',
      hoursUntilDormant: 12,
    },
  ],

  // Harmony status showing progress toward harmony
  harmonyStatus: {
    isInHarmony: false,
    consecutiveBalancedDays: 3,
    daysUntilHarmony: 4,
    mindToday: 1,
    bodyToday: 0,
    soulToday: 0,
    isTodayBalanced: false,
    // 7-day history for visual display
    dailyHistory: [
      { date: '2024-01-01', mind: 1, body: 1, soul: 1, isBalanced: true },
      { date: '2024-01-02', mind: 2, body: 1, soul: 1, isBalanced: true },
      { date: '2024-01-03', mind: 1, body: 2, soul: 1, isBalanced: true },
      { date: '2024-01-04', mind: 1, body: 0, soul: 0, isBalanced: false },
      { date: '2024-01-05', mind: 0, body: 0, soul: 0, isBalanced: false },
      { date: '2024-01-06', mind: 0, body: 0, soul: 0, isBalanced: false },
      { date: '2024-01-07', mind: 1, body: 0, soul: 0, isBalanced: false },
    ],
  },

  // Stats showing some progress
  stats: {
    current_streak: 5,
    longest_streak: 12,
    total_routines: 24,
    harmony_streak: 0,
  },
};

// Light state colors for reference
export const LIGHT_STATE_COLORS = {
  Dormant: '#4B5563',    // Gray
  Sleepy: '#6B7280',     // Light gray
  Awakening: '#FCD34D',  // Yellow
  Glowing: '#FBBF24',    // Gold
  Radiant: '#F59E0B',    // Bright gold
};

// Category colors
export const CATEGORY_COLORS = {
  Mind: '#3B82F6',  // Blue
  Body: '#EF4444',  // Red
  Soul: '#F59E0B',  // Amber/Gold
};
