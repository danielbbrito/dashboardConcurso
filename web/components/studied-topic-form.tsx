"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { FeedbackAlert } from "@/components/query-states";
import { useKeepFormVisible } from "@/components/use-keep-form-visible";
import { MAX_COMMENT_LENGTH, type DateOnly, type Discipline, type StudiedTopic } from "@/lib/domain";

export type TopicCatalog = Readonly<Record<string, readonly (readonly [string, readonly string[]])[]>>;

type StudiedTopicFormProps = {
  catalog: TopicCatalog;
  disciplines: Discipline[];
  historyKey: string;
  today: DateOnly;
  initialRecord?: StudiedTopic;
  onCancel?: () => void;
  onSaved?: () => void;
};

export function StudiedTopicForm({ catalog, disciplines, historyKey, today, initialRecord, onCancel, onSaved }: StudiedTopicFormProps) {
  const router = useRouter();
  const editing = Boolean(initialRecord);
  const [values, setValues] = useState(() => ({ studyDate: initialRecord?.studyDate ?? today, disciplineId: String(initialRecord?.disciplineId ?? disciplines[0]?.id ?? ""), topic: initialRecord?.topic ?? "", subtopic: initialRecord?.subtopic ?? "", comment: initialRecord?.comment ?? "" }));
  const [error, setError] = useState<string | null>(null); const [success, setSuccess] = useState(false); const [pending, setPending] = useState(false);
  const waitForRefresh = useKeepFormVisible(historyKey);
  const fieldId = (id: string) => `${initialRecord ? "edit-" : ""}${id}`;
  const topics = catalog[values.disciplineId] ?? []; const subtopics = topics.find(([topic]) => topic === values.topic)?.[1] ?? [];
  function update(key: keyof typeof values, value: string) { setValues((current) => ({ ...current, [key]: value, ...(key === "disciplineId" || key === "topic" ? { subtopic: "" } : {}) })); }
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (pending) return; setPending(true); setError(null); setSuccess(false); try { const response = await fetch(initialRecord ? `/api/studied-topics/${initialRecord.id}` : "/api/studied-topics", { method: initialRecord ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studyDate: values.studyDate, disciplineId: Number(values.disciplineId), topic: values.topic, subtopic: values.subtopic || null, comment: values.comment || null }) }); const payload = await response.json() as { data?: unknown; error?: { message?: string } }; if (!response.ok || !payload.data) { setError(payload.error?.message ?? "Não foi possível salvar a matéria."); return; } if (initialRecord) { if (onSaved) onSaved(); else router.refresh(); } else { setSuccess(true); setValues((current) => ({ ...current, topic: "", subtopic: "", comment: "" })); waitForRefresh(); router.refresh(); } } catch { setError("Não foi possível conectar ao servidor."); } finally { setPending(false); } }
  return <form onSubmit={submit}><div className="row g-3"><div className="col-md-4"><label className="form-label fw-semibold" htmlFor={fieldId("topic-date")}>Data</label><input className="form-control" id={fieldId("topic-date")} max={today} onChange={(event) => update("studyDate", event.target.value)} type="date" value={values.studyDate} /></div><div className="col-md-4"><label className="form-label fw-semibold" htmlFor={fieldId("topic-discipline")}>Disciplina</label><select className="form-select" id={fieldId("topic-discipline")} onChange={(event) => update("disciplineId", event.target.value)} value={values.disciplineId}>{disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}</select></div><div className="col-md-4"><label className="form-label fw-semibold" htmlFor={fieldId("topic-name")}>Matéria</label><select className="form-select" id={fieldId("topic-name")} onChange={(event) => update("topic", event.target.value)} value={values.topic}><option value="">Selecione uma matéria</option>{topics.map(([topic]) => <option key={topic} value={topic}>{topic}</option>)}<option value="Simulado">Simulado</option></select></div><div className="col-md-8"><label className="form-label fw-semibold" htmlFor={fieldId("topic-subtopic")}>Subtópico (opcional)</label><select className="form-select" disabled={!values.topic || subtopics.length === 0} id={fieldId("topic-subtopic")} onChange={(event) => update("subtopic", event.target.value)} value={values.subtopic}><option value="">Selecione um subtópico</option>{subtopics.map((subtopic) => <option key={subtopic} value={subtopic}>{subtopic}</option>)}</select></div><div className="col-12"><label className="form-label fw-semibold" htmlFor={fieldId("topic-comment")}>O que foi estudado? (opcional)</label><textarea className="form-control" id={fieldId("topic-comment")} maxLength={MAX_COMMENT_LENGTH} onChange={(event) => update("comment", event.target.value)} placeholder="Anote assuntos, páginas, questões ou pontos que quer lembrar." rows={3} value={values.comment} /></div></div>{error ? <div className="alert alert-danger mt-3" role="alert">{error}</div> : null}{success ? <FeedbackAlert>Matéria registrada e disponível para revisão.</FeedbackAlert> : null}<div className="d-flex gap-2 mt-4"><button className="btn btn-primary" disabled={pending} type="submit">{pending ? "Salvando..." : editing ? "Salvar alterações" : "Registrar matéria"}</button>{onCancel ? <button className="btn btn-outline-secondary" disabled={pending} onClick={onCancel} type="button">Cancelar</button> : null}</div></form>;
}
