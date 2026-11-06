import Link from "next/link";
import { addDays } from "@/lib/reviews";
import type { DateOnly } from "@/lib/domain";
import { formatDate } from "@/lib/format";

export function ReviewWeekNav({ week }: { week: DateOnly }) {
  return <nav aria-label="Navegação de semanas" className="d-flex align-items-center justify-content-between gap-3 mb-4"><Link className="btn btn-outline-secondary" href={`/revisoes?week=${addDays(week, -7)}`}>Semana anterior</Link><strong>{formatDate(week)} a {formatDate(addDays(week, 6))}</strong><Link className="btn btn-outline-secondary" href={`/revisoes?week=${addDays(week, 7)}`}>Próxima semana</Link></nav>;
}
