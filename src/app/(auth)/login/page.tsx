"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Zap } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Successfully logged in");
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shadow-sm shadow-blue-600/20">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sign in to your BoldSync account
        </p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-xs font-medium text-foreground">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-9 rounded-md bg-transparent shadow-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-medium text-foreground">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-9 rounded-md bg-transparent shadow-none"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="mt-2 h-9 w-full rounded-md font-medium shadow-none"
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
