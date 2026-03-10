'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FocusEvent, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type TimezoneAutocompleteInputProps = {
  id: string;
  name: string;
  defaultValue: string;
  suggestions: string[];
  className?: string;
  ariaDescribedBy?: string;
  required?: boolean;
  pattern?: string;
  title?: string;
  lockOnSelect?: boolean;
  onValueChange?: (value: string) => void;
  onLockChange?: (locked: boolean) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onInvalid?: (event: FormEvent<HTMLInputElement>) => void;
  ariaInvalid?: boolean;
};

export function TimezoneAutocompleteInput({
  id,
  name,
  defaultValue,
  suggestions,
  className,
  ariaDescribedBy,
  required,
  pattern,
  title,
  lockOnSelect = false,
  onValueChange,
  onLockChange,
  onBlur,
  onInvalid,
  ariaInvalid
}: TimezoneAutocompleteInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const isReadOnly = lockOnSelect && isLocked;

  useEffect(() => {
    if (!lockOnSelect && isLocked) {
      setIsLocked(false);
    }
  }, [isLocked, lockOnSelect]);

  const normalizedQuery = value.trim().toLowerCase().replaceAll('_', ' ');
  const activeQuery = isLocked ? '' : normalizedQuery;

  const filteredSuggestions = useMemo(() => {
    if (!activeQuery) {
      return suggestions;
    }

    return suggestions.filter((option) => option.toLowerCase().includes(activeQuery));
  }, [activeQuery, suggestions]);

  const showMenu = isOpen && filteredSuggestions.length > 0;

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        required={required}
        pattern={pattern}
        title={title}
        value={value}
        autoComplete="off"
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        readOnly={isReadOnly}
        onFocus={() => setIsOpen(true)}
        onBlur={(event) => {
          setTimeout(() => setIsOpen(false), 120);
          onBlur?.(event);
        }}
        onInvalid={onInvalid}
        onChange={(event) => {
          if (isReadOnly) {
            return;
          }
          setValue(event.target.value);
          onValueChange?.(event.target.value);
          setIsOpen(true);
        }}
        className={cn('mt-2 rounded-2xl border-0 shadow-none', className)}
      />

      {showMenu ? (
        <div className="absolute z-20 mt-2 w-full rounded-xl bg-popover p-1 shadow-sm">
          <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Timezones
          </div>
          {filteredSuggestions.map((option) => (
            <button
              key={option}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                setValue(option);
                onValueChange?.(option);
                setIsOpen(false);
                if (lockOnSelect) {
                  setIsLocked(true);
                  onLockChange?.(true);
                }
              }}
              className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-popover-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
