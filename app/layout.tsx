import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Care Rota - day operations board (sample data)',
  description: 'Independent demo: a persisted home-care day board with deterministic attention rules. Synthetic data.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
