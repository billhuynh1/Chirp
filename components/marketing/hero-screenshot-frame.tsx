import Image from 'next/image';
import { AlertTriangle, CheckCircle2, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type HeroScreenshotFrameProps = {
  src: string;
  alt: string;
};

export function HeroScreenshotFrame({ src, alt }: HeroScreenshotFrameProps) {
  return (
    <div className="relative mx-auto w-full max-w-[640px]">
      <div className="absolute -left-4 top-8 hidden rounded-2xl border border-rose-200/80 bg-white/90 px-4 py-3 text-sm shadow-sm lg:block dark:border-rose-400/20 dark:bg-[#15191f]/90">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertTriangle className="size-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Urgent review</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Damage claim, needs owner review</p>
          </div>
        </div>
      </div>

      <div className="absolute -right-3 bottom-10 hidden rounded-2xl border border-emerald-200/80 bg-white/90 px-4 py-3 text-sm shadow-sm md:block dark:border-emerald-400/20 dark:bg-[#15191f]/90">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="size-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Draft ready</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Reply ready to edit</p>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,239,232,0.94))] p-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(11,16,22,0.98))] dark:shadow-[0_24px_60px_rgba(2,6,23,0.4)]">
        <div className="rounded-[1.55rem] border border-black/10 bg-white/90 p-3 dark:border-white/10 dark:bg-[#0f141a]">
          <div className="flex items-center justify-between rounded-[1.2rem] border border-black/5 bg-[#fbf8f3] px-4 py-3 dark:border-white/5 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#1f2a2a] text-white">
                <Inbox className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Chirp inbox</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Google reviews</p>
              </div>
            </div>
            <Badge variant="warning" className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
              3 need approval
            </Badge>
          </div>

          <div className="relative mt-3 overflow-hidden rounded-[1.4rem] border border-black/10 bg-[#f4efe8] dark:border-white/10 dark:bg-[#0b1117]">
            <Image
              src={src}
              alt={alt}
              width={1260}
              height={920}
              priority
              className="h-auto w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
