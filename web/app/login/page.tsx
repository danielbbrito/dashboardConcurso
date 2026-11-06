import { LoginCard } from "@/components/login-card";

export default function LoginPage() {
  const localBypass = process.env.NODE_ENV === "development" && process.env.LOCAL_AUTH_BYPASS === "true";
  return <LoginCard localBypass={localBypass} />;
}
