"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

import { FeedbackAlert } from "@/components/query-states";

export function DisciplineNoteEditor({ disciplineId, initialBody }: { disciplineId: number; initialBody: string }) {
  const [body, setBody] = useState(initialBody);
  const [preview, setPreview] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setPending(true); setMessage(null); setError(null);
    try { const response = await fetch(`/api/disciplines/${disciplineId}/note`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) }); const payload = await response.json() as { error?: { message?: string } }; if (!response.ok) throw new Error(payload.error?.message ?? "Não foi possível salvar a anotação."); setMessage("Anotação salva."); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar a anotação."); } finally { setPending(false); }
  }
  return <section aria-labelledby="note-title" className="card border-0 shadow-sm"><div className="card-body"><div className="d-flex justify-content-between align-items-center gap-2 mb-3"><h2 className="h5 mb-0" id="note-title">Anotações</h2><button className="btn btn-sm btn-outline-secondary" onClick={() => setPreview((current) => !current)} type="button">{preview ? "Editar" : "Pré-visualizar"}</button></div>{preview ? <div className="border rounded p-3 markdown-preview"><ReactMarkdown rehypePlugins={[rehypeSanitize]}>{body || "Nenhuma anotação."}</ReactMarkdown></div> : <textarea aria-label="Anotação em Markdown" className="form-control" onChange={(event) => setBody(event.target.value)} placeholder="Escreva uma anotação em Markdown..." rows={8} value={body} />}<button className="btn btn-primary mt-3" disabled={pending} onClick={() => void save()} type="button">{pending ? "Salvando..." : "Salvar anotação"}</button>{message ? <FeedbackAlert>{message}</FeedbackAlert> : null}{error ? <div className="alert alert-danger mt-3" role="alert">{error}</div> : null}</div></section>;
}
