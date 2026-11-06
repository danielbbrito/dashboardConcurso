import { StudiedTopicForm } from "@/components/studied-topic-form";
import { StudiedTopicHistory } from "@/components/studied-topic-history";
import { ReviewWeekNav } from "@/components/review-week-nav";
import { EmptyState } from "@/components/query-states";
import { requireAuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import { listDisciplines, listStudiedTopics } from "@/lib/db/repository";
import { todayDateOnly, isDateOnly } from "@/lib/domain";
import { getServerEnv } from "@/lib/env";
import { TOPIC_CATALOG } from "@/lib/catalog";
import { getReviewAgenda } from "@/lib/review-analytics";
import { startOfReviewWeek } from "@/lib/reviews";

export default function ReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { return <ReviewsContent searchParams={searchParams} />; }

async function ReviewsContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireAuthorizedUser(); const userId = await ensureApplicationUser(user); const env = getServerEnv(); const today = todayDateOnly(env.timezone); const params = await searchParams; const rawWeek = typeof params.week === "string" && isDateOnly(params.week) ? params.week : today; const week = startOfReviewWeek(rawWeek as import("@/lib/domain").DateOnly);
  const [disciplines, history, agenda] = await Promise.all([listDisciplines(), listStudiedTopics(userId), getReviewAgenda(userId, week)]);
  return <section aria-labelledby="page-title"><div className="mb-4"><p className="mb-2 text-uppercase small fw-semibold text-primary">Agenda de revisão</p><h1 className="h2 mb-2" id="page-title">Revisões</h1><p className="mb-0 text-secondary">Uma matéria estudada entre domingo e sábado aparece na revisão do sábado.</p></div><div className="card border-0 shadow-sm mb-4"><div className="card-body"><StudiedTopicForm catalog={TOPIC_CATALOG} disciplines={disciplines} today={today} /></div></div><section aria-labelledby="agenda-title" className="card border-0 shadow-sm mb-4"><div className="card-body"><h2 className="h5" id="agenda-title">Agenda semanal</h2><ReviewWeekNav week={agenda.week} />{agenda.items.length === 0 ? <EmptyState description="Registre uma matéria para preencher o sábado desta semana." title="Nenhuma revisão agendada" /> : <div className="list-group">{agenda.items.map((item) => <div className="list-group-item" key={item.id}><strong>{item.topic}</strong><span className="d-block small text-secondary">{item.disciplineName ?? "Disciplina"} · estudada em {item.studyDate}</span></div>)}</div>}</div></section><StudiedTopicHistory result={history} /></section>;
}
