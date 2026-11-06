"use client";

import { Bar, BarChart, CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, ResponsiveContainer } from "recharts";

import { formatPercent } from "@/lib/format";
import type { DifficultyAggregateRow, TopicAggregateRow } from "@/lib/db/repository";

export function TopicAnalyticsCharts({ difficulty, topics }: { difficulty: DifficultyAggregateRow[]; topics: TopicAggregateRow[] }) {
  const topicPoints = topics.map((row) => ({ x: row.averageDifficulty ?? 0, y: row.attempted > 0 ? row.correct / row.attempted : 0, z: row.attempted, label: row.topic }));
  const difficultyBars = difficulty.map((row) => ({ ...row, label: row.difficulty, accuracy: row.accuracy ?? 0 }));
  return <div className="row g-3 mb-4"><div className="col-12 col-xl-6"><div className="card border-0 shadow-sm"><div className="card-body"><h2 className="h5">Dificuldade média x acurácia</h2><p className="small text-secondary">Cada ponto representa uma matéria; o tamanho indica o volume de questões.</p><ResponsiveContainer height={280} width="100%"><ScatterChart><CartesianGrid /><XAxis dataKey="x" domain={[1, 4]} name="Dificuldade" type="number" /><YAxis dataKey="y" domain={[0, 1]} name="Acurácia" tickFormatter={(value) => `${Math.round(value * 100)}%`} type="number" /><ZAxis dataKey="z" range={[50, 400]} type="number" /><Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value, name) => name === "y" ? formatPercent(Number(value)) : value} /><Scatter data={topicPoints} fill="#195da8" name="Matérias" /></ScatterChart></ResponsiveContainer></div></div></div><div className="col-12 col-xl-6"><div className="card border-0 shadow-sm"><div className="card-body"><h2 className="h5">Acurácia por dificuldade</h2><ResponsiveContainer height={280} width="100%"><BarChart data={difficultyBars}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis domain={[0, 1]} tickFormatter={(value) => `${Math.round(value * 100)}%`} /><Tooltip formatter={(value) => formatPercent(Number(value))} /><Bar dataKey="accuracy" fill="#195da8" name="Acurácia" /></BarChart></ResponsiveContainer></div></div></div></div>;
}
