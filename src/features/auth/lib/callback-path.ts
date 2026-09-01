export function getSafeCallbackPath(value: string | string[] | undefined) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/app";
  }

  return value;
}
