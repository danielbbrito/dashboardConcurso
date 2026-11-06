"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ variant = "primary" }: { variant?: "light" | "primary" }) {
  return (
    <button
      className={`btn btn-sm btn-outline-${variant} w-100`}
      onClick={() => void signOut({ callbackUrl: "/login" })}
      type="button"
    >
      Sair
    </button>
  );
}
