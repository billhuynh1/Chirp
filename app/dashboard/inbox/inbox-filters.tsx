import Link from 'next/link';
import { ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  buildClearAllInboxHref,
  buildInboxHref,
  countActiveInboxFilters,
  type InboxFilterState,
  type ReviewStatusGroup
} from '@/lib/services/reviews/inbox-filters';

const STATUS_GROUP_OPTIONS: Array<{ label: string; value?: ReviewStatusGroup }> = [
  { label: 'All' },
  { label: 'Needs Review', value: 'needs_review' },
  { label: 'Draft Ready', value: 'draft_ready' },
  { label: 'Ready to Post', value: 'ready_to_post' },
  { label: 'Completed', value: 'completed' }
];

const URGENCY_OPTIONS: Array<{ label: string; value?: string }> = [
  { label: 'All' },
  { label: 'Urgent', value: 'urgent' },
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' }
];

const SORT_OPTIONS: Array<{ label: string; value?: 'urgency_then_newest' | 'newest' }> = [
  { label: 'Urgency first' },
  { label: 'Newest first', value: 'newest' }
];

const RATING_OPTIONS: Array<{ label: string; value?: number }> = [
  { label: 'All' },
  { label: '1★', value: 1 },
  { label: '2★', value: 2 },
  { label: '3★', value: 3 },
  { label: '4★', value: 4 },
  { label: '5★', value: 5 }
];

type InboxFiltersProps = {
  currentQuery: URLSearchParams;
  state: InboxFilterState;
  locations: Array<{ id: number; name: string }>;
};

function ChipLink({
  href,
  label,
  active
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Button asChild variant={active ? 'default' : 'outline'} size="sm" className="rounded-full">
      <Link href={href}>{label}</Link>
    </Button>
  );
}

export function InboxFilters({ currentQuery, state, locations }: InboxFiltersProps) {
  const activeCount = countActiveInboxFilters(state);
  const clearAllHref = buildClearAllInboxHref(currentQuery);
  const hasNonSearchActiveFilters =
    Boolean(state.statusGroup || state.status || state.urgency || state.rating || state.locationId) ||
    state.sort === 'newest';
  const quickFiltersId = 'inbox-quick-filters';

  return (
    <Card className="bg-card shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Filters</CardTitle>
          <p className="text-muted-foreground text-sm">{activeCount} active</p>
        </div>

        <form method="get" className="flex flex-wrap items-center gap-3">
          {state.statusGroup ? (
            <input type="hidden" name="statusGroup" value={state.statusGroup} />
          ) : null}
          {state.status ? <input type="hidden" name="status" value={state.status} /> : null}
          {state.urgency ? <input type="hidden" name="urgency" value={state.urgency} /> : null}
          {state.rating ? <input type="hidden" name="rating" value={String(state.rating)} /> : null}
          {state.locationId ? (
            <input type="hidden" name="location" value={String(state.locationId)} />
          ) : null}
          {state.sort ? <input type="hidden" name="sort" value={state.sort} /> : null}

          <div className="relative min-w-[260px] flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              name="search"
              defaultValue={state.search ?? ''}
              placeholder="Search review text or reviewer"
              className="rounded-2xl pl-9"
            />
          </div>
          <Button className="rounded-full">Search</Button>
        </form>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
          <input
            id={quickFiltersId}
            type="checkbox"
            className="peer sr-only"
            defaultChecked={hasNonSearchActiveFilters}
          />
          <label
            htmlFor={quickFiltersId}
            className="text-foreground peer-checked:[&>svg]:rotate-180 flex cursor-pointer items-center justify-between text-sm font-medium"
          >
            Quick filters
            <ChevronDown
              className="text-muted-foreground size-4 transition-transform duration-300"
              aria-hidden="true"
            />
          </label>

          <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out peer-checked:grid-rows-[1fr]">
            <div className="overflow-hidden">
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.14em]">Status</div>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_GROUP_OPTIONS.map((option) => (
                      <ChipLink
                        key={option.label}
                        href={buildInboxHref(currentQuery, {
                          statusGroup: option.value ?? null,
                          status: null
                        })}
                        label={option.label}
                        active={
                          option.value
                            ? state.statusGroup === option.value
                            : !state.statusGroup && !state.status
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
                    Urgency
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {URGENCY_OPTIONS.map((option) => (
                      <ChipLink
                        key={option.label}
                        href={buildInboxHref(currentQuery, { urgency: option.value ?? null })}
                        label={option.label}
                        active={option.value ? state.urgency === option.value : !state.urgency}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.14em]">Rating</div>
                  <div className="flex flex-wrap gap-2">
                    {RATING_OPTIONS.map((option) => (
                      <ChipLink
                        key={option.label}
                        href={buildInboxHref(currentQuery, {
                          rating: option.value ? String(option.value) : null
                        })}
                        label={option.label}
                        active={option.value ? state.rating === option.value : !state.rating}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.14em]">Sort</div>
                  <div className="flex flex-wrap gap-2">
                    {SORT_OPTIONS.map((option) => (
                      <ChipLink
                        key={option.label}
                        href={buildInboxHref(currentQuery, { sort: option.value ?? null })}
                        label={option.label}
                        active={
                          option.value
                            ? state.sort === option.value
                            : !state.sort || state.sort === 'urgency_then_newest'
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
                    Location
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ChipLink
                      href={buildInboxHref(currentQuery, { location: null })}
                      label="All locations"
                      active={!state.locationId}
                    />
                    {locations.map((location) => (
                      <ChipLink
                        key={location.id}
                        href={buildInboxHref(currentQuery, { location: String(location.id) })}
                        label={location.name}
                        active={state.locationId === location.id}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <ChipLink
                    href={clearAllHref}
                    label="Clear all filters"
                    active={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
