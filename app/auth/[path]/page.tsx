import { AuthView } from "@neondatabase/auth/react";

export const dynamicParams = false;

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  return <main className="auth-page"><AuthView path={path} /></main>;
}
