import { redirect } from "next/navigation";
import { HomePage } from "@/features/marketing/components/home-page";
import { getCurrentUser } from "@/server/auth/current-user";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/app");
  }

  return <HomePage />;
}
