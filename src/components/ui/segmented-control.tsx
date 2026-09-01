"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface Segment {
  label: string;
  value: string;
}

function SegmentedControl({
  ariaLabel,
  className,
  defaultValue,
  onValueChange,
  options,
  value: controlledValue,
}: Readonly<{
  ariaLabel: string;
  className?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: Segment[];
  value?: string;
}>) {
  const groupId = useId();
  const groupRef = useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? options[0]?.value,
  );
  const value = controlledValue ?? internalValue;

  function select(nextValue: string) {
    if (controlledValue === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  function moveSelection(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const lastIndex = options.length - 1;
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = index === lastIndex ? 0 : index + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = index === 0 ? lastIndex : index - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    }

    if (nextIndex === undefined) return;

    event.preventDefault();
    const option = options[nextIndex];
    if (!option) return;

    select(option.value);
    const controls =
      groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    controls?.[nextIndex]?.focus();
  }

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "inline-grid min-h-10 grid-flow-col rounded-md border border-border bg-secondary p-1",
        className,
      )}
      role="radiogroup"
      ref={groupRef}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            aria-checked={selected}
            className={cn(
              "min-w-20 rounded-sm px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors duration-[var(--motion-fast)] hover:text-foreground",
              selected && "bg-surface text-foreground shadow-xs",
            )}
            id={`${groupId}-${option.value}`}
            key={option.value}
            onClick={() => select(option.value)}
            onKeyDown={(event) => moveSelection(event, index)}
            role="radio"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export { SegmentedControl };
export type { Segment };
