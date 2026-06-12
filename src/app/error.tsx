'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if available
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
      <div className="flex flex-col items-center max-w-md space-y-6 glass-card p-12 border-destructive/20">
        <div className="bg-destructive/10 p-4 rounded-full text-destructive">
          <AlertCircle className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            A critical error occurred while rendering this page.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
          <Button onClick={() => reset()} className="flex-1">
            Try again
          </Button>
          <Button variant="outline" render={<Link href="/" />} className="flex-1">
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
