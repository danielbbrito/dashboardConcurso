"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const navigation = [
  ["Visao geral", "/"],
  ["Registrar questoes", "/registrar"],
  ["Disciplinas", "/disciplinas"],
  ["Horas de estudo", "/horas"],
  ["Revisoes", "/revisoes"],
  ["Ciclo de estudos", "/ciclo"],
  ["Materias", "/materias"],
] as const;

type AppShellProps = {
  accountAction: ReactNode;
  children: ReactNode;
  userEmail: string;
};

function NavigationLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Navegacao principal" className="nav flex-column gap-1">
      {navigation.map(([label, href]) => {
        const active = href === "/" ? pathname === href : pathname.startsWith(href);
        return (
          <a
            aria-current={active ? "page" : undefined}
            className={`app-nav-link rounded-end px-3 py-2 text-decoration-none ${active ? "active" : ""}`}
            href={href}
            key={href}
            onClick={onNavigate}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}

export function AppShell({ accountAction, children, userEmail }: AppShellProps) {
  const pathname = usePathname();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isMenuOpen) {
      closeButtonRef.current?.focus();
    } else {
      menuButtonRef.current?.focus();
    }
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) {
        return;
      }

      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled])",
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  return (
    <div className="app-shell">
      <a className="visually-hidden-focusable position-fixed top-0 start-0 z-3 bg-white p-2" href="#main-content">Pular para o conteúdo</a>
      <aside className="app-sidebar d-none d-md-flex flex-column position-fixed bottom-0 start-0 top-0 p-3">
        <div className="mb-4">
          <p className="mb-1 text-uppercase small text-info">Estudos BCB TI</p>
          <strong className="fs-5">Concurso Dashboard</strong>
        </div>
        <NavigationLinks pathname={pathname} />
        <div className="mt-auto border-top border-light border-opacity-25 pt-3">
          <p className="mb-2 small text-break" title={userEmail}>{userEmail}</p>
          {accountAction}
        </div>
      </aside>

      <div className="app-mobile-bar d-flex d-md-none align-items-center justify-content-between gap-3 p-3">
        <button
          aria-controls="mobile-navigation"
          aria-expanded={isMenuOpen}
          aria-label="Abrir navegacao"
          className="btn btn-outline-light"
          onClick={() => setMenuOpen(true)}
          ref={menuButtonRef}
          type="button"
        >
          Menu
        </button>
        <strong className="text-truncate">Concurso Dashboard</strong>
        <span aria-hidden="true" className="small">BCB TI</span>
      </div>

      {isMenuOpen ? (
        <>
          <button aria-label="Fechar navegacao" className="app-drawer-backdrop border-0" onClick={() => setMenuOpen(false)} type="button" />
          <aside aria-label="Navegacao movel" className="app-drawer p-3" id="mobile-navigation" ref={drawerRef}>
            <div className="d-flex align-items-center justify-content-between mb-4">
              <strong>Menu principal</strong>
              <button aria-label="Fechar navegacao" className="btn btn-sm btn-outline-light" onClick={() => setMenuOpen(false)} ref={closeButtonRef} type="button">
                Fechar
              </button>
            </div>
            <NavigationLinks onNavigate={() => setMenuOpen(false)} pathname={pathname} />
            <div className="mt-4 border-top border-light border-opacity-25 pt-3">
              <p className="mb-2 small text-break">{userEmail}</p>
              {accountAction}
            </div>
          </aside>
        </>
      ) : null}

      <main className="app-main min-vh-100" id="main-content" tabIndex={-1}>
        <div className="container-fluid px-3 px-lg-5 py-4">{children}</div>
      </main>
    </div>
  );
}
