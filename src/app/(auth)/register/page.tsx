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

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
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
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
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

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      // Use better-auth signUp
      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to create account");
      }

      toast.success("Account created successfully!");
      // Use hard redirect to ensure session cookie is picked up
      window.location.href = "/dashboard";
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create account"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubSignup = async () => {
    setIsGithubLoading(true);
    try {
      console.log("[REGISTER] Attempting GitHub OAuth signup");
      console.log("[REGISTER] Current origin:", window.location.origin);

      const result = await authClient.signIn.social({
        provider: "github",
        callbackURL: "/dashboard",
      });

      console.log("[REGISTER] GitHub OAuth result:", result);

      if (result.error) {
        console.error("[REGISTER] GitHub OAuth error:", result.error);
        toast.error(`GitHub signup failed: ${result.error.message}`);
        setIsGithubLoading(false);
      }
    } catch (error) {
      console.error("[REGISTER] GitHub OAuth exception:", error);
      toast.error("Failed to sign up with GitHub");
      setIsGithubLoading(false);
    }
  };

  return (
    <div style={{ padding: "32px 32px 28px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#dce4f0", marginBottom: 6, letterSpacing: "-0.02em" }}>
          Create an account
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#8899bb" }}>
          Get started with ContextStream in minutes
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <Label htmlFor="name" style={{ color: "#8899bb", fontSize: "0.8rem" }}>Name</Label>
          <Input id="name" autoComplete="name" placeholder="Alex Thompson" disabled={isLoading} {...register("name")} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
          {errors.name && <p id="name-error" style={{ fontSize: "0.8rem", color: "#f87171" }}>{errors.name.message}</p>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <Label htmlFor="email" style={{ color: "#8899bb", fontSize: "0.8rem" }}>Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="alex@example.com" disabled={isLoading} {...register("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
          {errors.email && <p id="email-error" style={{ fontSize: "0.8rem", color: "#f87171" }}>{errors.email.message}</p>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <Label htmlFor="password" style={{ color: "#8899bb", fontSize: "0.8rem" }}>Password</Label>
          <Input id="password" type="password" autoComplete="new-password" disabled={isLoading} {...register("password")} aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} />
          {errors.password && <p id="password-error" style={{ fontSize: "0.8rem", color: "#f87171" }}>{errors.password.message}</p>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <Label htmlFor="confirmPassword" style={{ color: "#8899bb", fontSize: "0.8rem" }}>Confirm Password</Label>
          <Input id="confirmPassword" type="password" autoComplete="new-password" disabled={isLoading} {...register("confirmPassword")} aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined} />
          {errors.confirmPassword && <p id="confirmPassword-error" style={{ fontSize: "0.8rem", color: "#f87171" }}>{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="pub-g-btn"
          style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", cursor: isLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: "0.9rem", opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? <><Loader2 size={15} className="animate-spin" /> Creating account...</> : "Create account"}
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
            onClick={handleGithubSignup}
            disabled={isGithubLoading}
            className="pub-ghost-btn"
            style={{ width: "100%", padding: "10px", borderRadius: 8, cursor: isGithubLoading ? "not-allowed" : "pointer", justifyContent: "center", fontSize: "0.9rem", opacity: isGithubLoading ? 0.7 : 1 }}
          >
            {isGithubLoading ? <Loader2 size={15} className="animate-spin" /> : <Github size={15} />}
            GitHub
          </button>
        </>
      )}

      <p style={{ marginTop: 16, textAlign: "center", fontSize: "0.72rem", color: "#8899bb" }}>
        By creating an account, you agree to our{" "}
        <Link href="/terms" style={{ color: "#8899bb", textDecoration: "underline" }}>Terms of Service</Link>{" "}
        and{" "}
        <Link href="/privacy" style={{ color: "#8899bb", textDecoration: "underline" }}>Privacy Policy</Link>
      </p>

      <p style={{ marginTop: 20, textAlign: "center", fontSize: "0.8rem", color: "#8899bb" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "#10b981", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
      </p>
    </div>
  );
}
