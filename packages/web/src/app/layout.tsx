import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { WebSocketProvider } from '@/contexts/websocket-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Hooks - Monitor Your Code',
  description: 'Real-time monitoring for Claude Code agents, runtimes, and cron jobs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
