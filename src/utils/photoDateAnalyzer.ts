export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateAnalysisResult {
  hasDates: boolean;
  dateCount: number;
  dateRange?: DateRange;
  formattedRange?: string;
  singleDate?: Date;
  formattedSingleDate?: string;
}

/**
 * Analyzes a list of photos to detect the date range
 * Extracts dates from photo metadata and determines the trip date range
 */
export function analyzePhotoDates(photos: any[]): DateAnalysisResult {
  if (!photos || photos.length === 0) {
    return {
      hasDates: false,
      dateCount: 0,
    };
  }

  // Extract all valid dates from photos
  const validDates = photos
    .map((photo) => {
      if (photo.takenAt && photo.takenAt instanceof Date && !isNaN(photo.takenAt.getTime())) {
        return photo.takenAt;
      }
      return undefined;
    })
    .filter((date): date is Date => date !== undefined);

  if (validDates.length === 0) {
    return {
      hasDates: false,
      dateCount: 0,
    };
  }

  // Sort dates to find min and max
  validDates.sort((a, b) => a.getTime() - b.getTime());
  const minDate = validDates[0];
  const maxDate = validDates[validDates.length - 1];

  const result: DateAnalysisResult = {
    hasDates: true,
    dateCount: validDates.length,
  };

  // Check if all dates are the same day
  const isSameDay = minDate.toDateString() === maxDate.toDateString();

  if (isSameDay) {
    // Single day trip
    result.singleDate = minDate;
    result.formattedSingleDate = formatDate(minDate);
  } else {
    // Multi-day trip
    result.dateRange = {
      startDate: minDate,
      endDate: maxDate,
    };
    result.formattedRange = formatDateRange(minDate, maxDate);
  }

  return result;
}

/**
 * Formats a single date in a user-friendly format
 * Example: April 13, 2025
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a date range in a user-friendly format
 * Examples:
 * - April 13-20, 2025 (same month)
 * - April 13 - May 10, 2025 (different months, same year)
 * - Dec 30, 2024 - Jan 5, 2025 (different years)
 */
function formatDateRange(startDate: Date, endDate: Date): string {
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (startYear !== endYear) {
    // Different years: Dec 30, 2024 - Jan 5, 2025
    return `${startMonth} ${startDate.getDate()}, ${startYear} - ${endMonth} ${endDate.getDate()}, ${endYear}`;
  } else if (startMonth !== endMonth) {
    // Different months, same year: April 13 - May 10, 2025
    return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${startYear}`;
  } else {
    // Same month: April 13-20, 2025
    return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${startYear}`;
  }
}
