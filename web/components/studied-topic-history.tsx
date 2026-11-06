"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeleteConfirmation } from "@/components/delete-confirmation";
import { EmptyState } from "@/components/query-states";
import { ResponsiveDataTable } from "@/components/responsive-data-table";
import type { PaginatedResult, StudiedTopic } from "@/lib/domain";
import { formatDate } from "@/lib/format";

type TopicRow = StudiedTopic & { disciplineName: string };

export function StudiedTopicHistory({ result }: { result: PaginatedResult<TopicRow> }) {
  const router = useRouter(); const [error, setError] = useState<string | null>(null);
  async function remove(id: string) { const response = await fetch(`/api/studied-topics/${id}`, { method: "DELETE" }); if (!response.ok) { setError("Não foi possível excluir o registro."); return; } router.refresh(); }
  if (result.items.length === 0) return <EmptyState description="As matérias estudadas aparecerão aqui." title="Histórico vazio" />;
  return <section aria-labelledby="topic-history-title"><h2 className="h5 mb-3" id="topic-history-title">Matérias recentes</h2>{error ? <div className="alert alert-danger" role="alert">{error}</div> : null}<ResponsiveDataTable ariaLabel="Histórico de matérias estudadas" columns={[{ key: "date", label: "Data", render: (row) => formatDate(row.studyDate) }, { key: "discipline", label: "Disciplina", render: (row) => row.disciplineName }, { key: "topic", label: "Matéria", render: (row) => row.topic }, { key: "subtopic", label: "Subtópico", render: (row) => row.subtopic ?? "-" }, { key: "action", label: "Ação", render: (row) => <DeleteConfirmation itemLabel={`a matéria ${row.topic}`} onConfirm={() => remove(row.id)} /> }]} rows={result.items} /></section>;
}
