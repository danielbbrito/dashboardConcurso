"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/query-states";
import type { DailySeriesPoint } from "@/lib/domain";
import type { TopicAggregateRow } from "@/lib/db/repository";

const DisciplineCharts = dynamic(() => import("./discipline-charts").then((module) => module.DisciplineCharts), { ssr: false, loading: () => <ChartSkeleton /> });

export function DisciplineChartsLoader({ evolution, topics }: { evolution: DailySeriesPoint[]; topics: TopicAggregateRow[] }) { return <DisciplineCharts evolution={evolution} topics={topics} />; }
