import Image from 'next/image';
import { Inbox, Sparkles } from 'lucide-react';

type HeroScreenshotFrameProps = {
  src: string;
  alt: string;
};

export function HeroScreenshotFrame({ src, alt }: HeroScreenshotFrameProps) {
  return (
    <div className="relative mx-auto w-full max-w-[920px]">
      <div className="marketing-panel rounded-[2.4rem] border border-white/10 bg-[#0c1621] p-4 shadow-[0_24px_48px_rgba(2,6,23,0.28)]">
        <div className="rounded-[1.9rem] border border-white/10 bg-[#101b27] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.45rem] border border-white/10 bg-[#13202d] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[#ff8f70] text-slate-950">
                <Inbox className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Chirp inbox</p>
                <p className="text-xs text-slate-400">Google review workflow</p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-300">
              <p>19 new reviews</p>
              <p className="text-slate-500">3 waiting on approval</p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#081018]">
              <Image
                src={src}
                alt={alt}
                width={1260}
                height={920}
                priority
                className="h-auto w-full"
              />
            </div>

            <div className="space-y-4 rounded-[1.6rem] border border-white/10 bg-[#13202d] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Workflow view
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  See what is new, what is risky, and what is ready for review.
                </p>
              </div>

              <div className="rounded-[1.3rem] border border-white/10 bg-[#162534] p-4">
                <div className="flex items-center gap-2 text-[#7fd6ff]">
                  <Sparkles className="size-4" />
                  <p className="text-sm font-semibold">Draft checks</p>
                </div>
                <ul className="mt-3 space-y-2 text-xs leading-6 text-slate-300">
                  <li>Careful reply draft</li>
                  <li>Manual approval step</li>
                  <li>Clear completion status</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
