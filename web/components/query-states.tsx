import Link from "next/link";
import type { ReactNode } from "react";

export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando indicadores" className="row g-3">
      {Array.from({ length: count }, (_, index) => (
        <div className="col-6 col-xl-3" key={index}>
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body placeholder-glow">
              <span className="placeholder col-7" />
              <span className="placeholder col-5 d-block mt-3" style={{ height: "2rem" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando gráfico" className="card border-0 shadow-sm">
      <div className="card-body placeholder-glow">
        <span className="placeholder col-4" />
        <span className="placeholder col-12 d-block mt-4" style={{ height: "15rem" }} />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando tabela" className="card border-0 shadow-sm">
      <div className="card-body placeholder-glow">
        {Array.from({ length: rows }, (_, index) => <span className="placeholder col-12 d-block mb-3" key={index} />)}
      </div>
    </div>
  );
}

export function EmptyState({ actionHref, actionLabel, description, title }: { actionHref?: string; actionLabel?: string; description: string; title: string }) {
  return (
    <section aria-labelledby="empty-state-title" className="app-empty-state rounded-3 p-4 text-center">
      <h2 className="h5" id="empty-state-title">{title}</h2>
      <p className="text-secondary">{description}</p>
      {actionHref && actionLabel ? <Link className="btn btn-primary" href={actionHref}>{actionLabel}</Link> : null}
    </section>
  );
}

export function QueryError({ message = "Não foi possível carregar os dados.", retryHref }: { message?: string; retryHref?: string }) {
  return (
    <section aria-live="assertive" className="alert alert-danger" role="alert">
      <h2 className="h6">Ocorreu um erro</h2>
      <p className="mb-2">{message}</p>
      {retryHref ? <Link className="btn btn-outline-danger btn-sm" href={retryHref}>Tentar novamente</Link> : null}
    </section>
  );
}

export function FeedbackAlert({ children, variant = "success" }: { children: ReactNode; variant?: "success" | "danger" | "warning" | "info" }) {
  return <div aria-live="polite" className={`alert alert-${variant}`} role={variant === "danger" ? "alert" : "status"}>{children}</div>;
}
