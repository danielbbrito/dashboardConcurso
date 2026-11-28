"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { FeedbackAlert } from "@/components/query-states";
import { useKeepFormVisible } from "@/components/use-keep-form-visible";
import { formatPercent } from "@/lib/format";
import { MAX_COMMENT_LENGTH, type DateOnly, type Discipline, type QuestionSession } from "@/lib/domain";

export type TopicCatalog = Readonly<Record<string, readonly (readonly [string, readonly string[]])[]>>;
type FieldErrors = Record<string, string>;

type QuestionRecordingFormProps = {
  catalog: TopicCatalog;
  disciplines: Discipline[];
  historyKey: string;
  today: DateOnly;
  initialRecord?: QuestionSession;
  onCancel?: () => void;
  onSaved?: () => void;
};

export function QuestionRecordingForm({ catalog, disciplines, historyKey, today, initialRecord, onCancel, onSaved }: QuestionRecordingFormProps) {
  const router = useRouter();
  const editing = Boolean(initialRecord);
  const [values, setValues] = useState(() => ({
    studyDate: initialRecord?.studyDate ?? today,
    disciplineId: String(initialRecord?.disciplineId ?? disciplines[0]?.id ?? ""),
    questionsAttempted: initialRecord ? String(initialRecord.questionsAttempted) : "",
    correctAnswers: initialRecord ? String(initialRecord.correctAnswers) : "",
    guesses: initialRecord ? String(initialRecord.guesses) : "0",
    correctGuesses: initialRecord ? String(initialRecord.correctGuesses) : "0",
    difficulty: initialRecord?.difficulty ?? "medio",
    topic: initialRecord?.topic ?? "",
    subtopic: initialRecord?.subtopic ?? "",
    comment: initialRecord?.comment ?? "",
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ accuracy: number | null } | null>(null);
  const waitForRefresh = useKeepFormVisible(historyKey);
  const fieldId = (id: string) => `${editing ? "edit-" : ""}${id}`;
  const formErrorId = fieldId("question-form-error");
  const topics = catalog[values.disciplineId] ?? [];
  const selectedTopic = topics.find(([topic]) => topic === values.topic);
  const subtopics = selectedTopic?.[1] ?? [];

  function update(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value, ...(key === "disciplineId" || key === "topic" ? { subtopic: "" } : {}) }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrors({});
    setSuccess(null);
    try {
      const response = await fetch(initialRecord ? `/api/question-sessions/${initialRecord.id}` : "/api/question-sessions", { method: initialRecord ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studyDate: values.studyDate, disciplineId: Number(values.disciplineId), questionsAttempted: Number(values.questionsAttempted), correctAnswers: Number(values.correctAnswers), guesses: Number(values.guesses), correctGuesses: Number(values.correctGuesses), difficulty: values.difficulty, topic: values.topic || null, subtopic: values.subtopic || null, comment: values.comment || null }) });
      const payload = await response.json() as { data?: { summary?: { accuracy: number | null } }; error?: { message?: string; fields?: FieldErrors } };
      if (!response.ok || !payload.data) {
        setErrors(payload.error?.fields ?? { form: payload.error?.message ?? "Não foi possível salvar a sessão." });
        return;
      }
      if (initialRecord) {
        if (onSaved) onSaved();
        else router.refresh();
      } else {
        setSuccess(payload.data.summary ?? { accuracy: null });
        waitForRefresh();
        router.refresh();
      }
    } catch {
      setErrors({ form: "Não foi possível conectar ao servidor." });
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setValues((current) => ({ ...current, studyDate: today, questionsAttempted: "", correctAnswers: "", guesses: "0", correctGuesses: "0", topic: "", subtopic: "", comment: "" }));
    setSuccess(null);
    setErrors({});
  }

  return <form aria-describedby={errors.form ? formErrorId : undefined} onSubmit={submit}>
    {errors.form ? <div className="alert alert-danger" id={formErrorId} role="alert">{errors.form}</div> : null}
    {success ? <FeedbackAlert><strong>Sessão registrada.</strong> Taxa de acerto: {formatPercent(success.accuracy)}.<div className="mt-2"><button className="btn btn-sm btn-success me-2" onClick={resetForm} type="button">Registrar outra</button><a className="btn btn-sm btn-outline-success" href="#historico">Ver histórico</a></div></FeedbackAlert> : null}
    <div className="row g-3">
      <Field error={errors.studyDate} label="Data" name={fieldId("question-date")}><input className="form-control" id={fieldId("question-date")} max={today} onChange={(event) => update("studyDate", event.target.value)} type="date" value={values.studyDate} /></Field>
      <Field error={errors.disciplineId} label="Disciplina" name={fieldId("question-discipline")}><select className="form-select" id={fieldId("question-discipline")} onChange={(event) => update("disciplineId", event.target.value)} value={values.disciplineId}>{disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}</select></Field>
      <Field error={errors.questionsAttempted} label="Questões tentadas" name={fieldId("question-attempted")}><input className="form-control" id={fieldId("question-attempted")} min="1" onChange={(event) => update("questionsAttempted", event.target.value)} type="number" value={values.questionsAttempted} /></Field>
      <Field error={errors.correctAnswers} label="Acertos" name={fieldId("question-correct")}><input className="form-control" id={fieldId("question-correct")} min="0" onChange={(event) => update("correctAnswers", event.target.value)} type="number" value={values.correctAnswers} /></Field>
      <Field error={errors.guesses} label="Chutes" name={fieldId("question-guesses")}><input className="form-control" id={fieldId("question-guesses")} min="0" onChange={(event) => update("guesses", event.target.value)} type="number" value={values.guesses} /></Field>
      <Field error={errors.correctGuesses} label="Chutes certos" name={fieldId("question-correct-guesses")}><input className="form-control" id={fieldId("question-correct-guesses")} min="0" onChange={(event) => update("correctGuesses", event.target.value)} type="number" value={values.correctGuesses} /></Field>
      <Field error={errors.difficulty} label="Dificuldade percebida" name={fieldId("question-difficulty")}><select className="form-select" id={fieldId("question-difficulty")} onChange={(event) => update("difficulty", event.target.value)} value={values.difficulty}><option value="muito_facil">Muito fácil</option><option value="facil">Fácil</option><option value="medio">Médio</option><option value="dificil">Difícil</option></select></Field>
      <Field error={errors.topic} label="Matéria (opcional)" name={fieldId("question-topic")}><select className="form-select" id={fieldId("question-topic")} onChange={(event) => update("topic", event.target.value)} value={values.topic}><option value="">Selecione uma matéria</option>{topics.map(([topic]) => <option key={topic} value={topic}>{topic}</option>)}<option value="Simulado">Simulado</option></select></Field>
      <Field error={errors.subtopic} label="Subtópico (opcional)" name={fieldId("question-subtopic")}><select className="form-select" disabled={!values.topic || subtopics.length === 0} id={fieldId("question-subtopic")} onChange={(event) => update("subtopic", event.target.value)} value={values.subtopic}><option value="">{values.topic ? "Selecione um subtópico" : "Escolha uma matéria primeiro"}</option>{subtopics.map((subtopic) => <option key={subtopic} value={subtopic}>{subtopic}</option>)}</select></Field>
      <Field error={errors.comment} label="O que foi estudado? (opcional)" name={fieldId("question-comment")}><textarea className="form-control" id={fieldId("question-comment")} maxLength={MAX_COMMENT_LENGTH} onChange={(event) => update("comment", event.target.value)} placeholder="Anote assuntos, páginas, questões ou pontos que quer lembrar." rows={3} value={values.comment} /></Field>
    </div>
    <div className="d-flex gap-2 mt-4">
      <button className="btn btn-primary" disabled={submitting} type="submit">{submitting ? "Salvando..." : editing ? "Salvar alterações" : "Registrar sessão"}</button>
      {onCancel ? <button className="btn btn-outline-secondary" disabled={submitting} onClick={onCancel} type="button">Cancelar</button> : null}
    </div>
  </form>;
}

function Field({ children, error, label, name }: { children: ReactNode; error?: string; label: string; name: string }) {
  return <div className="col-12 col-md-6"><label className="form-label fw-semibold" htmlFor={name}>{label}</label>{children}{error ? <div className="invalid-feedback d-block" role="alert">{error}</div> : null}</div>;
}
