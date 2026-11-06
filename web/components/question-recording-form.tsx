"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { FeedbackAlert } from "@/components/query-states";
import { formatPercent } from "@/lib/format";
import type { DateOnly, Discipline } from "@/lib/domain";

type TopicCatalog = Readonly<Record<string, readonly (readonly [string, readonly string[]])[]>>;
type FieldErrors = Record<string, string>;

export function QuestionRecordingForm({ catalog, disciplines, today }: { catalog: TopicCatalog; disciplines: Discipline[]; today: DateOnly }) {
  const router = useRouter();
  const [values, setValues] = useState({ studyDate: today, disciplineId: String(disciplines[0]?.id ?? ""), questionsAttempted: "", correctAnswers: "", guesses: "0", correctGuesses: "0", difficulty: "medio", topic: "", subtopic: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ accuracy: number | null; netScore: number } | null>(null);
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
      const response = await fetch("/api/question-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studyDate: values.studyDate, disciplineId: Number(values.disciplineId), questionsAttempted: Number(values.questionsAttempted), correctAnswers: Number(values.correctAnswers), guesses: Number(values.guesses), correctGuesses: Number(values.correctGuesses), difficulty: values.difficulty, topic: values.topic || null, subtopic: values.subtopic || null }) });
      const payload = await response.json() as { data?: { summary: { accuracy: number | null; netScore: number } }; error?: { message?: string; fields?: FieldErrors } };
      if (!response.ok || !payload.data) {
        setErrors(payload.error?.fields ?? { form: payload.error?.message ?? "Não foi possível salvar a sessão." });
        return;
      }
      setSuccess(payload.data.summary);
      router.refresh();
    } catch {
      setErrors({ form: "Não foi possível conectar ao servidor." });
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setValues((current) => ({ ...current, studyDate: today, questionsAttempted: "", correctAnswers: "", guesses: "0", correctGuesses: "0", topic: "", subtopic: "" }));
    setSuccess(null);
    setErrors({});
  }

  return <form aria-describedby={errors.form ? "question-form-error" : undefined} onSubmit={submit}>
    {errors.form ? <div className="alert alert-danger" id="question-form-error" role="alert">{errors.form}</div> : null}
    {success ? <FeedbackAlert><strong>Sessão registrada.</strong> Taxa de acerto: {formatPercent(success.accuracy)}. Nota líquida: {success.netScore.toFixed(1)}.<div className="mt-2"><button className="btn btn-sm btn-success me-2" onClick={resetForm} type="button">Registrar outra</button><a className="btn btn-sm btn-outline-success" href="#historico">Ver histórico</a></div></FeedbackAlert> : null}
    <div className="row g-3">
      <Field error={errors.studyDate} label="Data" name="question-date"><input className="form-control" id="question-date" max={today} onChange={(event) => update("studyDate", event.target.value)} type="date" value={values.studyDate} /></Field>
      <Field error={errors.disciplineId} label="Disciplina" name="question-discipline"><select className="form-select" id="question-discipline" onChange={(event) => update("disciplineId", event.target.value)} value={values.disciplineId}>{disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}</select></Field>
      <Field error={errors.questionsAttempted} label="Questões tentadas" name="question-attempted"><input className="form-control" id="question-attempted" min="1" onChange={(event) => update("questionsAttempted", event.target.value)} type="number" value={values.questionsAttempted} /></Field>
      <Field error={errors.correctAnswers} label="Acertos" name="question-correct"><input className="form-control" id="question-correct" min="0" onChange={(event) => update("correctAnswers", event.target.value)} type="number" value={values.correctAnswers} /></Field>
      <Field error={errors.guesses} label="Chutes" name="question-guesses"><input className="form-control" id="question-guesses" min="0" onChange={(event) => update("guesses", event.target.value)} type="number" value={values.guesses} /></Field>
      <Field error={errors.correctGuesses} label="Chutes certos" name="question-correct-guesses"><input className="form-control" id="question-correct-guesses" min="0" onChange={(event) => update("correctGuesses", event.target.value)} type="number" value={values.correctGuesses} /></Field>
      <Field error={errors.difficulty} label="Dificuldade percebida" name="question-difficulty"><select className="form-select" id="question-difficulty" onChange={(event) => update("difficulty", event.target.value)} value={values.difficulty}><option value="muito_facil">Muito fácil</option><option value="facil">Fácil</option><option value="medio">Médio</option><option value="dificil">Difícil</option></select></Field>
      <Field error={errors.topic} label="Matéria (opcional)" name="question-topic"><select className="form-select" id="question-topic" onChange={(event) => update("topic", event.target.value)} value={values.topic}><option value="">Selecione uma matéria</option>{topics.map(([topic]) => <option key={topic} value={topic}>{topic}</option>)}<option value="Simulado">Simulado</option></select></Field>
      <Field error={errors.subtopic} label="Subtópico (opcional)" name="question-subtopic"><select className="form-select" disabled={!values.topic || subtopics.length === 0} id="question-subtopic" onChange={(event) => update("subtopic", event.target.value)} value={values.subtopic}><option value="">{values.topic ? "Selecione um subtópico" : "Escolha uma matéria primeiro"}</option>{subtopics.map((subtopic) => <option key={subtopic} value={subtopic}>{subtopic}</option>)}</select></Field>
    </div>
    <button className="btn btn-primary mt-4" disabled={submitting} type="submit">{submitting ? "Salvando..." : "Registrar sessão"}</button>
  </form>;
}

function Field({ children, error, label, name }: { children: ReactNode; error?: string; label: string; name: string }) {
  return <div className="col-12 col-md-6"><label className="form-label fw-semibold" htmlFor={name}>{label}</label>{children}{error ? <div className="invalid-feedback d-block" role="alert">{error}</div> : null}</div>;
}
