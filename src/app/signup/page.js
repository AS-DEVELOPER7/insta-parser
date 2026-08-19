'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Instagram } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';

import { getAppOrigin, APP_CONFIG } from '@/constants/config';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const redirectUrl = `${getAppOrigin()}/upload`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username: username || email.split('@')[0],
            full_name: fullName,
          },
        },
      });

      if (authError) {
        if (authError.message?.toLowerCase().includes('failed to fetch')) {
          setErrorMsg(
            'Unable to connect to Supabase. Please configure your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
          );
        } else {
          setErrorMsg(authError.message);
        }
        setLoading(false);
        return;
      }

      if (authData.user) {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          username: username.toLowerCase().trim() || email.split('@')[0],
          full_name: fullName,
        });

        if (!authData.session) {
          setSuccessMsg('Account created! Please check your email inbox to confirm your account.');
          setLoading(false);
          return;
        }

        router.push('/upload');
        router.refresh();
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred during signup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-black border border-ig-border rounded-xl p-8 flex flex-col items-center">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center text-white font-bold">
            <Instagram size={24} />
          </div>
          <span className="font-bold text-2xl tracking-tight text-white">
            {APP_CONFIG.NAME}
          </span>
        </div>

        <p className="text-gray-400 font-semibold text-center text-sm mb-6">
          Sign up to view and manage your Instagram exported data.
        </p>

        {errorMsg && (
          <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-3 mb-4 text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg p-4 mb-4 text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSignup} className="w-full space-y-3">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
          />

          <Input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full Name"
          />

          <Input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />

          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            minLength={6}
          />

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            size="lg"
            className="w-full mt-2"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </Button>
        </form>
      </div>

      <div className="w-full max-w-sm bg-black border border-ig-border rounded-xl p-4 mt-3 text-center text-sm text-gray-400">
        Have an account?{' '}
        <Link href="/login" className="text-ig-primary font-semibold hover:underline">
          Log in
        </Link>
      </div>
    </div>
  );
}
