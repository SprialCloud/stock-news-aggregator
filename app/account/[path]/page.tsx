import { AccountView } from "@neondatabase/auth/react";

export const dynamicParams = false;

export default async function AccountPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  return <main className="auth-page"><AccountView path={path} /></main>;
}
