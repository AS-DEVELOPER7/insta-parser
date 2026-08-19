"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/atoms/Input";
import Button from "@/components/atoms/Button";

import { getAppOrigin } from "@/constants/config";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleReset = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      // 1. Verify if email exists in database first
      const checkRes = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const checkData = await checkRes.json();

      if (!checkRes.ok || checkData.exists === false) {
        setErrorMsg(
          "This email address is not registered. Please check the email or sign up for a new account."
        );
        setLoading(false);
        return;
      }

      // 2. Email is registered -> send reset link
      const redirectUrl = `${getAppOrigin()}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        if (error.message?.toLowerCase().includes("rate limit")) {
          setErrorMsg(
            "Email rate limit exceeded. Please wait 60 seconds before requesting another link.",
          );
        } else if (error.message?.toLowerCase().includes("failed to fetch")) {
          setErrorMsg(
            "Unable to connect to Supabase. Please configure your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
          );
        } else {
          setErrorMsg(error.message);
        }
      } else {
        setSuccessMsg(
          "A password reset link has been sent to your email address. Please check your inbox.",
        );
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-black border border-ig-border rounded-xl p-8 flex flex-col items-center">
        {/* Icon & Title */}
        <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-center text-ig-primary mb-5 shadow-lg">
          <KeyRound size={28} />
        </div>

        <h1 className="text-xl font-bold text-white text-center mb-1">
          Trouble Logging In?
        </h1>
        <p className="text-xs text-gray-400 text-center mb-6 leading-relaxed">
          Enter your email address and we&apos;ll send you a link to get back
          into your account.
        </p>

        {errorMsg && (
          <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl p-3 mb-4 text-center">
            {errorMsg}
          </div>
        )}

        {successMsg ? (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl p-4 mb-4 text-center space-y-2">
            <CheckCircle2 size={24} className="mx-auto text-emerald-400" />
            <p className="font-semibold text-white text-xs">Reset Link Sent!</p>
            <p className="text-gray-300 leading-relaxed">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="w-full space-y-4">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
            />

            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {loading ? "Sending link..." : "Send Login Link"}
            </Button>
          </form>
        )}

        <div className="flex items-center my-6 w-full">
          <div className="flex-1 border-t border-ig-border"></div>
          <span className="px-3 text-xs text-gray-500 font-semibold uppercase">
            OR
          </span>
          <div className="flex-1 border-t border-ig-border"></div>
        </div>

        <Link
          href="/signup"
          className="text-xs font-semibold text-white hover:text-ig-primary transition-colors"
        >
          Create New Account
        </Link>
      </div>

      <div className="w-full max-w-sm bg-black border border-ig-border rounded-xl p-4 mt-3 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Login</span>
        </Link>
      </div>
    </div>
  );
}
