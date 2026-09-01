"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogIn } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/config/brand";
import {
  PASSWORD_REQUIREMENTS,
  signInSchema,
  signUpSchema,
} from "@/domains/auth/validation";
import { authClient } from "@/lib/auth-client";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  callbackPath: string;
};

function fieldError(message: string | undefined) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function AuthForm({ mode, callbackPath }: AuthFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const isSignUp = mode === "sign-up";
  const form = useForm<{ name: string; email: string; password: string }>({
    defaultValues: { name: "", email: "", password: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = isSignUp
      ? signUpSchema.safeParse(values)
      : signInSchema.safeParse(values);

    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field === "name" || field === "email" || field === "password") {
          form.setError(field, { message: issue.message });
        }
      }
      return;
    }

    let response;
    if (isSignUp) {
      const signUpValues = signUpSchema.parse(values);
      response = await authClient.signUp.email({
        name: signUpValues.name,
        email: signUpValues.email,
        password: signUpValues.password,
        callbackURL: callbackPath,
      });
    } else {
      const signInValues = signInSchema.parse(values);
      response = await authClient.signIn.email({
        email: signInValues.email,
        password: signInValues.password,
        callbackURL: callbackPath,
      });
    }

    if (response.error) {
      setFormError(response.error.message ?? "Authentication failed.");
      return;
    }

    router.push(callbackPath);
    router.refresh();
  });

  async function continueWithGoogle() {
    setFormError(null);
    setIsGooglePending(true);
    const response = await authClient.signIn.social({
      provider: "google",
      callbackURL: callbackPath,
    });

    if (response.error) {
      setFormError(response.error.message ?? "Google sign-in failed.");
      setIsGooglePending(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-lg border-2 border-border-strong bg-surface p-6 shadow-pop sm:p-8">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="font-secondary text-sm text-muted-foreground">
          {isSignUp
            ? "Use one profile across every group you join."
            : "Sign in to continue to your groups."}
        </p>
      </div>

      <Button
        className="w-full"
        disabled={isGooglePending || form.formState.isSubmitting}
        onClick={continueWithGoogle}
        type="button"
        variant="outline"
      >
        {isGooglePending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <LogIn aria-hidden="true" className="size-4" />
        )}
        Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="font-secondary text-xs uppercase text-muted-foreground">
          or
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form className="space-y-4" noValidate onSubmit={submit}>
        {isSignUp ? (
          <div className="space-y-1.5">
            <label className="font-secondary text-sm font-bold" htmlFor="name">
              Name
            </label>
            <Input autoComplete="name" id="name" {...form.register("name")} />
            {fieldError(form.formState.errors.name?.message)}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label className="font-secondary text-sm font-bold" htmlFor="email">
            Email
          </label>
          <Input
            autoCapitalize="none"
            autoComplete="email"
            id="email"
            inputMode="email"
            type="email"
            {...form.register("email")}
          />
          {fieldError(form.formState.errors.email?.message)}
        </div>

        <div className="space-y-1.5">
          <label
            className="font-secondary text-sm font-bold"
            htmlFor="password"
          >
            Password
          </label>
          <Input
            autoComplete={isSignUp ? "new-password" : "current-password"}
            id="password"
            type="password"
            {...form.register("password")}
          />
          {isSignUp ? (
            <p className="font-secondary text-xs text-muted-foreground">
              {PASSWORD_REQUIREMENTS}
            </p>
          ) : null}
          {fieldError(form.formState.errors.password?.message)}
        </div>

        {formError ? (
          <p
            aria-live="polite"
            className="text-sm text-destructive"
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        <Button
          className="w-full"
          disabled={form.formState.isSubmitting || isGooglePending}
          type="submit"
          variant="brand"
        >
          {form.formState.isSubmitting ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : null}
          {isSignUp ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center font-secondary text-sm text-muted-foreground">
        {isSignUp ? "Already have an account?" : `New to ${APP_NAME}?`}{" "}
        <Link
          className="font-bold text-foreground underline underline-offset-4"
          href={isSignUp ? "/sign-in" : "/sign-up"}
        >
          {isSignUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}
