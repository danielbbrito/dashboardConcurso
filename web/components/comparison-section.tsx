"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import type { Comparison, DateOnly } from "@/lib/domain";
import type { DisciplineOption } from "@/components/filter-bar";

function addDays(value: DateOnly, days: number): DateOnly {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10) as DateOnly;
}

export function ComparisonSection({ disciplines, today }: { disciplines: DisciplineOption[]; today: DateOnly }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Comparison | null>(null);
  const cutoffA = (searchParams.get("comparisonA") as DateOnly | null) ?? addDays(today, -29);
  const cutoffB = (searchParams.get("comparisonB") as DateOnly | null) ?? today;

  function updateDate(key: "comparisonA" | "comparisonB", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setResult(null);
  }

  async function load() {
    setLoading(true);
    setError(null);
    const query = new URLSearchParams({ from: cutoffA, to: cutoffB });
    const selected = searchParams.get("disciplines");
    if (selected) query.set("disciplines", selected);
    try {
      const response = await fetch(`/api/overview/comparison?${query.toString()}`);
      const payload = await response.json() as { data?: Comparison; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Não foi possível carregar a comparação.");
      setResult(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar a comparação.");
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !result) void load();
  }

  return <section className="card border-0 shadow-sm"><div className="card-body"><div className="d-flex flex-column flex-lg-row justify-content-between gap-3"><div><h2 className="h5 mb-1">Comparação acumulada</h2><p className="small text-secondary mb-0">Carregada somente quando solicitada; a comparação ignora o período normal do painel.</p></div><button aria-expanded={open} className="btn btn-outline-primary" onClick={toggle} type="button">{open ? "Ocultar comparação" : "Abrir comparação"}</button></div>{open ? <div className="mt-4"><div className="row g-3 align-items-end mb-3"><div className="col-sm-5"><label className="form-label" htmlFor="comparison-a">Data A</label><input className="form-control" id="comparison-a" onChange={(event) => updateDate("comparisonA", event.target.value)} type="date" value={cutoffA} /></div><div className="col-sm-5"><label className="form-label" htmlFor="comparison-b">Data B</label><input className="form-control" id="comparison-b" onChange={(event) => updateDate("comparisonB", event.target.value)} type="date" value={cutoffB} /></div><div className="col-sm-2"><button className="btn btn-primary w-100" disabled={loading} onClick={() => void load()} type="button">{loading ? "Carregando..." : "Atualizar"}</button></div></div>{error ? <div className="alert alert-danger" role="alert">{error}</div> : null}{result ? <><div className="row g-3 mb-3"><div className="col-sm-6"><div className="border rounded p-3"><small className="text-secondary d-block">Até {formatDate(result.cutoffA)}</small><strong>{formatNumber(result.kpisAtA.attempted)} questões</strong><div>{formatPercent(result.kpisAtA.accuracy)}</div></div></div><div className="col-sm-6"><div className="border rounded p-3"><small className="text-secondary d-block">Até {formatDate(result.cutoffB)}</small><strong>{formatNumber(result.kpisAtB.attempted)} questões</strong><div>{formatPercent(result.kpisAtB.accuracy)}</div></div></div></div><div className="table-responsive"><table className="table table-sm"><thead><tr><th scope="col">Disciplina</th><th scope="col">A</th><th scope="col">B</th><th scope="col">Delta</th></tr></thead><tbody>{result.byDiscipline.map((row) => <tr key={row.disciplineId}><td>{disciplines.find((discipline) => discipline.id === row.disciplineId)?.name ?? row.disciplineName}</td><td>{formatPercent(row.accuracyAtA)}</td><td>{formatPercent(row.accuracyAtB)}</td><td>{row.deltaPercentagePoints === null ? "Indisponível" : `${row.deltaPercentagePoints.toFixed(1)} p.p.`}</td></tr>)}</tbody></table></div></> : null}</div> : null}</div></section>;
}
