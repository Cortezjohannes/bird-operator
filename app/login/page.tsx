import { redirect } from "next/navigation";

import { LoginScreen } from "@/src/features/auth/components/login-screen";
import { getCurrentSession } from "@/src/features/auth/server/current-session";
import { getAuthSetupState } from "@/src/features/auth/server/config";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/");
  }

  return <LoginScreen setupState={getAuthSetupState()} />;
}
