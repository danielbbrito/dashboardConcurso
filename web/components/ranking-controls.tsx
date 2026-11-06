"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { RankingMetric } from "@/lib/domain";

export function RankingControls({ metric, minQuestions }: { metric: RankingMetric; minQuestions: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return <div className="d-flex flex-wrap gap-2"><label className="visually-hidden" htmlFor="ranking-metric">Métrica do ranking</label><select className="form-select form-select-sm" id="ranking-metric" onChange={(event) => update("metric", event.target.value)} value={metric}><option value="accuracy">Taxa de acerto</option><option value="safeAccuracy">Taxa sem chute</option></select><label className="visually-hidden" htmlFor="ranking-min">Mínimo de questões</label><input aria-label="Mínimo de questões" className="form-control form-control-sm" id="ranking-min" min="0" onChange={(event) => update("minQuestions", event.target.value)} type="number" value={minQuestions} /></div>;
}
