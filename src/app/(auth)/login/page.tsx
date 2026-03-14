"use client";

export const dynamic = "force-dynamic";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Github, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [authCapabilities, setAuthCapabilities] = useState<{
    hasGithub: boolean;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Fetch available auth capabilities on mount
  useEffect(() => {
    fetch("/api/auth/capabilities")
      .then((r) => r.json())
      .then(setAuthCapabilities)
      .catch((err) => {
        console.error("Failed to fetch auth capabilities:", err);
        setAuthCapabilities({ hasGithub: false });
      });
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      console.log("[LOGIN] Attempting email/password login for:", data.email);

      // Use better-auth signIn pattern from docs
      const { data: session, error } = await authClient.signIn.email({
        email: data.email,
        password: data.password,
        callbackURL: "/dashboard",
      });

      if (error) {
        console.error("[LOGIN] Auth error:", error);
        toast.error(error.message || "Invalid credentials");
        setIsLoading(false);
        return;
      }

      console.log("[LOGIN] Login successful:", session);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (error) {
      console.error("[LOGIN] Exception during login:", error);
      toast.error(error instanceof Error ? error.message : "Failed to login");
      setIsLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setIsGithubLoading(true);
    try {
      console.log("[LOGIN] Attempting GitHub OAuth login");

      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/dashboard",
      });
    } catch (error) {
      console.error("[LOGIN] GitHub OAuth exception:", error);
      toast.error("Failed to login with GitHub");
      setIsGithubLoading(false);
    }
  };

  return (
    <div style={{ padding: "32px 32px 28px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#dce4f0", marginBottom: 6, letterSpacing: "-0.02em" }}>
          Welcome back
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#8899bb" }}>
          Enter your credentials to access your account
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <Label htmlFor="email" style={{ color: "#8899bb", fontSize: "0.8rem" }}>Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="alex@example.com"
            disabled={isLoading}
            {...register("email")}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" style={{ fontSize: "0.8rem", color: "#f87171" }}>
              {errors.email.message}
            </p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Label htmlFor="password" style={{ color: "#8899bb", fontSize: "0.8rem" }}>Password</Label>
            <Link href="/forgot-password" style={{ fontSize: "0.78rem", color: "#8899bb", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#10b981")}
              onMouseLeave={e => (e.currentTarget.style.color = "#8899bb")}
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            disabled={isLoading}
            {...register("password")}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          {errors.password && (
            <p id="password-error" style={{ fontSize: "0.8rem", color: "#f87171" }}>
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="pub-g-btn"
          style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", cursor: isLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: "0.9rem", opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? <><Loader2 size={15} className="animate-spin" /> Signing in...</> : "Sign in"}
        </button>
      </form>

      {authCapabilities?.hasGithub && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
            <span style={{ fontSize: "0.7rem", color: "#8899bb", textTransform: "uppercase", letterSpacing: "0.1em" }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          </div>
          <button
            onClick={handleGithubLogin}
            disabled={isGithubLoading}
            className="pub-ghost-btn"
            style={{ width: "100%", padding: "10px", borderRadius: 8, cursor: isGithubLoading ? "not-allowed" : "pointer", justifyContent: "center", fontSize: "0.9rem", opacity: isGithubLoading ? 0.7 : 1 }}
          >
            {isGithubLoading ? <Loader2 size={15} className="animate-spin" /> : <Github size={15} />}
            GitHub
          </button>
        </>
      )}

      <p style={{ marginTop: 24, textAlign: "center", fontSize: "0.8rem", color: "#8899bb" }}>
        Don't have an account?{" "}
        <Link href="/register" style={{ color: "#10b981", textDecoration: "none", fontWeight: 600 }}>
          Sign up
        </Link>
      </p>
    </div>
  );
}
