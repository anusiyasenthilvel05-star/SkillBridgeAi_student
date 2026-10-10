import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, Eye, EyeOff, LoaderCircle, ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Button } from './ui/button';
import { SiteHeader } from './site';
import library from '@/assets/learning-library.jpg';

export function AuthPage({ mode = 'login' }: { mode?: 'login' | 'register' | 'forgot' | 'reset' }) {
  const [busy, setBusy] = useState(false); const [show, setShow] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const navigate = useNavigate();
  useEffect(() => { if (mode === 'login' || mode === 'register') supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: '/dashboard' }); }); }, [mode, navigate]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(''); setNotice(''); const fields = new FormData(e.currentTarget);
    const email = String(fields.get('email') ?? ''); const password = String(fields.get('password') ?? '');
    try {
      if (mode !== 'reset') z.string().email('Enter a valid email address.').parse(email);
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); if (error) throw error;
        setNotice('If an account exists for this email, you’ll receive a password reset link shortly.');
      } else {
        z.string().min(mode === 'login' ? 1 : 8, 'Use a password with at least 8 characters.').parse(password);
        if (mode === 'register' || mode === 'reset') if (password !== String(fields.get('confirm'))) throw new Error('Your passwords do not match.');
        if (mode === 'register') {
          const name = z.string().trim().min(2, 'Enter your full name.').parse(fields.get('name'));
          if (!fields.get('agree')) throw new Error('Please agree to the terms and privacy policy.');
          const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, organization: String(fields.get('organization') ?? '') }, emailRedirectTo: `${window.location.origin}/auth` } });
          if (error) throw error;
          if (data.session) await navigate({ to: '/dashboard' }); else setNotice('Check your email to verify your account, then return here to log in.');
        } else if (mode === 'reset') {
          const { error } = await supabase.auth.updateUser({ password }); if (error) throw error;
          setNotice('Your password has been updated. You can now continue learning.');
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error;
          await navigate({ to: '/dashboard' });
        }
      }
    } catch (e) { setError(e instanceof z.ZodError ? e.issues[0]?.message ?? 'Check your details.' : e instanceof Error ? e.message : 'Unable to continue. Please try again.'); }
    finally { setBusy(false); }
  }
  async function google() { setBusy(true); setError(''); const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/auth` }); if (result.error) { setError(result.error.message); setBusy(false); return; } if (!result.redirected) { await navigate({ to: '/dashboard' }); setBusy(false); } }
  const title = mode === 'register' ? 'Start your learning journey.' : mode === 'forgot' ? 'Forgot your password?' : mode === 'reset' ? 'Set a new password.' : 'Welcome back.';
  return <><SiteHeader/><main className="auth-layout"><section className="auth-story"><img src={library} alt="Contemporary library study space" width={1920} height={1024}/><div><span className="hero-eyebrow">A little clarity. A lot of possibility.</span><h2>Build understanding.<br/>Bridge your gaps.<br/>Grow with confidence.</h2><p>Your materials become the starting point for a learning journey shaped around you.</p><div className="flex gap-2 items-center text-xs mt-8"><ShieldCheck size={17}/> Your private learning workspace</div></div></section><section className="auth-form-wrap"><div className="auth-form"><h1>{title}</h1><p className="text-sm text-muted-foreground leading-6 mb-7">{mode === 'register' ? 'Create your account and make your next step count.' : mode === 'forgot' ? 'We’ll send a secure link to help you get back in.' : mode === 'reset' ? 'Choose a strong password for your account.' : 'Your next breakthrough is waiting.'}</p>{error && <div role="alert" className="error-note">{error}</div>}{notice && <div role="status" className="error-note">{notice}</div>}<form onSubmit={submit}>{mode === 'register' && <><div className="form-field"><label htmlFor="name" className="field-label">Full name</label><input className="field" id="name" name="name" placeholder="Your full name" required autoComplete="name"/></div><div className="form-field"><label htmlFor="organization" className="field-label">Organization <span className="text-muted-foreground font-normal">(optional)</span></label><input className="field" id="organization" name="organization" placeholder="Organization or department" autoComplete="organization"/></div></>}{mode !== 'reset' && <div className="form-field"><label htmlFor="email" className="field-label">Email address</label><input className="field" id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email"/></div>}{mode !== 'forgot' && <div className="form-field"><div className="flex justify-between"><label htmlFor="password" className="field-label">Password</label>{mode === 'login' && <Link to="/forgot-password" className="text-xs text-teal">Forgot password?</Link>}</div><div className="relative"><input className="field pr-12" id="password" name="password" type={show ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'} required/><Button variant="ghost" size="icon" type="button" className="absolute right-1 top-0.5" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff/> : <Eye/>}</Button></div></div>}{(mode === 'register' || mode === 'reset') && <div className="form-field"><label htmlFor="confirm" className="field-label">Confirm password</label><input className="field" id="confirm" name="confirm" type={show ? 'text' : 'password'} required autoComplete="new-password" placeholder="Re-enter your password"/></div>}{mode === 'register' && <label className="flex items-start gap-3 text-xs text-muted-foreground leading-6 mb-5"><input type="checkbox" name="agree" required className="mt-1.5"/><span>I agree to the <Link to="/terms" className="text-teal">Terms</Link> and <Link to="/privacy" className="text-teal">Privacy Policy</Link>.</span></label>}<Button className="w-full h-11" disabled={busy}>{busy ? <LoaderCircle className="animate-spin"/> : null}{mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : mode === 'reset' ? 'Update Password' : 'Log in'}{!busy && <ArrowRight/>}</Button></form>{(mode === 'login' || mode === 'register') && <><div className="flex items-center gap-4 my-6 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border"/>or continue with<span className="h-px flex-1 bg-border"/></div><Button variant="outline" className="w-full h-11" disabled={busy} onClick={google}><span className="font-bold text-base">G</span> Google</Button><p className="text-xs text-center text-muted-foreground mt-7">{mode === 'register' ? 'Already have an account? ' : 'New to SkillBridge AI? '}<Link to={mode === 'register' ? '/auth' : '/register'} className="text-teal font-semibold">{mode === 'register' ? 'Log in' : 'Create an account'}</Link></p></>}{(mode === 'forgot' || mode === 'reset') && <Link to="/auth" className="block text-center mt-6 text-sm text-teal">Back to log in</Link>}</div></section></main></>;
}