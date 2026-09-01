import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getProtectedRouteRedirect } from "@/server/auth/guards";

export function proxy(request: NextRequest) {
  const redirectPath = getProtectedRouteRedirect(
    Boolean(getSessionCookie(request)),
    request.nextUrl.pathname,
  );

  if (redirectPath) {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
