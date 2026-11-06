import { StudyHoursForm } from "@/components/study-hours-form";
import { StudyHoursHistory } from "@/components/study-hours-history";
import { requireAuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import { listStudyHours } from "@/lib/db/repository";
import { todayDateOnly, type UserId } from "@/lib/domain";
import { getServerEnv } from "@/lib/env";
import { parseFilters } from "@/lib/filters";
import { getHoursAnalytics } from "@/lib/hours-analytics";
import { HoursAnalyticsChart } from "@/components/hours-analytics-chart";

export default function StudyHoursPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { return <StudyHoursContent searchParams={searchParams} />; }

async function StudyHoursContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireAuthorizedUser();
  const userId = await ensureApplicationUser(user);
  const env = getServerEnv(); const today = todayDateOnly(env.timezone); const filters = parseFilters(await searchParams, today); const [history, analytics] = await Promise.all([listStudyHours(userId, { from: filters.from, to: filters.to }), getHoursAnalytics(userId, { from: filters.from, to: filters.to })]);
  return <section aria-labelledby="page-title"><div className="mb-4"><p className="mb-2 text-uppercase small fw-semibold text-primary">Tempo de estudo</p><h1 className="h2 mb-2" id="page-title">Horas de estudo</h1><p className="mb-0 text-secondary">Registre o tempo estudado e acompanhe a progressão.</p></div><div className="card border-0 shadow-sm mb-4"><div className="card-body"><StudyHoursForm today={today} /></div></div><div className="row g-3 mb-4"><Metric label="Total" value={analytics.kpis.total.toFixed(2).replace(".", ",") + " h"} /><Metric label="Dias ativos" value={String(analytics.kpis.activeDays)} /><Metric label="Média por dia" value={analytics.kpis.averagePerDay.toFixed(2).replace(".", ",") + " h"} /><Metric label="Média por semana" value={analytics.kpis.averagePerWeek.toFixed(2).replace(".", ",") + " h"} /></div>{analytics.daily.length > 0 ? <HoursAnalyticsChart daily={analytics.daily} weekly={analytics.weekly} /> : null}<StudyHoursHistory result={history} /></section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="col-6 col-xl-3"><div className="card border-0 shadow-sm"><div className="card-body"><p className="small text-secondary mb-2">{label}</p><strong className="fs-3">{value}</strong></div></div></div>; }
