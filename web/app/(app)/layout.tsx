import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { requireAuthorizedUser } from "@/lib/authorization";

export default async function AuthenticatedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await requireAuthorizedUser();

  return (
    <AppShell accountAction={<SignOutButton variant="light" />} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
