import type { ReactNode } from "react";

type RoutePlaceholderProps = {
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
  description: string;
  title: string;
};

export function RoutePlaceholder({ actionHref, actionLabel, children, description, title }: RoutePlaceholderProps) {
  return (
    <section aria-labelledby="page-title">
      <div className="d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-3 mb-4">
        <div>
          <p className="mb-2 text-uppercase small fw-semibold text-primary">Area de estudos</p>
          <h1 className="h2 mb-2" id="page-title">{title}</h1>
          <p className="mb-0 text-secondary">{description}</p>
        </div>
        {actionHref && actionLabel ? <a className="btn btn-primary" href={actionHref}>{actionLabel}</a> : null}
      </div>
      <div className="app-empty-state rounded-3 p-4 p-lg-5">
        <h2 className="h5">Esta area sera habilitada nas proximas etapas</h2>
        <p className="mb-0 text-secondary">A estrutura de navegacao ja esta pronta para receber dados sem alterar o aplicativo atual.</p>
        {children}
      </div>
    </section>
  );
}
