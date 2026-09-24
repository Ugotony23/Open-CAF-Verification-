import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Open CAF - NCSC Cyber Assessment Framework for Local Authorities',
  description: 'Enterprise assurance, evidence vault, and gap remediation platform for UK Councils',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen selection:bg-govuk-blue selection:text-white">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
