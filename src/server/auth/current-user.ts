import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/server/auth/auth";
import { getSignInUrl } from "@/server/auth/guards";

export async function getCurrentSession() {
  const requestHeaders = await headers();

  return getAuth().api.getSession({
    headers: requestHeaders,
  });
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function requireCurrentUser(returnTo = "/app") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(getSignInUrl(returnTo));
  }

  return user;
}
