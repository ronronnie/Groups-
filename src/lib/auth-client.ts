"use client";

import { createAuthClient } from "better-auth/react";

// Native clients can create their own Better Auth client against the same API.
export const authClient = createAuthClient();
