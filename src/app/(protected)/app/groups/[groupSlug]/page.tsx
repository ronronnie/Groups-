import { redirect } from "next/navigation";

export default async function GroupHomePage({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  redirect(`/app/groups/${groupSlug}/for-you`);
}
