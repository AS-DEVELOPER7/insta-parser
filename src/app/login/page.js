'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Instagram } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        router.push('/');
        router.refresh();
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
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center text-white font-bold">
            <Instagram size={24} />
          </div>
          <span className="font-bold text-2xl tracking-tight text-white">
            InstaVault
          </span>
        </div>

        {errorMsg && (
          <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-3 mb-4 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-3">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
          />

          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            size="lg"
            className="w-full mt-2"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </Button>
        </form>

        <div className="flex items-center my-6 w-full">
          <div className="flex-1 border-t border-ig-border"></div>
          <span className="px-3 text-xs text-gray-500 font-semibold uppercase">OR</span>
          <div className="flex-1 border-t border-ig-border"></div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Access your personal Instagram export archive securely.
        </p>
      </div>

      <div className="w-full max-w-sm bg-black border border-ig-border rounded-xl p-4 mt-3 text-center text-sm text-gray-400">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-ig-primary font-semibold hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
