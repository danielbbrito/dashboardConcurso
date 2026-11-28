"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeleteConfirmation } from "@/components/delete-confirmation";
import { EmptyState, FeedbackAlert } from "@/components/query-states";
import { ResponsiveDataTable } from "@/components/responsive-data-table";
import { StudiedTopicForm, type TopicCatalog } from "@/components/studied-topic-form";
import type { DateOnly, Discipline, PaginatedResult, StudiedTopic } from "@/lib/domain";
import { formatDate } from "@/lib/format";

type TopicRow = StudiedTopic & { disciplineName: string };

type StudiedTopicHistoryProps = {
  result: PaginatedResult<TopicRow>;
  catalog: TopicCatalog;
  disciplines: Discipline[];
  today: DateOnly;
};

export function StudiedTopicHistory({ result, catalog, disciplines, today }: StudiedTopicHistoryProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<TopicRow | null>(null);
  const historyKey = `${result.pageInfo.total}:${result.items.map((item) => item.id).join(",")}`;

  async function remove(id: string) {
    const response = await fetch(`/api/studied-topics/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Não foi possível excluir o registro.");
    setMessage("Registro excluído.");
    router.refresh();
  }

  if (result.items.length === 0) return <EmptyState description="As matérias estudadas aparecerão aqui." title="Histórico vazio" />;

  return <>
    <section aria-labelledby="topic-history-title">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h5 mb-0" id="topic-history-title">Matérias recentes</h2>
        {message ? <FeedbackAlert>{message}</FeedbackAlert> : null}
      </div>
      <ResponsiveDataTable ariaLabel="Histórico de matérias estudadas" columns={[
        { key: "date", label: "Data", render: (row) => formatDate(row.studyDate) },
        { key: "discipline", label: "Disciplina", render: (row) => row.disciplineName },
        { key: "topic", label: "Matéria", render: (row) => row.topic },
        { key: "subtopic", label: "Subtópico", render: (row) => row.subtopic ?? "-" },
        { key: "comment", label: "O que foi estudado", render: (row) => row.comment ? <span className="study-comment">{row.comment}</span> : "-" },
        { key: "action", label: "Ação", render: (row) => <div className="d-flex gap-2"><button className="btn btn-sm btn-outline-primary" onClick={() => setEditing(row)} type="button">Editar</button><DeleteConfirmation itemLabel={`a matéria ${row.topic}`} onConfirm={() => remove(row.id)} /></div> },
      ]} rows={result.items} />
    </section>
    {editing ? <>
      <button aria-label="Fechar edição" className="modal-backdrop show border-0" onClick={() => setEditing(null)} type="button" />
      <div aria-labelledby="edit-topic-title" aria-modal="true" className="modal d-block" role="dialog">
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-5" id="edit-topic-title">Editar matéria estudada</h2>
              <button aria-label="Fechar edição" className="btn-close" onClick={() => setEditing(null)} type="button" />
            </div>
            <div className="modal-body">
              <StudiedTopicForm
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
