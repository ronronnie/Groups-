import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen px-shell py-6 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <Link className="w-fit" href="/">
          <BrandMark />
        </Link>
        <div className="grid flex-1 place-items-center py-4">{children}</div>
      </div>
    </main>
  );
}
