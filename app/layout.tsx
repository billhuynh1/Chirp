import './globals.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'Chirp | AI Review Assistant',
  description:
    'AI review assistant for home service businesses using Google Business Profile.'
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
      <body suppressHydrationWarning className="min-h-[100dvh] overflow-x-hidden bg-background text-foreground antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (() => {
              const root = document.documentElement;
              const THEME_STORAGE_KEY = 'chirp-theme';
              const media = window.matchMedia('(prefers-color-scheme: dark)');
              const getSavedTheme = () => {
                try {
                  return localStorage.getItem(THEME_STORAGE_KEY);
                } catch {
                  return null;
                }
              };
              const applyTheme = () => {
                const savedTheme = getSavedTheme();
                const shouldUseDark =
                  savedTheme === 'dark' ||
                  (savedTheme !== 'light' && media.matches);
                root.classList.toggle('dark', shouldUseDark);
              };
              applyTheme();
              media.addEventListener('change', () => {
                const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
                if (!savedTheme) {
                  applyTheme();
                }
              });
            })();
          `}
        </Script>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
