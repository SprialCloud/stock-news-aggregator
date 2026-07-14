import { AuthView } from "@neondatabase/auth/react";
import { VerifyEmailForm } from "./verify-email-form";

export const dynamicParams = false;

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;

  return <main className="auth-page">
    <div className="auth-shell">
      {path === "verify-email" ? <VerifyEmailForm /> : <AuthView path={path} />}
      {path === "sign-in" && <p className="auth-help">Received a verification code? <a href="/auth/verify-email">Verify your email</a></p>}
    </div>
  </main>;
}
