import type { Metadata } from "next";
import type { ReactNode } from "react";

import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Concurso Dashboard",
  description: "Novo painel de estudos para o concurso BCB TI.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
