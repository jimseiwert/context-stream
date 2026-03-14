"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      // Use better-auth forgetPassword
      const result = await authClient.forgetPassword({
        email: data.email,
        redirectTo: "/reset-password",
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to send reset email");
      }

      setEmailSent(true);
      toast.success("Password reset email sent!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send reset email"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div style={{ padding: "32px 32px 28px", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, rgba(16,185,129,0.14), rgba(6,182,212,0.08))", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#dce4f0", marginBottom: 8, letterSpacing: "-0.02em" }}>Check your email</h1>
        <p style={{ fontSize: "0.875rem", color: "#8899bb", marginBottom: 24 }}>
          We sent a reset link to your inbox. It may take a minute to arrive.
        </p>
        <Link href="/login" style={{ color: "#10b981", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 32px 28px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#dce4f0", marginBottom: 6, letterSpacing: "-0.02em" }}>
          Forgot password?
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#8899bb" }}>
          Enter your email and we'll send you a link to reset it.
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
            <p id="email-error" style={{ fontSize: "0.8rem", color: "#f87171" }}>{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="pub-g-btn"
          style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", cursor: isLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: "0.9rem", opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : "Send reset link"}
        </button>
      </form>

      <p style={{ marginTop: 24, textAlign: "center", fontSize: "0.8rem", color: "#8899bb" }}>
        Remember it?{" "}
        <Link href="/login" style={{ color: "#10b981", textDecoration: "none", fontWeight: 600 }}>Back to login</Link>
      </p>
    </div>
  );
}
