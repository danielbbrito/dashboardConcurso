"use client";

import { Bar, BarChart, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyHoursPoint, WeeklyHoursPoint } from "@/lib/domain";
import { formatDate, formatDecimalHours } from "@/lib/format";

export function HoursAnalyticsChart({ daily, weekly }: { daily: DailyHoursPoint[]; weekly: WeeklyHoursPoint[] }) {
  const dailyData = daily.map((row) => ({ ...row, label: formatDate(row.data) }));
  return <div className="row g-3 mb-4"><div className="col-12"><div className="card border-0 shadow-sm"><div className="card-body"><h2 className="h5">Progressão diária</h2><p className="small text-secondary">Barras mostram horas do dia; a linha mostra o acumulado.</p><ResponsiveContainer height={280} width="100%"><ComposedChart data={dailyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(value) => formatDecimalHours(Number(value))} /><Bar dataKey="hours" fill="#195da8" name="Horas" /><Line dataKey="hoursAccumulated" stroke="#10283f" name="Acumulado" /></ComposedChart></ResponsiveContainer></div></div></div><div className="col-12"><div className="card border-0 shadow-sm"><div className="card-body"><h2 className="h5">Resumo semanal</h2><div className="table-responsive"><table className="table"><thead><tr><th scope="col">Semana</th><th scope="col">Horas</th><th scope="col">Dias ativos</th><th scope="col">Média/dia</th></tr></thead><tbody>{weekly.map((row) => <tr key={row.weekStart}><td>{formatDate(row.weekStart)} a {formatDate(row.weekEnd)}</td><td>{formatDecimalHours(row.hours)}</td><td>{row.activeDays}</td><td>{formatDecimalHours(row.averagePerDay)}</td></tr>)}</tbody></table></div></div></div></div></div>;
}
