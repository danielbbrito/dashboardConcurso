"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatDate, formatPercent } from "@/lib/format";
import type { DailySeriesPoint } from "@/lib/domain";
import type { TopicAggregateRow } from "@/lib/db/repository";

export function DisciplineCharts({ evolution, topics }: { evolution: DailySeriesPoint[]; topics: TopicAggregateRow[] }) {
  const evolutionData = evolution.map((row) => ({ ...row, label: formatDate(row.data) }));
  const topicData = topics.map((row) => ({ ...row, label: row.subtopic ? `${row.topic} / ${row.subtopic}` : row.topic, accuracy: row.attempted > 0 ? row.correct / row.attempted : 0 }));
  return <div className="row g-3"><div className="col-12"><div className="card border-0 shadow-sm"><div className="card-body"><h2 className="h5">Evolução da disciplina</h2><p className="small text-secondary">Taxa acumulada e volume de questões por data.</p><ResponsiveContainer height={260} width="100%"><LineChart data={evolutionData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Line dataKey="attemptedAccumulated" name="Questões acumuladas" stroke="#195da8" /><Line dataKey="accumulatedAccuracy" name="Taxa acumulada" stroke="#10283f" yAxisId="right" /><YAxis domain={[0, 1]} orientation="right" yAxisId="right" /></LineChart></ResponsiveContainer></div></div></div><div className="col-12"><div className="card border-0 shadow-sm"><div className="card-body"><h2 className="h5">Desempenho por matéria</h2><ResponsiveContainer height={280} width="100%"><BarChart data={topicData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis domain={[0, 1]} tickFormatter={(value) => `${Math.round(value * 100)}%`} type="number" /><YAxis dataKey="label" type="category" width={180} /><Tooltip formatter={(value) => formatPercent(Number(value))} /><Bar dataKey="accuracy" fill="#195da8" name="Acurácia" /></BarChart></ResponsiveContainer></div></div></div></div>;
}
