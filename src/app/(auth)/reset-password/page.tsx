"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Password successfully set!");
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500 max-w-[350px] w-full mx-auto">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/20">
          <ShieldCheck className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Set new password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Please enter your new password below to secure your account.
        </p>
      </div>

      <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-xs font-medium text-foreground">New Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-9 rounded-md bg-transparent shadow-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="h-9 rounded-md bg-transparent shadow-none"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="mt-2 h-9 w-full rounded-md font-medium shadow-none"
        >
          {loading ? "Updating..." : "Update password"}
        </Button>
      </form>
    </div>
  );
}
