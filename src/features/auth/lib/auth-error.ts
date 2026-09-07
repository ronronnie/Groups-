const AUTH_ERROR_MESSAGES: Record<string, string> = {
  state_mismatch:
    "Your Google sign-in session expired or started on a different address. Please try again.",
};

export function getAuthErrorMessage(error: string | string[] | undefined) {
  const code = Array.isArray(error) ? error[0] : error;

  if (!code) return undefined;

  return (
    AUTH_ERROR_MESSAGES[code] ??
    "Google sign-in could not be completed. Please try again."
  );
}
