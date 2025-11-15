import { AppColors } from '@/constants/theme';
import { PainCheckIn } from '@/types';
import { format } from 'date-fns';
import { useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

type TimeRange = '7' | '30' | '90' | 'all';

interface PainProgressChartProps {
  painHistory: PainCheckIn[];
  maxDays?: number;
}

export default function PainProgressChart({ painHistory, maxDays = 100 }: PainProgressChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30');

  // Get days to display based on selected range
  const getDaysToDisplay = (): number => {
    switch (timeRange) {
      case '7':
        return 7;
      case '30':
        return 30;
      case '90':
        return 90;
      case 'all':
        return Math.min(painHistory.length, maxDays);
      default:
        return 30;
    }
  };

  const daysToDisplay = getDaysToDisplay();

  // Filter and prepare data
  const prepareChartData = () => {
    if (painHistory.length === 0) {
      return {
        labels: [],
        data: [],
        displayLabels: [],
      };
    }

    // Sort by date ascending (oldest first)
    const sortedHistory = [...painHistory]
      .sort((a, b) => new Date(a.check_in_date).getTime() - new Date(b.check_in_date).getTime())
      .slice(-daysToDisplay); // Take last N days

    // For longer ranges (90+ days), aggregate by week
    if (daysToDisplay >= 90) {
      const weeklyData: { [key: string]: { sum: number; count: number } } = {};

      sortedHistory.forEach((checkIn) => {
        const date = new Date(checkIn.check_in_date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { sum: 0, count: 0 };
        }
        weeklyData[weekKey].sum += checkIn.pain_level;
        weeklyData[weekKey].count += 1;
      });

      const weeks = Object.keys(weeklyData).sort();
      const data = weeks.map((week) => weeklyData[week].sum / weeklyData[week].count);
      const displayLabels = weeks.map((week) => format(new Date(week), 'M/d'));

      // Create simplified labels for x-axis (show every 4th week)
      const labels = weeks.map((_, i) => (i % 4 === 0 ? '' : ''));

      return { labels, data, displayLabels };
    }

    // For shorter ranges, show daily data
    const data = sortedHistory.map((c) => c.pain_level);
    const dates = sortedHistory.map((c) => new Date(c.check_in_date));

    // Create display labels (full dates for tooltip)
    const displayLabels = dates.map((d) => format(d, 'MMM d'));

    // Create simplified labels for x-axis
    let labelInterval: number;
    if (daysToDisplay <= 7) {
      labelInterval = 1; // Show every day
    } else if (daysToDisplay <= 30) {
      labelInterval = 7; // Show weekly
    } else {
      labelInterval = 14; // Show bi-weekly
    }

    const labels = dates.map((d, i) => {
      if (i % labelInterval === 0 || i === dates.length - 1) {
        return format(d, 'M/d');
      }
      return '';
    });

    return { labels, data, displayLabels };
  };

  const { labels, data, displayLabels } = prepareChartData();

  // Debug logging
  console.log('Pain Chart Data:', {
    dataPoints: data,
    labels,
    painHistoryCount: painHistory.length
  });

  if (painHistory.length === 0 || data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Check in daily to see your pain trends</Text>
        </View>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.max(screenWidth - 64, data.length * 40);
  const isScrollable = chartWidth > screenWidth - 64;

  return (
    <View style={styles.container}>
      {/* Time Range Selector */}
      <View style={styles.timeRangeSelector} pointerEvents="box-none">
        <TimeRangeButton
          label="7D"
          selected={timeRange === '7'}
          onPress={() => setTimeRange('7')}
          disabled={painHistory.length < 7}
          daysNeeded={7}
          currentDays={painHistory.length}
        />
        <TimeRangeButton
          label="30D"
          selected={timeRange === '30'}
          onPress={() => setTimeRange('30')}
          disabled={painHistory.length < 30}
          daysNeeded={30}
          currentDays={painHistory.length}
        />
        <TimeRangeButton
          label="90D"
          selected={timeRange === '90'}
          onPress={() => setTimeRange('90')}
          disabled={painHistory.length < 90}
          daysNeeded={90}
          currentDays={painHistory.length}
        />
        <TimeRangeButton
          label="All"
          selected={timeRange === 'all'}
          onPress={() => setTimeRange('all')}
        />
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={isScrollable}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          <LineChart
          data={{
            labels,
            datasets: [
              {
                data,
                color: (opacity = 1) => AppColors.primary,
                strokeWidth: 3,
              },
              // Min/max anchor points for consistent scale
              {
                data: [0],
                withDots: false,
                strokeWidth: 0,
              },
              {
                data: [10],
                withDots: false,
                strokeWidth: 0,
              },
            ],
          }}
          width={chartWidth}
          height={220}
          yAxisSuffix=""
          yAxisInterval={1}
          fromZero
          formatYLabel={(value) => {
            // Ensure Y-axis shows correct values 0-10
            return Math.round(Number(value)).toString();
          }}
          chartConfig={{
            backgroundColor: AppColors.surfaceSecondary,
            backgroundGradientFrom: AppColors.surfaceSecondary,
            backgroundGradientTo: AppColors.surfaceSecondary,
            decimalPlaces: 0,
            color: (opacity = 1) => AppColors.primary,
            labelColor: (opacity = 1) => AppColors.textSecondary,
            propsForVerticalLabels: {
              fontSize: 10,
              fontWeight: '600',
            },
            propsForHorizontalLabels: {
              fontSize: 9,
              fontWeight: '500',
            },
            propsForDots: {
              r: '5',
              strokeWidth: '2',
              stroke: AppColors.primary,
              fill: AppColors.surface,
            },
            propsForBackgroundLines: {
              strokeDasharray: '5,5',
              stroke: AppColors.border,
              strokeOpacity: 0.2,
              strokeWidth: 1,
            },
            fillShadowGradientFrom: AppColors.primary,
            fillShadowGradientFromOpacity: 0.25,
            fillShadowGradientTo: AppColors.primary,
            fillShadowGradientToOpacity: 0.05,
          }}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          withDots={data.length <= 30}
          segments={5}
          yLabelsOffset={10}
        />
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>
          {daysToDisplay >= 90 ? 'Weekly Average Pain Level' : 'Daily Pain Level'} (0-10 scale)
        </Text>
      </View>
    </View>
  );
}

function TimeRangeButton({
  label,
  selected,
  onPress,
  disabled = false,
  daysNeeded,
  currentDays,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  daysNeeded?: number;
  currentDays?: number;
}) {
  const handlePress = () => {
    if (disabled && daysNeeded && currentDays !== undefined) {
      const daysRemaining = daysNeeded - currentDays;
      const dayWord = daysRemaining === 1 ? 'day' : 'days';

      Alert.alert(
        'Not Enough Data Yet',
        `You need ${daysRemaining} more ${dayWord} of check-ins to unlock the ${label} view.\n\nKeep checking in daily to track your progress over time!`,
        [{ text: 'Got it', style: 'default' }]
      );
    } else if (!disabled) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.timeRangeButton,
        selected && styles.timeRangeButtonSelected,
        disabled && styles.timeRangeButtonDisabled,
      ]}
      onPress={handlePress}
      disabled={false} // Always allow press to show alert
      activeOpacity={0.6}
      hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
    >
      <Text
        style={[
          styles.timeRangeButtonText,
          selected && styles.timeRangeButtonTextSelected,
          disabled && styles.timeRangeButtonTextDisabled,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: AppColors.surface,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeRangeButtonSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  timeRangeButtonDisabled: {
    opacity: 0.4,
  },
  timeRangeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  timeRangeButtonTextSelected: {
    color: AppColors.textPrimary,
  },
  timeRangeButtonTextDisabled: {
    color: AppColors.textTertiary,
  },
  chartContainer: {
    paddingTop: 5,
    paddingBottom: 8,
  },
  scrollView: {
    marginHorizontal: 0,
  },
  scrollContent: {
    paddingRight: 20,
  },
  chart: {
    borderRadius: 16,
    marginLeft: 16,
    paddingRight: 16,
    marginVertical: 8,
  },
  legend: {
    marginTop: 12,
    alignItems: 'center',
  },
  legendText: {
    fontSize: 11,
    color: AppColors.textTertiary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  emptyText: {
    fontSize: 13,
    color: AppColors.textTertiary,
    fontStyle: 'italic',
  },
});
