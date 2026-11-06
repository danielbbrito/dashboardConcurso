"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";

import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import type { DailySeriesPoint, RankingRow, WeeklySeriesPoint } from "@/lib/domain";

export default function OverviewCharts({ daily, disciplinePerformance, weekly }: { daily: DailySeriesPoint[]; disciplinePerformance: RankingRow[]; weekly: WeeklySeriesPoint[] }) {
  const dailyChart = daily.map((row) => ({ ...row, label: formatDate(row.data) }));
  const weeklyChart = weekly.map((row) => ({ ...row, label: formatDate(row.weekStart) }));
  const disciplineChart = disciplinePerformance.map((row) => ({ ...row, label: row.disciplineName }));
  return (
    <div className="row g-3">
      <div className="col-12">
        <ChartCard title="Evolução diária" summary={daily.length > 0 ? `${formatNumber(daily.at(-1)?.attemptedAccumulated ?? 0)} questões acumuladas; taxa acumulada de ${formatPercent(daily.at(-1)?.accumulatedAccuracy ?? null)}.` : "Sem pontos no período."}>
          <ResponsiveContainer height={280} width="100%"><ComposedChart data={dailyChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Legend /><Bar dataKey="attempted" fill="#195da8" name="Questões" /><Line dataKey="accumulatedAccuracy" dot={false} name="Taxa acumulada" stroke="#10283f" strokeWidth={2} yAxisId="right" /><YAxis orientation="right" domain={[0, 1]} tickFormatter={(value) => `${Math.round(value * 100)}%`} yAxisId="right" /></ComposedChart></ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="col-12 col-xl-6">
        <ChartCard title="Acurácia por semana" summary={weekly.length > 0 ? `${weekly.length} semanas no recorte selecionado.` : "Sem semanas no período."}>
          <ResponsiveContainer height={240} width="100%"><BarChart data={weeklyChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis domain={[0, 1]} tickFormatter={(value) => `${Math.round(value * 100)}%`} /><Tooltip formatter={(value) => formatPercent(Number(value))} /><Bar dataKey="accuracy" fill="#195da8" name="Acurácia" /></BarChart></ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="col-12 col-xl-6">
        <ChartCard title="Desempenho por disciplina" summary={disciplinePerformance.length > 0 ? `${disciplinePerformance.length} disciplinas com registros.` : "Sem disciplinas no período."}>
          <ResponsiveContainer height={240} width="100%"><BarChart data={disciplineChart} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis domain={[0, 1]} tickFormatter={(value) => `${Math.round(value * 100)}%`} type="number" /><YAxis dataKey="label" type="category" width={120} /><Tooltip formatter={(value) => formatPercent(Number(value))} /><Bar dataKey="accuracy" fill="#195da8" name="Acurácia" /></BarChart></ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="col-12"><ChartTable rows={disciplinePerformance} /></div>
    </div>
  );
}

function ChartCard({ children, summary, title }: { children: ReactNode; summary: string; title: string }) {
  return <article className="card border-0 shadow-sm"><div className="card-body"><h2 className="h5">{title}</h2><p className="small text-secondary">{summary}</p>{children}</div></article>;
}

function ChartTable({ rows }: { rows: RankingRow[] }) {
  if (rows.length === 0) return null;
  return <details className="card border-0 shadow-sm"><summary className="card-body fw-semibold">Ver dados do gráfico por disciplina</summary><div className="table-responsive px-3 pb-3"><table className="table table-sm"><thead><tr><th scope="col">Disciplina</th><th scope="col">Questões</th><th scope="col">Acurácia</th></tr></thead><tbody>{rows.map((row) => <tr key={row.disciplineId}><td>{row.disciplineName}</td><td>{formatNumber(row.attempted)}</td><td>{formatPercent(row.accuracy)}</td></tr>)}</tbody></table></div></details>;
}
