"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Zap, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setError(error.message);
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Account created! Please check your email.");
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shadow-sm shadow-blue-600/20">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Check your email</h1>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            We&apos;ve sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{email}</span>. Please check your
            inbox and click the link to verify your account.
          </p>
          <Link href="/login">
            <Button
              variant="outline"
              className="w-full h-9 rounded-md shadow-none font-medium transition-colors"
            >
              Back to sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shadow-sm shadow-blue-600/20">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Create an account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your details to get started with BoldSync
        </p>
      </div>

      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="fullName" className="text-xs font-medium text-foreground">Full name</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="h-9 rounded-md bg-transparent shadow-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-xs font-medium text-foreground">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-9 rounded-md bg-transparent shadow-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-xs font-medium text-foreground">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="h-9 rounded-md bg-transparent shadow-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="h-9 rounded-md bg-transparent shadow-none"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="mt-2 h-9 w-full rounded-md font-medium shadow-none"
        >
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
