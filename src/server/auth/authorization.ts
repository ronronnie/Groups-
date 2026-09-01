export class AuthorizationError extends Error {
  readonly status = 403;

  constructor(message = "You are not authorized to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

type AuthenticatedUser = { id: string };

export function assertAuthenticated<T extends AuthenticatedUser>(
  user: T | null | undefined,
): asserts user is T {
  if (!user) {
    throw new AuthorizationError("Authentication is required.");
  }
}

export function assertResourceOwner(user: AuthenticatedUser, ownerId: string) {
  if (user.id !== ownerId) {
    throw new AuthorizationError();
  }
}
