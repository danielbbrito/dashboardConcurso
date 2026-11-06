import { StudyCycleEditor } from "@/components/study-cycle-editor";
import { requireAuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import { getInitializedCycle } from "@/lib/cycle-service";

export default function StudyCyclePage() { return <StudyCycleContent />; }

async function StudyCycleContent() {
  const user = await requireAuthorizedUser(); const cycle = await getInitializedCycle(await ensureApplicationUser(user));
  return <section aria-labelledby="page-title"><div className="mb-4"><p className="mb-2 text-uppercase small fw-semibold text-primary">Planejamento</p><h1 className="h2 mb-2" id="page-title">Ciclo de estudos</h1><p className="mb-0 text-secondary">Organize a ordem e as horas de cada disciplina.</p></div><div className="card border-0 shadow-sm"><div className="card-body"><StudyCycleEditor initialItems={cycle.items} /></div></div></section>;
}
