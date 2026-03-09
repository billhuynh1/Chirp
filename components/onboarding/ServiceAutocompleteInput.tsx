'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';

type ServiceAutocompleteInputProps = {
  id: string;
  name: string;
  defaultValue: string;
  suggestions: string[];
  comingSoon: readonly string[];
};

export function ServiceAutocompleteInput({
  id,
  name,
  defaultValue,
  suggestions,
  comingSoon
}: ServiceAutocompleteInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);

  const normalizedQuery = value.trim().toLowerCase();

  const filteredAvailable = useMemo(() => {
    if (!normalizedQuery) {
      return suggestions;
    }

    return suggestions.filter((option) => option.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, suggestions]);

  const filteredComingSoon = useMemo(() => {
    if (!normalizedQuery) {
      return [...comingSoon];
    }

    return comingSoon.filter((option) => option.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, comingSoon]);

  const showMenu = isOpen && (filteredAvailable.length > 0 || filteredComingSoon.length > 0);

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        value={value}
        autoComplete="off"
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 120);
        }}
        onChange={(event) => {
          setValue(event.target.value);
          setIsOpen(true);
        }}
        className="mt-2 rounded-2xl border-0 shadow-none"
      />

      {showMenu ? (
        <div className="absolute z-20 mt-2 w-full rounded-xl bg-popover p-1 shadow-sm">
          {filteredAvailable.length > 0 ? (
            <>
              <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Available now
              </div>
              {filteredAvailable.map((option) => (
                <button
                  key={option}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setValue(option);
                    setIsOpen(false);
                  }}
                  className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-popover-foreground transition hover:bg-accent hover:text-accent-foreground"
                >
                  {option}
                </button>
              ))}
            </>
          ) : null}

          {filteredComingSoon.length > 0 ? (
            <>
              <div className="mt-1 px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Coming soon
              </div>
              {filteredComingSoon.map((option) => (
                <div
                  key={option}
                  aria-disabled="true"
                  className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-muted-foreground opacity-70"
                >
                  {option} (coming soon)
                </div>
              ))}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
