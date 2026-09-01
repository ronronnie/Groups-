import { AuthForm } from "@/features/auth/components/auth-form";
import { getSafeCallbackPath } from "@/features/auth/lib/callback-path";

type SignInPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  return (
    <AuthForm callbackPath={getSafeCallbackPath(params.next)} mode="sign-in" />
  );
}
