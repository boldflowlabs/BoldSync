"use client";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Mail, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export function SuspendedModal() {
  const { signOut } = useAuth();
  const contactWhatsApp = "+919876543210"; // Placeholder
  const contactEmail = "support@boldflow.com"; // Placeholder

  return (
    <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-md my-auto animate-in fade-in zoom-in-95 duration-300">
        <Card className="border-red-500/20 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto inline-flex items-center justify-center p-3 bg-red-500/10 rounded-full mb-4 ring-1 ring-red-500/20">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Account Paused
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 pb-6">
            <p className="text-muted-foreground">
              Your organization's account has been paused. Please contact BoldFlow Labs to resolve this issue and restore access to your dashboard.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button 
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white" 
              onClick={() => window.open(`https://wa.me/${contactWhatsApp}`, '_blank')}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp Us
            </Button>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => window.location.href = `mailto:${contactEmail}`}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Support
            </Button>
            <Button
              variant="ghost"
              className="w-full mt-4 text-muted-foreground"
              onClick={() => signOut()}
            >
              Sign out
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
