import { notFound } from "next/navigation";

import { DisciplineChartsLoader } from "@/components/discipline-charts-loader";
import { DisciplineNoteEditor } from "@/components/discipline-note-editor";
import { FilterBar } from "@/components/filter-bar";
import { EmptyState } from "@/components/query-states";
import { ResponsiveDataTable } from "@/components/responsive-data-table";
import { requireAuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import { getDisciplineAnalytics } from "@/lib/discipline-analytics";
import { getDisciplineNote, listDisciplines } from "@/lib/db/repository";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { getServerEnv } from "@/lib/env";
import { parseFilters } from "@/lib/filters";
import { todayDateOnly, type DisciplineId } from "@/lib/domain";

export default async function DisciplineDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireAuthorizedUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const env = getServerEnv(); const today = todayDateOnly(env.timezone); const filters = parseFilters(await searchParams, today); const userId = await ensureApplicationUser(user);
  const [disciplines, analytics, note] = await Promise.all([listDisciplines(), getDisciplineAnalytics(userId, id as DisciplineId, filters), getDisciplineNote(userId, id as DisciplineId)]);
  if (!analytics) notFound();
  const { discipline, kpis, history, topics } = analytics;
  return <section aria-labelledby="page-title"><div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4"><div><p className="mb-2 text-uppercase small fw-semibold text-primary">Disciplina · {discipline.block}</p><h1 className="h2 mb-2" id="page-title">{discipline.name}</h1><p className="mb-0 text-secondary">{discipline.examItems} itens previstos no exame.</p></div><a className="btn btn-primary align-self-start" href="/registrar">Registrar questões</a></div><FilterBar disciplines={disciplines} today={today} /><div className="row g-3 mb-4"><Metric label="Questões" value={formatNumber(kpis.attempted)} /><Metric label="Acertos" value={formatNumber(kpis.correct)} /><Metric label="Taxa de acerto" value={formatPercent(kpis.accuracy)} /><Metric label="Taxa sem chute" value={formatPercent(kpis.safeAccuracy)} /></div>{kpis.attempted === 0 ? <EmptyState actionHref="/registrar" actionLabel="Registrar nesta disciplina" description="Não há sessões desta disciplina no filtro selecionado." title="Nenhum registro ainda" /> : <><div className="mb-4"><DisciplineChartsLoader evolution={analytics.evolution} topics={topics} /></div><section className="card border-0 shadow-sm mb-4"><div className="card-body"><h2 className="h5">Desempenho por matéria</h2><ResponsiveDataTable ariaLabel="Desempenho por matéria" columns={[{ key: "topic", label: "Matéria", render: (row) => row.subtopic ? `${row.topic} / ${row.subtopic}` : row.topic }, { key: "sessions", label: "Sessões", render: (row) => formatNumber(row.sessions) }, { key: "attempted", label: "Questões", render: (row) => formatNumber(row.attempted) }, { key: "accuracy", label: "Acurácia", render: (row) => formatPercent(row.attempted > 0 ? row.correct / row.attempted : null) }]} rows={topics.map((row, index) => ({ ...row, id: `${row.topic}-${row.subtopic ?? index}` }))} /></div></section><section className="card border-0 shadow-sm mb-4"><div className="card-body"><h2 className="h5">Histórico</h2><ResponsiveDataTable ariaLabel="Histórico da disciplina" columns={[{ key: "date", label: "Data", render: (row) => formatDate(row.studyDate) }, { key: "questions", label: "Questões", render: (row) => formatNumber(row.questionsAttempted) }, { key: "accuracy", label: "Taxa", render: (row) => formatPercent(row.correctAnswers / row.questionsAttempted) }]} rows={history.items} /></div></section></>}<DisciplineNoteEditor disciplineId={discipline.id} initialBody={note?.body ?? ""} /></section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="col-6 col-xl-3"><div className="card border-0 shadow-sm"><div className="card-body"><p className="small text-secondary mb-2">{label}</p><strong className="fs-3">{value}</strong></div></div></div>; }
