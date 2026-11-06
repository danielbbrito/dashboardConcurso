"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

export function LoginCard({ localBypass }: { localBypass: boolean }) {
  return (
    <main className="d-flex min-vh-100 align-items-center justify-content-center p-4">
      <section aria-labelledby="login-title" className="card border-0 shadow-sm" style={{ maxWidth: "28rem", width: "100%" }}>
        <div className="card-body p-4 p-lg-5">
          <p className="mb-2 text-uppercase small fw-semibold text-primary">Estudos BCB TI</p>
          <h1 className="h3" id="login-title">Acesso restrito</h1>
          {localBypass ? (
            <>
              <p className="text-secondary">Ambiente local detectado. O login Google será configurado para o ambiente publicado.</p>
              <Link className="btn btn-primary w-100" href="/">Entrar no ambiente local</Link>
            </>
          ) : (
            <>
              <p className="text-secondary">Entre com uma conta Google autorizada para acessar o painel.</p>
              <button className="btn btn-primary w-100" onClick={() => void signIn("google", { callbackUrl: "/" })} type="button">
                Entrar com Google
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
