'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type SettingsDropdownOption = {
  value: string;
  label: string;
};

type SettingsDropdownFieldProps = {
  id: string;
  name: string;
  defaultValue: string;
  options: SettingsDropdownOption[];
  className?: string;
};

const triggerClassName =
  'mt-3 flex h-10 w-full items-center justify-between rounded-2xl border border-border/70 bg-muted/70 px-3 text-left text-sm text-foreground shadow-none outline-none transition-[background-color,box-shadow] focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-background';

export function SettingsDropdownField({
  id,
  name,
  defaultValue,
  options,
  className
}: SettingsDropdownFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            id={id}
            type="button"
            className={cn(triggerClassName, className)}
          >
            <span>{selectedOption?.label ?? ''}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-2xl border-border/70 bg-card p-1 shadow-lg"
        >
          <DropdownMenuRadioGroup value={value} onValueChange={setValue}>
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="rounded-xl py-2 pr-3 pl-9"
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
