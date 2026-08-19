'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(null); // null = checking, true = valid, false = missing

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 1. Listen for password recovery auth event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(true);
      }
    });

    // 2. Check if active session already exists or hash is processing
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      } else {
        // Short timeout to allow Supabase JS client to parse URL hash token
        setTimeout(async () => {
          const {
            data: { session: currentSession },
          } = await supabase.auth.getSession();
          setHasSession(!!currentSession);
        }, 1000);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        if (error.message?.toLowerCase().includes('auth session missing')) {
          setErrorMsg(
            'Your reset session has expired or is invalid. Please request a new password reset link.'
          );
        } else if (error.message?.toLowerCase().includes('failed to fetch')) {
          setErrorMsg(
            'Unable to connect to Supabase. Please configure your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
          );
        } else {
          setErrorMsg(error.message);
        }
      } else {
        setSuccessMsg(
          'Your password has been updated successfully! Redirecting to login...'
        );
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-black border border-ig-border rounded-xl p-8 flex flex-col items-center">
        {/* Icon & Title */}
        <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-center text-ig-primary mb-5 shadow-lg">
          <ShieldCheck size={28} />
        </div>

        <h1 className="text-xl font-bold text-white text-center mb-1">
          Create New Password
        </h1>
        <p className="text-xs text-gray-400 text-center mb-6 leading-relaxed">
          Your new password must be at least 6 characters long.
        </p>

        {errorMsg && (
          <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl p-3 mb-4 text-center">
            {errorMsg}
          </div>
        )}

        {hasSession === false && !successMsg && (
          <div className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl p-4 mb-4 text-center space-y-2">
            <AlertCircle size={22} className="mx-auto text-amber-400" />
            <p className="font-semibold text-white">Reset Link Invalid or Expired</p>
            <p className="text-gray-300 leading-relaxed">
              No active recovery session found. Please request a new password reset link.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block mt-2 text-xs font-bold text-ig-primary hover:underline"
            >
              Request New Link &rarr;
            </Link>
          </div>
        )}

        {successMsg ? (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl p-4 mb-4 text-center space-y-2">
            <CheckCircle2 size={24} className="mx-auto text-emerald-400" />
            <p className="font-semibold text-white text-xs">Password Updated!</p>
            <p className="text-gray-300 leading-relaxed">{successMsg}</p>
          </div>
        ) : (
          hasSession !== false && (
            <form onSubmit={handleUpdatePassword} className="w-full space-y-3">
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New Password (min. 6 chars)"
              />

              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
              />

              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                size="lg"
                className="w-full mt-2"
              >
                {loading ? 'Updating Password...' : 'Reset Password'}
              </Button>
            </form>
          )
        )}
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
