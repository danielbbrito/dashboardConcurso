"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeleteConfirmation } from "@/components/delete-confirmation";
import { Pagination } from "@/components/pagination";
import { ResponsiveDataTable } from "@/components/responsive-data-table";
import { EmptyState, FeedbackAlert } from "@/components/query-states";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import type { PaginatedResult } from "@/lib/domain";
import type { RepositoryQuestionRow } from "@/lib/db/repository";

export function QuestionHistory({ result }: { result: PaginatedResult<RepositoryQuestionRow> }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  async function remove(id: string) {
    const response = await fetch(`/api/question-sessions/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Não foi possível excluir o registro.");
    setMessage("Registro excluído.");
    router.refresh();
  }
  if (result.items.length === 0) return <EmptyState description="As sessões registradas aparecerão aqui." title="Histórico vazio" />;
  return <section aria-labelledby="history-title" id="historico"><div className="d-flex align-items-center justify-content-between mb-3"><h2 className="h5 mb-0" id="history-title">Histórico recente</h2>{message ? <FeedbackAlert>{message}</FeedbackAlert> : null}</div><ResponsiveDataTable ariaLabel="Histórico de sessões de questões" columns={[{ key: "date", label: "Data", render: (row) => formatDate(row.studyDate) }, { key: "discipline", label: "Disciplina", render: (row) => row.disciplineName }, { key: "questions", label: "Questões", render: (row) => formatNumber(row.questionsAttempted) }, { key: "accuracy", label: "Taxa", render: (row) => formatPercent(row.correctAnswers / row.questionsAttempted) }, { key: "action", label: "Ação", render: (row) => <DeleteConfirmation itemLabel={`a sessão de ${formatDate(row.studyDate)}`} onConfirm={() => remove(row.id)} /> }]} rows={result.items} /><Pagination basePath="/registrar" page={result.pageInfo.page} pageSize={result.pageInfo.pageSize} query="" total={result.pageInfo.total} /></section>;
}
