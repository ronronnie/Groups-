import { AuthForm } from "@/features/auth/components/auth-form";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-error";
import { getSafeCallbackPath } from "@/features/auth/lib/callback-path";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  return (
    <AuthForm
      callbackPath={getSafeCallbackPath(params.next)}
      initialError={getAuthErrorMessage(params.error)}
      mode="sign-in"
    />
  );
}
