import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
      <div className="flex flex-col items-center max-w-md space-y-6 glass-card p-12">
        <div className="bg-amber-500/10 p-4 rounded-full text-amber-500">
          <AlertTriangle className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">404</h1>
          <h2 className="text-xl font-semibold text-foreground">Page Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button render={<Link href="/" />} className="w-full">
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
