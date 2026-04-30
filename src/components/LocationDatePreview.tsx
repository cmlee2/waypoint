'use client';

import React from 'react';
import { DateAnalysisResult } from '@/utils/photoDateAnalyzer';
import { Calendar } from 'lucide-react';

interface LocationDatePreviewProps {
  dateAnalysis: DateAnalysisResult;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  userHasEdited: boolean;
}

export default function LocationDatePreview({
  dateAnalysis,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  userHasEdited,
}: LocationDatePreviewProps) {
  const showAutoDetectedInfo = dateAnalysis.hasDates && !userHasEdited;

  const handleStartDateChange = (value: string) => {
    onStartDateChange(value);
  };

  const handleEndDateChange = (value: string) => {
    onEndDateChange(value);
  };

  return (
    <div className="space-y-3">
      {showAutoDetectedInfo && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-blue-600" />
            <p className="text-sm font-medium text-blue-900">
              📅 Detected from photos: {' '}
              <span className="font-semibold">
                {dateAnalysis.dateRange
                  ? dateAnalysis.formattedRange
                  : dateAnalysis.formattedSingleDate}
              </span>
            </p>
          </div>
          <p className="mt-1 text-xs text-blue-700">
            {dateAnalysis.dateCount} of {dateAnalysis.dateCount} photos have date metadata
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={14} /> Start Date
          </label>
          <input
            type="date"
            className="w-full bg-stone-50 border-stone-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-stone-400 transition-all"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={14} /> End Date
          </label>
          <input
            type="date"
            className="w-full bg-stone-50 border-stone-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-stone-400 transition-all"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
          />
        </div>
      </div>

      {!!startDate && !!endDate && (
        <div className="rounded-lg bg-stone-100 p-3">
          <p className="text-sm text-stone-600">
            Trip duration: <span className="font-medium">{calculateDuration(startDate, endDate)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function calculateDuration(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return '';

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

  // Ensure start is before end
  const actualStart = start < end ? start : end;
  const actualEnd = start < end ? end : start;

  const diffTime = Math.abs(actualEnd.getTime() - actualStart.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Same day';
  } else if (diffDays === 1) {
    return '1 day';
  } else {
    return `${diffDays + 1} days`;
  }
}
