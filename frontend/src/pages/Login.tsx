import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { authService } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      const response = await authService.login(data);
      const user: User = {
        id: response.user_id,
        email: response.email,
        name: response.name,
        role: response.role,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      login(response.access_token, user);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const detail = axiosErr?.response?.data?.detail;
      setServerError(detail ?? 'Sign in failed. Check your credentials and try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Sign In</h2>
        <p className="text-sm text-slate-500 mt-1">
          Enter your credentials to access the inspection platform.
        </p>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="flex items-start gap-2.5 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="inspector@factory.com"
            {...register('email')}
            className={`w-full px-3.5 py-2.5 text-sm rounded-md border bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-industrial-500 focus:border-transparent transition
              ${errors.email ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
              className={`w-full px-3.5 py-2.5 pr-10 text-sm rounded-md border bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-industrial-500 focus:border-transparent transition
                ${errors.password ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-industrial-500 text-white text-sm font-semibold hover:bg-industrial-600 focus:outline-none focus:ring-2 focus:ring-industrial-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold text-industrial-600 hover:text-industrial-700">
          Create Account
        </Link>
      </p>

      <p className="text-center text-[11px] text-slate-400 pt-1">
        AI-Powered Steel Surface Defect Detection &amp; Quality Inspection Platform
      </p>
    </div>
  );
}
