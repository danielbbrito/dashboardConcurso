import { FilterBar } from "@/components/filter-bar";
import { EmptyState } from "@/components/query-states";
import { ResponsiveDataTable } from "@/components/responsive-data-table";
import { TopicAnalyticsCharts } from "@/components/topic-analytics-charts";
import { TopicThresholdControl } from "@/components/topic-threshold-control";
import { requireAuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import { listDisciplines } from "@/lib/db/repository";
import { getServerEnv } from "@/lib/env";
import { parseFilters } from "@/lib/filters";
import { getTopicAnalytics } from "@/lib/topic-analytics";
import { formatNumber, formatPercent } from "@/lib/format";
import { todayDateOnly } from "@/lib/domain";

export default async function TopicsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireAuthorizedUser(); const env = getServerEnv(); const today = todayDateOnly(env.timezone); const filters = parseFilters(await searchParams, today); const userId = await ensureApplicationUser(user);
  const [disciplines, analytics] = await Promise.all([listDisciplines(), getTopicAnalytics(userId, filters)]);
  return <section aria-labelledby="page-title"><div className="mb-4"><p className="mb-2 text-uppercase small fw-semibold text-primary">Análise transversal</p><h1 className="h2 mb-2" id="page-title">Matérias</h1><p className="mb-0 text-secondary">Compare desempenho por matéria e dificuldade percebida.</p></div><FilterBar disciplines={disciplines} today={today} /><div className="row g-3 mb-4"><Metric label="Sessões com matéria" value={formatNumber(analytics.kpis.sessionsWithTopics)} /><Metric label="Questões com matéria" value={formatNumber(analytics.kpis.questionsWithTopics)} /><Metric label="Matérias distintas" value={formatNumber(analytics.kpis.distinctTopics)} /><Metric label="Acurácia com matéria" value={formatPercent(analytics.kpis.accuracy)} /></div>{analytics.allTopics.length === 0 ? <EmptyState actionHref="/registrar" actionLabel="Registrar sessão com matéria" description="Sessões sem matéria não entram nesta análise." title="Nenhuma matéria no período" /> : <><TopicAnalyticsCharts difficulty={analytics.difficulty} topics={analytics.allTopics} /><section className="card border-0 shadow-sm"><div className="card-body"><div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3"><div><h2 className="h5 mb-1">Desempenho por matéria</h2><p className="small text-secondary mb-0">Sessões sem matéria são excluídas. O limite ajuda a evitar conclusões com pouco volume.</p></div><TopicThresholdControl value={filters.minQuestions} /></div><ResponsiveDataTable ariaLabel="Tabela de desempenho por matéria" columns={[{ key: "topic", label: "Matéria", render: (row) => row.subtopic ? `${row.topic} / ${row.subtopic}` : row.topic }, { key: "sessions", label: "Sessões", render: (row) => formatNumber(row.sessions) }, { key: "attempted", label: "Questões", render: (row) => formatNumber(row.attempted) }, { key: "accuracy", label: "Acurácia", render: (row) => formatPercent(row.attempted > 0 ? row.correct / row.attempted : null) }, { key: "difficulty", label: "Dificuldade média", render: (row) => row.averageDifficulty?.toFixed(1) ?? "Indisponível" }]} rows={analytics.topics.map((row, index) => ({ ...row, id: `${row.topic}-${row.subtopic ?? index}` }))} /></div></section></>}</section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="col-6 col-xl-3"><div className="card border-0 shadow-sm"><div className="card-body"><p className="small text-secondary mb-2">{label}</p><strong className="fs-3">{value}</strong></div></div></div>; }
