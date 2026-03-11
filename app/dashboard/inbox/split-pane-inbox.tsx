'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Search, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { RatingBadge, ReviewStatusBadge, UrgencyBadge } from '@/components/reviews/review-badges';

export type MockReview = {
  id: string;
  reviewerName: string;
  rating: number;
  text: string;
  locationName: string;
  date: string;
  status: 'needs_review' | 'draft_ready' | 'completed';
  urgency: 'urgent' | 'high' | 'medium' | 'low';
  analysis: {
    summary: string;
    recommendation: string;
    sentiment: string;
    riskLevel: string;
    tags: string[];
  };
  draftText: string;
  finalPostedText?: string;
};

type FilterType = 'all' | 'needs_reply' | 'replied' | 'urgent';
type SortType = 'urgency' | 'newest' | 'rating_high' | 'rating_low';

export function SplitPaneInbox({ initialReviews }: { initialReviews: MockReview[] }) {
  const { toast } = useToast();
  
  // State
  const [reviews, setReviews] = useState<MockReview[]>(initialReviews);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('urgency');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived filtered & sorted reviews
  const filteredReviews = useMemo(() => {
    let result = reviews;

    // Search
    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.text.toLowerCase().includes(lowerSearch) ||
          r.reviewerName.toLowerCase().includes(lowerSearch)
      );
    }

    // Filter
    switch (filter) {
      case 'needs_reply':
        result = result.filter((r) => r.status !== 'completed');
        break;
      case 'replied':
        result = result.filter((r) => r.status === 'completed');
        break;
      case 'urgent':
        result = result.filter((r) => r.urgency === 'urgent' || r.urgency === 'high');
        break;
      case 'all':
      default:
        break;
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sort === 'urgency') {
        const urgencyMap = { urgent: 4, high: 3, medium: 2, low: 1 };
        const diff = urgencyMap[b.urgency] - urgencyMap[a.urgency];
        if (diff !== 0) return diff;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sort === 'newest') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sort === 'rating_high') {
        return b.rating - a.rating;
      }
      if (sort === 'rating_low') {
        return a.rating - b.rating;
      }
      return 0;
    });

    return result;
  }, [reviews, search, filter, sort]);

  // Selected review
  const selectedReview = reviews.find((r) => r.id === selectedId) || null;

  // Initial Auto-select logic
  useEffect(() => {
    if (!selectedId && filteredReviews.length > 0) {
      // 1. urgent + needs reply
      let next = filteredReviews.find((r) => (r.urgency === 'urgent' || r.urgency === 'high') && r.status !== 'completed');
      
      // 2. needs reply
      if (!next) {
        next = filteredReviews.find((r) => r.status !== 'completed');
      }

      // 3. first review
      if (!next) {
        next = filteredReviews[0];
      }

      if (next) {
        setSelectedId(next.id);
      }
    }
  }, [selectedId, filteredReviews]);

  // Actions
  const handlePostReply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedReview) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const text = formData.get('postedText') as string;

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Update state to mark as completed
    const updatedReviews = reviews.map((r) => {
      if (r.id === selectedReview.id) {
        return {
          ...r,
          status: 'completed' as const,
          finalPostedText: text
        };
      }
      return r;
    });
    
    setReviews(updatedReviews);
    setIsSubmitting(false);

    // Auto-advance logic on the updated dataset
    // Re-evaluate what the "next" highest priority is
    const targetStatusFilter = 'completed';
    // Let's find pending reviews (not completed) that are NOT the current one (it might still briefly be in filteredReviews if filter is "all")
    const pendingReviews = updatedReviews.filter(r => r.status !== 'completed');
    
    let nextReview = null;
    if (pendingReviews.length > 0) {
        // Priority 1: urgent
        nextReview = pendingReviews.find(r => r.urgency === 'urgent' || r.urgency === 'high');
        // Priority 2: any pending
        if (!nextReview) {
            nextReview = pendingReviews[0];
        }
    }

    if (nextReview) {
        setSelectedId(nextReview.id);
        toast({
           title: 'Reply posted',
           description: `Moved to next ${nextReview.urgency === 'urgent' ? 'urgent ' : ''}review`,
           variant: 'success',
           durationMs: 4000
        });
    } else {
        setSelectedId(null);
        toast({
           title: 'Reply posted',
           description: 'Your reply has been published successfully. You are all caught up!',
           variant: 'success',
           durationMs: 4000
        });
    }
  };

  function humanizeToken(value?: string | null, fallback = 'Pending') {
    if (!value) return fallback;
    const normalized = value.replaceAll('_', ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  function sentimentClass(sentiment?: string | null) {
    const normalized = sentiment?.toLowerCase() ?? '';
    if (normalized.includes('positive')) return 'text-success';
    if (normalized.includes('negative')) return 'text-destructive';
    if (normalized.includes('mixed')) return 'text-warning';
    if (normalized.includes('neutral')) return 'text-muted-foreground';
    return 'text-foreground';
  }

  return (
    <div className="flex h-full flex-col lg:flex-row gap-6">
      {/* LEFT PANEL: LIST */}
      <div className="flex w-full flex-col gap-4 lg:w-1/3 xl:w-[400px] 2xl:w-[450px]">
        {/* Filters & Search Header */}
        <div className="flex flex-col gap-3 shrink-0">
          <div className="relative w-full">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reviews..."
              className="rounded-full pl-9"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {(['all', 'needs_reply', 'replied', 'urgent'] as FilterType[]).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                className="rounded-full h-7 text-xs px-3"
                onClick={() => setFilter(f)}
              >
                {humanizeToken(f)}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
             <span className="shrink-0">Sort by:</span>
             <select 
               className="bg-transparent text-foreground outline-none cursor-pointer"
               value={sort}
               onChange={(e) => setSort(e.target.value as SortType)}
             >
                <option value="urgency">Urgency First</option>
                <option value="newest">Newest First</option>
                <option value="rating_high">Highest Rating</option>
                <option value="rating_low">Lowest Rating</option>
             </select>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3 pb-8 custom-scrollbar">
          {filteredReviews.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm bg-muted/30 rounded-[1.5rem]">
              No reviews match your filters.
            </div>
          ) : (
            filteredReviews.map((r) => {
              const isSelected = selectedId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left p-4 rounded-[1.5rem] transition-all duration-200 border ${
                    isSelected 
                      ? 'border-primary ring-1 ring-primary/50 bg-primary/5 shadow-sm' 
                      : 'border-transparent bg-transparent hover:bg-muted/30'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <RatingBadge rating={r.rating} />
                    <ReviewStatusBadge status={r.status} />
                    <UrgencyBadge urgency={r.urgency} />
                  </div>
                  <div className="flex justify-between items-baseline mb-1">
                     <span className="font-semibold text-sm line-clamp-1">{r.reviewerName}</span>
                     <span className="text-xs text-muted-foreground shrink-0">{r.date.substring(0, 10)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {r.text}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: DETAIL & ACTIONS */}
      <div className="flex-1 overflow-y-auto bg-muted/90 rounded-[1.5rem] border-0 shadow-none custom-scrollbar relative">
        {!selectedReview ? (
           <div className="flex flex-col items-center justify-center h-full text-muted-foreground w-full p-10">
               <div className="rounded-full bg-muted p-4 mb-4">
                  <CheckCircle2 size={32} className="opacity-50" />
               </div>
               <h3 className="text-lg font-medium text-foreground mb-2">You're all caught up!</h3>
               <p className="text-sm max-w-[250px] text-center">No reviews selected. Choose a review from the left panel to begin.</p>
           </div>
        ) : (
          <div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto">
             {/* Review Header */}
             <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <RatingBadge rating={selectedReview.rating} />
                  <ReviewStatusBadge status={selectedReview.status} />
                  <UrgencyBadge urgency={selectedReview.urgency} />
                </div>
                <h1 className="text-2xl font-semibold break-words">
                  {selectedReview.reviewerName} at {selectedReview.locationName}
                </h1>
                <Card className="mt-4 border-0 shadow-none bg-transparent">
                  <CardContent className="p-0 text-base leading-relaxed text-foreground">
                    {selectedReview.text}
                  </CardContent>
                </Card>
             </div>

             {/* AI Analysis Grid */}
             <div className="grid gap-4 md:grid-cols-2">
                <Card className="rounded-[1.25rem] dark:bg-background">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
                      <Sparkles className="size-3.5" />
                      AI Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div>
                         <div className="text-xs text-muted-foreground font-medium mb-1">Summary</div>
                         <p className="text-sm">{selectedReview.analysis.summary}</p>
                     </div>
                     <div>
                         <div className="text-xs text-muted-foreground font-medium mb-1">Recommended Action</div>
                         <p className="text-sm text-primary font-medium">
                           {humanizeToken(selectedReview.analysis.recommendation, 'No recommendation')}
                         </p>
                     </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[1.25rem] dark:bg-background">
                  <CardContent className="p-6 space-y-5">
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Sentiment</div>
                             <p className={`text-sm font-medium ${sentimentClass(selectedReview.analysis.sentiment)}`}>
                               {humanizeToken(selectedReview.analysis.sentiment)}
                             </p>
                         </div>
                         <div>
                             <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Risk Profile</div>
                             <p className={`text-sm font-medium ${selectedReview.analysis.riskLevel.includes('CRITICAL') ? 'text-destructive' : ''}`}>
                                {humanizeToken(selectedReview.analysis.riskLevel)}
                             </p>
                         </div>
                     </div>
                     <div>
                         <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Extracted Tags</div>
                         <div className="flex flex-wrap gap-2">
                            {selectedReview.analysis.tags.map(tag => (
                                <span key={tag} className="bg-muted text-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-border/50 bg-background/50">
                                   {humanizeToken(tag)}
                                </span>
                            ))}
                         </div>
                     </div>
                  </CardContent>
                </Card>
             </div>

             <hr className="border-border/50" />

             {/* Reply Actions */}
             <Card className="rounded-[1.25rem] shadow-none border-0 bg-transparent gap-2 py-0">
                 <CardHeader className="px-0 sm:px-6 pb-2">
                   <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      Reply Draft
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="px-0 sm:px-6 space-y-3">
                   {selectedReview.status === 'completed' && selectedReview.finalPostedText ? (
                      <div className="bg-success/10 border border-success/20 rounded-[1.5rem] p-5">
                         <div className="text-sm font-medium text-success mb-2 flex items-center gap-2">
                            <CheckCircle2 className="size-4" /> Final Reply Posted
                         </div>
                         <p className="text-sm text-foreground/90 whitespace-pre-wrap">{selectedReview.finalPostedText}</p>
                      </div>
                   ) : (
                       <form onSubmit={handlePostReply} className="space-y-3">
                           <Textarea 
                              name="postedText"
                              defaultValue={selectedReview.draftText}
                              className="min-h-[160px] rounded-[1.5rem] border-border/60 bg-card text-sm leading-relaxed dark:bg-background"
                           />
                           <div className="flex flex-wrap items-center gap-3">
                              <Button 
                                 type="submit" 
                                 className="rounded-full shadow-sm"
                                 disabled={isSubmitting}
                              >
                                  {isSubmitting ? (
                                      <><Loader2 className="mr-2 size-4 animate-spin" /> Posting...</>
                                  ) : (
                                      'Post Reply'
                                  )}
                              </Button>
                              <Button type="button" variant="outline" className="rounded-full">
                                  Regenerate Draft
                              </Button>
                              <Button type="button" variant="ghost" className="rounded-full text-muted-foreground hover:text-destructive">
                                  Reject & Escalate
                              </Button>
                           </div>
                       </form>
                   )}
                 </CardContent>
             </Card>
          </div>
        )}
      </div>

    </div>
  );
}