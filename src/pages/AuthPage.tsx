import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Package } from 'lucide-react';
import { toast } from 'react-toastify';
import { nameFromEmail, useAuth } from '../store/AuthContext';

type Mode = 'login' | 'register' | 'forgot';

interface FormValues {
  name?: string;
  email: string;
  password?: string;
  confirm?: string;
}

const COPY: Record<Mode, { title: string; sub: string; cta: string }> = {
  login: { title: 'Welcome back', sub: 'Sign in to manage shipments and track parcels.', cta: 'Sign in' },
  register: { title: 'Create your account', sub: 'Set up a workspace for your dispatch team.', cta: 'Create account' },
  forgot: { title: 'Reset password', sub: 'We will email you a link to choose a new one.', cta: 'Send reset link' },
};

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [showPw, setShowPw] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const copy = COPY[mode];

  const {
    register: field,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ mode: 'onTouched' });

  const switchMode = (m: Mode) => {
    setMode(m);
    reset();
  };

  const onSubmit = (values: FormValues) => {
    if (mode === 'forgot') {
      toast.success(`Reset link sent to ${values.email}`);
      switchMode('login');
      return;
    }
    if (mode === 'register') {
      if ((values.password ?? '') !== (values.confirm ?? '')) {
        toast.error('Passwords do not match');
        return;
      }
      register(values.name ?? '', values.email);
      toast.success('Welcome to Routewing');
      navigate('/');
      return;
    }
    login(nameFromEmail(values.email), values.email);
    toast.success('Welcome to Routewing');
    navigate('/');
  };

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-[1fr_1.05fr]">
      <main className="flex items-center justify-center p-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full max-w-[400px] up space-y-5">
          <div className="flex items-center gap-2 font-semibold text-lg mb-8">
            <span className="size-9 rounded-xl bg-acc text-accfg grid place-items-center">
              <Package size={19} />
            </span>
            Routewing
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
            <p className="text-mute mt-2 text-[15px]">{copy.sub}</p>
          </div>

          {mode === 'register' ? (
            <label className="block">
              <span className="text-[13px] font-medium">Full name</span>
              <input
                autoComplete="name"
                placeholder="Your full name"
                className={`inp mt-1.5 ${errors.name ? 'bad' : ''}`}
                {...field('name', { required: 'Enter your full name' })}
              />
              {errors.name ? <span className="text-xs text-red-600 mt-1 block">{errors.name.message}</span> : null}
            </label>
          ) : null}

          <label className="block">
            <span className="text-[13px] font-medium">Work email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@company.in"
              className={`inp mt-1.5 ${errors.email ? 'bad' : ''}`}
              {...field('email', {
                required: 'Enter your work email',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
              })}
            />
            {errors.email ? <span className="text-xs text-red-600 mt-1 block">{errors.email.message}</span> : null}
          </label>

          {mode !== 'forgot' ? (
            <label className="block">
              <span className="text-[13px] font-medium">Password</span>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className={`inp mt-1.5 pr-11 ${errors.password ? 'bad' : ''}`}
                  {...field('password', {
                    required: 'Enter your password',
                    minLength: { value: 6, message: 'Use at least 6 characters' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-[17px] text-mute"
                >
                  {showPw ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
              {errors.password ? <span className="text-xs text-red-600 mt-1 block">{errors.password.message}</span> : null}
            </label>
          ) : null}

          {mode === 'register' ? (
            <label className="block">
              <span className="text-[13px] font-medium">Confirm password</span>
              <input
                type="password"
                className={`inp mt-1.5 ${errors.confirm ? 'bad' : ''}`}
                {...field('confirm', { required: 'Confirm your password', minLength: { value: 6, message: 'Use at least 6 characters' } })}
              />
              {errors.confirm ? <span className="text-xs text-red-600 mt-1 block">{errors.confirm.message}</span> : null}
            </label>
          ) : null}

          {mode === 'login' ? (
            <button type="button" onClick={() => switchMode('forgot')} className="text-sm text-acc font-medium -mt-1">
              Forgot password?
            </button>
          ) : null}

          <button type="submit" disabled={isSubmitting} className="btn btn-p w-full justify-center !h-11">
            {copy.cta} <ArrowRight size={16} />
          </button>

          <p className="text-sm text-mute text-center">
            {mode === 'login' ? (
              <>
                New here?{' '}
                <button type="button" onClick={() => switchMode('register')} className="text-ink font-medium underline underline-offset-4">
                  Create an account
                </button>
              </>
            ) : (
              <button type="button" onClick={() => switchMode('login')} className="text-ink font-medium underline underline-offset-4">
                Back to sign in
              </button>
            )}
          </p>
          <p className="text-xs text-mute text-center">
            Demo build. Any valid email and a 6 character password will sign you in.
          </p>
        </form>
      </main>
      <aside className="hidden lg:block relative m-3 rounded-[28px] overflow-hidden">
        <img
          alt="Parcels moving through a sorting warehouse"
          src="https://picsum.photos/seed/warehouse-conveyor-parcels/1400/1600"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 p-10 text-white max-w-[520px]">
          <h2 className="text-4xl font-semibold tracking-tight leading-[1.1]">Every parcel, from pickup to doorstep.</h2>
          <p className="mt-3 text-white/80">Book, route and trace shipments from one desk.</p>
        </div>
      </aside>
    </div>
  );
}


