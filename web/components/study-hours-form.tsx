"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { FeedbackAlert } from "@/components/query-states";
import type { DateOnly } from "@/lib/domain";
import { formatDecimalHours } from "@/lib/format";

export function StudyHoursForm({ today }: { today: DateOnly }) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [hours, setHours] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError(null); setSuccess(null);
    try {
      const response = await fetch("/api/study-hours", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studyDate: date, hours: Number(hours) }) });
      const payload = await response.json() as { data?: { hours: number }; error?: { message?: string } };
      if (!response.ok || !payload.data) { setError(payload.error?.message ?? "Não foi possível salvar as horas."); return; }
      setSuccess(payload.data.hours); setHours(""); router.refresh();
    } catch { setError("Não foi possível conectar ao servidor."); } finally { setPending(false); }
  }
  return <form onSubmit={submit}><div className="row g-3 align-items-end"> <div className="col-sm-5"><label className="form-label fw-semibold" htmlFor="hours-date">Data</label><input className="form-control" id="hours-date" max={today} onChange={(event) => setDate(event.target.value as DateOnly)} type="date" value={date} /></div><div className="col-sm-5"><label className="form-label fw-semibold" htmlFor="hours-value">Horas estudadas</label><input className="form-control" id="hours-value" min="0.01" max="24" onChange={(event) => setHours(event.target.value)} step="0.5" type="number" value={hours} /></div><div className="col-sm-2"><button className="btn btn-primary w-100" disabled={pending} type="submit">{pending ? "Salvando..." : "Registrar"}</button></div></div>{error ? <div className="alert alert-danger mt-3" role="alert">{error}</div> : null}{success !== null ? <FeedbackAlert>Registro salvo: {formatDecimalHours(success)}.</FeedbackAlert> : null}</form>;
}
