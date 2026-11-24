import { listDisciplines } from "@/lib/db/repository";
import { requireAuthorizedUser } from "@/lib/authorization";
import { formatNumber, formatPercent } from "@/lib/format";
import { getServerEnv } from "@/lib/env";
import { parseFilters } from "@/lib/filters";
import { getOverviewData } from "@/lib/overview";
import { todayDateOnly } from "@/lib/domain";
import { ensureApplicationUser } from "@/lib/application-user";
import { FilterBar } from "@/components/filter-bar";
import { EmptyState } from "@/components/query-states";
import { OverviewChartsLoader } from "@/components/overview-charts-loader";
import { RankingControls } from "@/components/ranking-controls";
import { ComparisonSection } from "@/components/comparison-section";
import { ResponsiveDataTable } from "@/components/responsive-data-table";

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-6 col-xl-3">
      <article className="card border-0 shadow-sm h-100">
        <div className="card-body">
          <p className="small text-secondary mb-2">{label}</p>
          <p className="display-6 fw-semibold mb-0">{value}</p>
        </div>
      </article>
    </div>
  );
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireAuthorizedUser();
  const env = getServerEnv();
  const today = todayDateOnly(env.timezone);
  const filters = parseFilters(await searchParams, today);
  const userId = await ensureApplicationUser(user);
  const [disciplines, overview] = await Promise.all([listDisciplines(), getOverviewData(userId, filters)]);
  const hasQuestions = overview.kpis.attempted > 0;
  const rankingRows = overview.ranking.map((row) => ({ ...row, id: row.disciplineId }));

  return (
    <section aria-labelledby="page-title">
      <div className="d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-3 mb-4">
        <div>
          <p className="mb-2 text-uppercase small fw-semibold text-primary">Painel de estudos</p>
          <h1 className="h2 mb-2" id="page-title">Visão geral</h1>
          <p className="mb-0 text-secondary">Acompanhe o desempenho e decida o próximo bloco de estudo.</p>
        </div>
        <a className="btn btn-primary" href="/registrar">Registrar questões</a>
      </div>

      <FilterBar disciplines={disciplines} today={today} />

      <div className="row g-3 mb-4">
        <KpiCard label="Questões tentadas" value={formatNumber(overview.kpis.attempted)} />
        <KpiCard label="Acertos" value={formatNumber(overview.kpis.correct)} />
        <KpiCard label="Acertos sem chute" value={formatNumber(overview.kpis.correctWithoutGuess)} />
        <KpiCard label="Percentual de chutes" value={formatPercent(overview.kpis.guessPercentage)} />
        <KpiCard label="Taxa de acerto" value={formatPercent(overview.kpis.accuracy)} />
        <KpiCard label="Taxa sem chute" value={formatPercent(overview.kpis.safeAccuracy)} />
        <KpiCard label="Taxa de acerto (não chutadas)" value={formatPercent(overview.kpis.nonGuessAccuracy)} />
      </div>

      {!hasQuestions ? (
        <EmptyState actionHref="/registrar" actionLabel="Registrar primeira sessão" description="Ainda não há sessões para o período e disciplinas selecionados." title="Nenhum dado neste filtro" />
      ) : (
        <>
          <div className="mb-4"><OverviewChartsLoader daily={overview.daily} disciplinePerformance={overview.disciplinePerformance} weekly={overview.weekly} /></div>
          <section aria-labelledby="ranking-title" className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
                <div><h2 className="h5 mb-1" id="ranking-title">Ranking por disciplina</h2><p className="small text-secondary mb-0">Disciplinas abaixo do volume mínimo ficam ocultas.</p></div>
                <RankingControls metric={filters.metric} minQuestions={filters.minQuestions} />
              </div>
              {rankingRows.length > 0 ? <ResponsiveDataTable ariaLabel="Ranking de desempenho por disciplina" columns={[{ key: "name", label: "Disciplina", render: (row) => row.disciplineName }, { key: "attempted", label: "Questões", render: (row) => formatNumber(row.attempted) }, { key: "accuracy", label: "Taxa", render: (row) => formatPercent(row.accuracy) }, { key: "safe", label: "Taxa sem chute", render: (row) => formatPercent(row.safeAccuracy) }]} rows={rankingRows} /> : <EmptyState description="Aumente o volume mínimo ou registre mais questões para comparar disciplinas." title="Nenhuma disciplina atingiu o mínimo" />}
            </div>
          </section>
          <ComparisonSection disciplines={disciplines} today={today} />
        </>
      )}
    </section>
  );
}
