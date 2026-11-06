import Link from "next/link";

import { requireAuthorizedUser } from "@/lib/authorization";
import { listDisciplines } from "@/lib/db/repository";

export default async function DisciplinesPage() {
  await requireAuthorizedUser();
  const disciplines = await listDisciplines();
  return <section aria-labelledby="page-title"><div className="mb-4"><p className="mb-2 text-uppercase small fw-semibold text-primary">Catálogo de disciplinas</p><h1 className="h2 mb-2" id="page-title">Disciplinas</h1><p className="mb-0 text-secondary">Abra uma disciplina para ver desempenho, matérias, histórico e anotações.</p></div><div className="row g-3">{disciplines.map((discipline) => <div className="col-12 col-md-6 col-xl-4" key={discipline.id}><Link className="card border-0 shadow-sm h-100 text-decoration-none" href={`/disciplinas/${discipline.id}`}><div className="card-body"><div className="d-flex justify-content-between gap-2"><h2 className="h5 text-dark">{discipline.name}</h2><span className="badge text-bg-light">{discipline.block}</span></div><p className="text-secondary mb-0">{discipline.examItems} itens previstos no exame.</p></div></Link></div>)}</div></section>;
}
