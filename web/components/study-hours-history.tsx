"use client";

import { useRouter } from "next/navigation";

import { DeleteConfirmation } from "@/components/delete-confirmation";
import { EmptyState } from "@/components/query-states";
import { ResponsiveDataTable } from "@/components/responsive-data-table";
import type { PaginatedResult, StudyHours } from "@/lib/domain";
import { formatDate, formatDecimalHours } from "@/lib/format";

export function StudyHoursHistory({ result }: { result: PaginatedResult<StudyHours> }) {
  const router = useRouter();
  async function remove(id: string) { const response = await fetch(`/api/study-hours/${id}`, { method: "DELETE" }); if (!response.ok) throw new Error("Não foi possível excluir o registro."); router.refresh(); }
  if (result.items.length === 0) return <EmptyState description="As horas registradas aparecerão aqui." title="Histórico vazio" />;
  return <section aria-labelledby="hours-history-title"><h2 className="h5 mb-3" id="hours-history-title">Registros recentes</h2><ResponsiveDataTable ariaLabel="Histórico de horas de estudo" columns={[{ key: "date", label: "Data", render: (row) => formatDate(row.studyDate) }, { key: "hours", label: "Horas", render: (row) => formatDecimalHours(row.hours) }, { key: "action", label: "Ação", render: (row) => <DeleteConfirmation itemLabel={`o registro de ${formatDate(row.studyDate)}`} onConfirm={() => remove(row.id)} /> }]} rows={result.items} /></section>;
}
