import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function FeatureCard({
  icon: Icon,
  title,
  description
}: FeatureCardProps) {
  return (
    <Card className="h-full rounded-[1.75rem] bg-card/85 shadow-none dark:bg-white/5">
      <CardHeader className="space-y-4">
        <div className="text-primary flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 dark:border-[#f0b7a0]/20 dark:bg-[#f0b7a0]/10 dark:text-[#f7c8b6]">
          <Icon className="size-5" />
        </div>
        <CardTitle className="text-xl text-slate-950 dark:text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-7 text-slate-600 dark:text-slate-300">
        {description}
      </CardContent>
    </Card>
  );
}
