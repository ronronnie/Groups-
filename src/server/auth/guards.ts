const DEFAULT_AUTHENTICATED_PATH = "/app";

export function getSignInUrl(returnTo: string) {
  const safeReturnTo =
    returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : DEFAULT_AUTHENTICATED_PATH;
  return `/sign-in?next=${encodeURIComponent(safeReturnTo)}`;
}

export function getProtectedRouteRedirect(
  hasSessionCookie: boolean,
  pathname: string,
) {
  return hasSessionCookie ? null : getSignInUrl(pathname);
}
