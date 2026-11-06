import { QuestionHistory } from "@/components/question-history";
import { QuestionRecordingForm } from "@/components/question-recording-form";
import { requireAuthorizedUser } from "@/lib/authorization";
import { ensureApplicationUser } from "@/lib/application-user";
import { listDisciplines, listQuestionSessions } from "@/lib/db/repository";
import { todayDateOnly } from "@/lib/domain";
import { getServerEnv } from "@/lib/env";
import { TOPIC_CATALOG } from "@/lib/catalog";

export default function RegisterPage() {
  return <RegisterContent />;
}

async function RegisterContent() {
  const user = await requireAuthorizedUser();
  const userId = await ensureApplicationUser(user);
  const [disciplines, history] = await Promise.all([listDisciplines(), listQuestionSessions(userId)]);
  const today = todayDateOnly(getServerEnv().timezone);
  return <section aria-labelledby="page-title"><div className="mb-4"><p className="mb-2 text-uppercase small fw-semibold text-primary">Registro rápido</p><h1 className="h2 mb-2" id="page-title">Registrar questões</h1><p className="mb-0 text-secondary">Salve uma sessão sem sair da página e acompanhe o histórico abaixo.</p></div><div className="card border-0 shadow-sm mb-4"><div className="card-body"><QuestionRecordingForm catalog={TOPIC_CATALOG} disciplines={disciplines} today={today} /></div></div><QuestionHistory result={history} /></section>;
}
