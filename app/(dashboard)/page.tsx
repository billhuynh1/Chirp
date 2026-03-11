import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  Inbox,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wrench
} from 'lucide-react';
import { FeatureCard } from '@/components/marketing/feature-card';
import { HeroScreenshotFrame } from '@/components/marketing/hero-screenshot-frame';
import { MetricPill } from '@/components/marketing/metric-pill';
import { SectionHeading } from '@/components/marketing/section-heading';
import { WorkflowStep } from '@/components/marketing/workflow-step';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const features = [
  {
    icon: Inbox,
    title: 'All reviews in one inbox',
    description:
      'See new reviews in one place instead of checking each location by hand.'
  },
  {
    icon: ShieldCheck,
    title: 'Extra caution for risky reviews',
    description:
      '1-star reviews, damage claims, and billing disputes stay flagged and require approval.'
  },
  {
    icon: ClipboardCheck,
    title: 'Manual posting stays in your control',
    description:
      'Edit, approve, copy, and mark replies as posted with a clear review step.'
  }
];

const workflowSteps = [
  {
    number: '01',
    icon: Inbox,
    title: 'Sync reviews into one queue',
    description:
      'Chirp pulls in Google Business Profile reviews so your team can work from one inbox.'
  },
  {
    number: '02',
    icon: TriangleAlert,
    title: 'Flag what needs attention',
    description:
      'Negative reviews are tagged by issue and urgency so the right ones rise to the top.'
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'Write a safe first draft',
    description:
      'Draft replies stay factual and careful around liability, refunds, and open issues.'
  },
  {
    number: '04',
    icon: CheckCircle2,
    title: 'Approve, edit, and post manually',
    description:
      'Review the draft, make changes, post it in Google, and mark it complete.'
  }
];

const trustPills = [
  'Google Business Profile first',
  'Built for plumbing businesses',
  'Manual approval for risky reviews',
  'Email alerts for urgent negatives'
];

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_top_left,_rgba(200,92,54,0.18),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(31,42,42,0.08),_transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(240,183,160,0.14),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(148,163,184,0.08),_transparent_30%)]" />
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(520px,0.98fr)]">
            <div>
              <Badge className="text-primary rounded-full border-primary/20 bg-primary/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] dark:border-[#f0b7a0]/20 dark:bg-white/5 dark:text-[#f7c8b6]">
                AI review operations for plumbers
              </Badge>
              <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-[4.2rem] lg:leading-[1.02] dark:text-white">
                Reply to Google reviews faster, with less risk.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                Chirp gives plumbing businesses one inbox for Google reviews,
                safe draft replies, and a clear approval flow for negative or sensitive reviews.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-[#1f2a2a] px-6 text-white hover:bg-[#162020] dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  <Link href="/sign-up">
                    Create account
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-border/70 bg-card/80 px-6 shadow-none dark:border-white/10 dark:bg-white/5"
                >
                  <Link href="/pricing">See pricing</Link>
                </Button>
              </div>
              <ul className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="mt-1 size-2 rounded-full bg-[#c85c36]" />
                  One queue for every new review across locations
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 size-2 rounded-full bg-[#c85c36]" />
                  Conservative AI replies for risky situations
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 size-2 rounded-full bg-[#c85c36]" />
                  Manual approval before anything goes public
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 size-2 rounded-full bg-[#c85c36]" />
                  Fast triage for urgent negative reviews
                </li>
              </ul>
            </div>

            <HeroScreenshotFrame
              src="/images/chirp-inbox-placeholder.svg"
              alt="Preview of Chirp's review inbox interface showing urgent reviews, safe AI drafts, and approval status."
            />
          </div>

          <div className="mt-10 flex flex-wrap gap-3 border-t border-border/70 pt-8 dark:border-white/10">
            {trustPills.map((pill) => (
              <MetricPill key={pill} label={pill} />
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Built for review operations"
          title="Clear tools for teams that need to respond quickly"
          description="See what needs attention, write a careful reply, and keep the owner in control."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="From new review to approved reply"
          description="Each step is simple: sync, review, draft, approve."
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-4">
          {workflowSteps.map((step) => (
            <WorkflowStep
              key={step.number}
              number={step.number}
              icon={step.icon}
              title={step.title}
              description={step.description}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-[2rem] bg-card/90 shadow-none dark:bg-[linear-gradient(145deg,rgba(21,27,36,0.95),rgba(11,16,24,0.96))]">
            <CardHeader className="space-y-4">
              <Badge className="text-primary w-fit rounded-full border-primary/20 bg-primary/10 dark:border-[#f0b7a0]/20 dark:bg-[#f0b7a0]/10 dark:text-[#f7c8b6]">
                Review inbox
              </Badge>
              <CardTitle className="text-3xl tracking-tight text-slate-950 dark:text-white">
                Built to help owners act faster
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="space-y-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                <p>
                  The inbox shows what is new, what is risky, and what is ready for approval.
                </p>
                <p>
                  Teams can move faster without losing track of what needs a human review.
                </p>
              </div>
              <div className="rounded-[1.6rem] border border-border/70 bg-card/85 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl border border-rose-200/80 bg-rose-50/80 p-4 dark:border-rose-400/20 dark:bg-rose-500/10">
                    <div>
                      <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">Urgent complaint</p>
                      <p className="mt-1 text-sm text-rose-700 dark:text-rose-200/80">
                        Late arrival, leak unresolved, asking for callback.
                      </p>
                    </div>
                    <Badge variant="danger">Owner review</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-secondary/30 bg-secondary/10 p-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Draft generated</p>
                      <p className="mt-1 text-sm text-secondary">
                        Safe reply ready for edit before posting.
                      </p>
                    </div>
                    <Badge variant="warning">Needs approval</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                    <div>
                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Reply posted</p>
                      <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-200/80">
                        Workflow complete and tracked for the team.
                      </p>
                    </div>
                    <Badge variant="success">Complete</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="rounded-[2rem] bg-card/85 shadow-none dark:bg-white/5">
              <CardHeader>
                <div className="text-primary flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 dark:border-white/10 dark:bg-white/5 dark:text-[#f7c8b6]">
                  <Sparkles className="size-5" />
                </div>
                <CardTitle className="pt-4 text-2xl text-slate-950 dark:text-white">
                  Safe draft replies
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                Use AI to speed up the first draft, then review it before it goes live.
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] bg-card/85 shadow-none dark:bg-white/5">
              <CardHeader>
                <div className="text-primary flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 dark:border-white/10 dark:bg-white/5 dark:text-[#f7c8b6]">
                  <BellRing className="size-5" />
                </div>
                <CardTitle className="pt-4 text-2xl text-slate-950 dark:text-white">
                  Alerts for urgent complaints
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                Urgent negative reviews stay visible so the owner can step in quickly.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <Card className="overflow-hidden rounded-[2.25rem] bg-[#1f2a2a] text-white shadow-none dark:bg-[linear-gradient(145deg,#111821_0%,#172126_100%)]">
          <CardContent className="grid gap-8 px-8 py-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-12 lg:py-12">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#efb49f]">
                <Wrench className="size-4" />
                Made for plumbing businesses
              </div>
              <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Start with one inbox and a simpler review process.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Keep new reviews, urgent complaints, draft replies, and approvals in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full bg-[#c85c36] px-6 text-white hover:bg-[#b64a25]">
                <Link href="/sign-up">Create account</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-white/20 bg-white/0 px-6 text-white hover:bg-white/10 hover:text-white">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
