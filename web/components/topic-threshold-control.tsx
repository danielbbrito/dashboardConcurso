"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function TopicThresholdControl({ value }: { value: number }) {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  return <label className="d-flex align-items-center gap-2 small">Mínimo de questões<input aria-label="Mínimo de questões para matérias" className="form-control form-control-sm" min="0" onChange={(event) => { const params = new URLSearchParams(searchParams.toString()); params.set("minQuestions", event.target.value); router.replace(`${pathname}?${params.toString()}`, { scroll: false }); }} type="number" value={value} /></label>;
}
