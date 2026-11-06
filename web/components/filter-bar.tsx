"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { formatDate } from "@/lib/format";
import { parseFilters, serializeFilters } from "@/lib/filters";
import type { DateOnly, DisciplineId, FilterState } from "@/lib/domain";

const FILTER_KEYS = ["period", "from", "to", "disciplines", "metric", "minQuestions", "subtopics", "week"];

const periodLabels: Record<FilterState["period"], string> = {
  today: "Hoje",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  month: "Este mês",
  all: "Tudo",
  custom: "Personalizado",
};

export type DisciplineOption = {
  id: DisciplineId;
  name: string;
  block: string;
};

type FilterBarProps = {
  disciplines: DisciplineOption[];
  today: DateOnly;
};

function dateInputValue(value: DateOnly | null): string {
  return value ?? "";
}

export function FilterBar({ disciplines, today }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const filters = parseFilters(new URLSearchParams(searchParams.toString()), today);

  function updateUrl(nextFilters: FilterState) {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of FILTER_KEYS) params.delete(key);
    const serialized = new URLSearchParams(serializeFilters(nextFilters));
    serialized.forEach((value, key) => params.set(key, value));
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  function updateFilters(updates: Partial<FilterState>) {
    const nextFilters = { ...filters, ...updates };
    updateUrl(nextFilters);
  }

  function toggleDiscipline(id: DisciplineId) {
    const disciplineIds = filters.disciplineIds.includes(id)
      ? filters.disciplineIds.filter((current) => current !== id)
      : [...filters.disciplineIds, id].sort((a, b) => a - b);
    updateFilters({ disciplineIds });
  }

  return (
    <section aria-label="Filtros do painel" className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <div className="d-flex flex-column flex-xl-row align-items-xl-end gap-3">
          <div className="flex-grow-1">
            <label className="form-label fw-semibold" htmlFor="period-filter">Período</label>
            <select className="form-select" id="period-filter" onChange={(event) => updateFilters({ period: event.target.value as FilterState["period"] })} value={filters.period}>
              {Object.entries(periodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {filters.period === "custom" ? (
            <>
              <div>
                <label className="form-label fw-semibold" htmlFor="from-filter">De</label>
                <input className="form-control" id="from-filter" onChange={(event) => updateFilters({ from: event.target.value as DateOnly })} type="date" value={dateInputValue(filters.from)} />
              </div>
              <div>
                <label className="form-label fw-semibold" htmlFor="to-filter">Até</label>
                <input className="form-control" id="to-filter" onChange={(event) => updateFilters({ to: event.target.value as DateOnly })} type="date" value={dateInputValue(filters.to)} />
              </div>
            </>
          ) : null}
          <div className="d-flex align-items-center gap-2 text-secondary small">
            {isPending ? <span aria-live="polite">Atualizando...</span> : null}
            <span>{filters.from && filters.to ? `${formatDate(filters.from)} a ${formatDate(filters.to)}` : "Todos os períodos"}</span>
          </div>
        </div>

        <fieldset className="mt-3">
          <legend className="form-label fw-semibold fs-6">Disciplinas</legend>
          <div className="d-none d-md-flex flex-wrap gap-2">
            {disciplines.map((discipline) => (
              <label className={`btn btn-sm ${filters.disciplineIds.includes(discipline.id) ? "btn-primary" : "btn-outline-secondary"}`} key={discipline.id}>
                <input checked={filters.disciplineIds.includes(discipline.id)} className="visually-hidden" onChange={() => toggleDiscipline(discipline.id)} type="checkbox" />
                {discipline.name}
              </label>
            ))}
          </div>
          <details className="d-md-none">
            <summary className="btn btn-outline-secondary">Selecionar disciplinas ({filters.disciplineIds.length || "todas"})</summary>
            <div className="border rounded p-3 mt-2">
              {disciplines.map((discipline) => (
                <label className="form-check mb-2" key={discipline.id}>
                  <input checked={filters.disciplineIds.includes(discipline.id)} className="form-check-input" onChange={() => toggleDiscipline(discipline.id)} type="checkbox" />
                  <span className="form-check-label">{discipline.name} <small className="text-secondary">({discipline.block})</small></span>
                </label>
              ))}
            </div>
          </details>
        </fieldset>

        <div className="d-flex flex-wrap align-items-center gap-3 mt-3">
          <label className="form-check mb-0">
            <input checked={filters.includeSubtopics} className="form-check-input" onChange={(event) => updateFilters({ includeSubtopics: event.target.checked })} type="checkbox" />
            <span className="form-check-label">Detalhar subtópicos</span>
          </label>
          <button className="btn btn-sm btn-link p-0" onClick={() => updateFilters(parseFilters(new URLSearchParams(), today))} type="button">Limpar filtros</button>
        </div>
        <ActiveFilterSummary disciplines={disciplines} filters={filters} />
      </div>
    </section>
  );
}

export function ActiveFilterSummary({ disciplines, filters }: { disciplines: DisciplineOption[]; filters: FilterState }) {
  const names = disciplines.filter((discipline) => filters.disciplineIds.includes(discipline.id)).map((discipline) => discipline.name);
  const summary = [
    periodLabels[filters.period],
    names.length > 0 ? names.join(", ") : "Todas as disciplinas",
    filters.includeSubtopics ? "Com subTópicos" : null,
  ].filter(Boolean);
  return <p aria-live="polite" className="border-top mt-3 mb-0 pt-3 small text-secondary">Filtros ativos: {summary.join(" · ")}</p>;
}
