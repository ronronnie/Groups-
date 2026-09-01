"use client";

import { Search, X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onClear, value, ...props }, ref) => (
    <div className="relative min-w-0">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={ref}
        className={cn(
          "font-secondary h-11 w-full rounded-md border border-input bg-surface pr-10 pl-10 text-sm outline-none transition-[border-color,box-shadow] duration-[var(--motion-fast)] placeholder:text-muted-foreground hover:border-border-strong focus:border-ring focus:ring-2 focus:ring-ring/25",
          className,
        )}
        type="search"
        value={value}
        {...props}
      />
      {onClear && value ? (
        <button
          aria-label="Clear search"
          className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          onClick={onClear}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  ),
);
SearchInput.displayName = "SearchInput";

export { SearchInput };
