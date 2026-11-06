"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/query-states";
import type { DailySeriesPoint, RankingRow, WeeklySeriesPoint } from "@/lib/domain";

const OverviewCharts = dynamic(() => import("./overview-charts"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export function OverviewChartsLoader({ daily, disciplinePerformance, weekly }: { daily: DailySeriesPoint[]; disciplinePerformance: RankingRow[]; weekly: WeeklySeriesPoint[] }) {
  return <OverviewCharts daily={daily} disciplinePerformance={disciplinePerformance} weekly={weekly} />;
}
