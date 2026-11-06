import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";

export default function AccessDeniedPage() {
  return (
    <main className="d-flex min-vh-100 align-items-center justify-content-center p-4">
      <section aria-labelledby="denied-title" className="card border-0 shadow-sm" style={{ maxWidth: "32rem", width: "100%" }}>
        <div className="card-body p-4 p-lg-5">
          <p className="mb-2 text-uppercase small fw-semibold text-danger">Acesso negado</p>
          <h1 className="h3" id="denied-title">Esta conta nao esta autorizada</h1>
          <p className="text-secondary">Saia e entre com a conta Google autorizada pelo responsavel pelo painel.</p>
          <div className="d-flex flex-column flex-sm-row gap-2">
            <SignOutButton />
            <Link className="btn btn-outline-secondary" href="/login">Voltar ao login</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
