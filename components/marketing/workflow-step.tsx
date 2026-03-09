import { LucideIcon } from 'lucide-react';

type WorkflowStepProps = {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

export function WorkflowStep({
  number,
  icon: Icon,
  title,
  description
}: WorkflowStepProps) {
  return (
    <div className="relative rounded-[1.75rem] border border-black/10 bg-white/80 p-6 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between">
        <div className="flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          <Icon className="size-5" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
          {number}
        </span>
      </div>
      <h3 className="mt-6 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
        {description}
      </p>
    </div>
  );
}
