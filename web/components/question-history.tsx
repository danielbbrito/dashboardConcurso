"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeleteConfirmation } from "@/components/delete-confirmation";
import { Pagination } from "@/components/pagination";
import { QuestionRecordingForm, type TopicCatalog } from "@/components/question-recording-form";
import { ResponsiveDataTable } from "@/components/responsive-data-table";
import { EmptyState, FeedbackAlert } from "@/components/query-states";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import type { DateOnly, Discipline, PaginatedResult } from "@/lib/domain";
import type { RepositoryQuestionRow } from "@/lib/db/repository";

type QuestionHistoryProps = {
  result: PaginatedResult<RepositoryQuestionRow>;
  catalog: TopicCatalog;
  disciplines: Discipline[];
  today: DateOnly;
};

export function QuestionHistory({ result, catalog, disciplines, today }: QuestionHistoryProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<RepositoryQuestionRow | null>(null);
  const historyKey = `${result.pageInfo.total}:${result.items.map((item) => item.id).join(",")}`;

  async function remove(id: string) {
    const response = await fetch(`/api/question-sessions/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Não foi possível excluir o registro.");
    setMessage("Registro excluído.");
    router.refresh();
  }

  if (result.items.length === 0) return <EmptyState description="As sessões registradas aparecerão aqui." title="Histórico vazio" />;

  return <>
    <section aria-labelledby="history-title" id="historico">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h5 mb-0" id="history-title">Histórico recente</h2>
        {message ? <FeedbackAlert>{message}</FeedbackAlert> : null}
      </div>
      <ResponsiveDataTable ariaLabel="Histórico de sessões de questões" columns={[
        { key: "date", label: "Data", render: (row) => formatDate(row.studyDate) },
        { key: "discipline", label: "Disciplina", render: (row) => row.disciplineName },
        { key: "questions", label: "Questões", render: (row) => formatNumber(row.questionsAttempted) },
        { key: "accuracy", label: "Taxa", render: (row) => formatPercent(row.correctAnswers / row.questionsAttempted) },
        { key: "comment", label: "O que foi estudado", render: (row) => row.comment ? <span className="study-comment">{row.comment}</span> : "-" },
        { key: "action", label: "Ação", render: (row) => <div className="d-flex gap-2"><button className="btn btn-sm btn-outline-primary" onClick={() => setEditing(row)} type="button">Editar</button><DeleteConfirmation itemLabel={`a sessão de ${formatDate(row.studyDate)}`} onConfirm={() => remove(row.id)} /></div> },
      ]} rows={result.items} />
      <Pagination basePath="/registrar" page={result.pageInfo.page} pageSize={result.pageInfo.pageSize} query="" total={result.pageInfo.total} />
    </section>
    {editing ? <>
      <button aria-label="Fechar edição" className="modal-backdrop show border-0" onClick={() => setEditing(null)} type="button" />
      <div aria-labelledby="edit-question-title" aria-modal="true" className="modal d-block" role="dialog">
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-5" id="edit-question-title">Editar sessão de questões</h2>
              <button aria-label="Fechar edição" className="btn-close" onClick={() => setEditing(null)} type="button" />
            </div>
            <div className="modal-body">
              <QuestionRecordingForm
                catalog={catalog}
                disciplines={disciplines}
                historyKey={historyKey}
                initialRecord={editing}
                onCancel={() => setEditing(null)}
                onSaved={() => { setEditing(null); setMessage("Registro atualizado."); router.refresh(); }}
                today={today}
              />
            </div>
          </div>
        </div>
      </div>
    </> : null}
  </>;
}
