import './globals.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Chirp | AI Review Assistant',
  description:
    'AI review assistant for plumbing and home service businesses using Google Business Profile.'
};

export const viewport: Viewport = {
  maximumScale: 1
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-[100dvh] bg-background text-foreground antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (() => {
              const root = document.documentElement;
              const media = window.matchMedia('(prefers-color-scheme: dark)');
              const applyTheme = () => root.classList.toggle('dark', media.matches);
              applyTheme();
              media.addEventListener('change', applyTheme);
            })();
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
