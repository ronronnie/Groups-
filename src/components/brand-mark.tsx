import { APP_NAME } from "@/config/brand";

export function BrandMark() {
  return (
    <div className="flex items-center gap-3" aria-label={APP_NAME}>
      <div className="grid size-10 place-items-center border-2 border-foreground bg-accent font-bold shadow-[4px_4px_0_var(--foreground)]">
        G
      </div>
      <span className="text-lg font-semibold tracking-normal">{APP_NAME}</span>
    </div>
  );
}
