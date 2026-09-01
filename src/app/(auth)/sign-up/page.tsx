import { AuthForm } from "@/features/auth/components/auth-form";
import { getSafeCallbackPath } from "@/features/auth/lib/callback-path";

type SignUpPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  return (
    <AuthForm callbackPath={getSafeCallbackPath(params.next)} mode="sign-up" />
  );
}
