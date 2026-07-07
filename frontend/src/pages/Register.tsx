import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { authService } from '../services/auth';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null);
    try {
      await authService.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const detail = axiosErr?.response?.data?.detail;
      setServerError(detail ?? 'Registration failed. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
        <h2 className="text-lg font-bold text-slate-900">Account Created!</h2>
        <p className="text-sm text-slate-500">Redirecting you to sign in...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Create Account</h2>
        <p className="text-sm text-slate-500 mt-1">
          Register to access the steel inspection platform.
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
        {/* Full Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="John Smith"
            {...register('name')}
            className={`w-full px-3.5 py-2.5 text-sm rounded-md border bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-industrial-500 focus:border-transparent transition
              ${errors.name ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="reg-email" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Email Address
          </label>
          <input
            id="reg-email"
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
          <label htmlFor="reg-password" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              {...register('password')}
              className={`w-full px-3.5 py-2.5 pr-10 text-sm rounded-md border bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-industrial-500 focus:border-transparent transition
                ${errors.password ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter password"
              {...register('confirmPassword')}
              className={`w-full px-3.5 py-2.5 pr-10 text-sm rounded-md border bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-industrial-500 focus:border-transparent transition
                ${errors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-industrial-500 text-white text-sm font-semibold hover:bg-industrial-600 focus:outline-none focus:ring-2 focus:ring-industrial-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      {/* Back to login */}
      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-industrial-600 hover:text-industrial-700">
          Sign In
        </Link>
      </p>
    </div>
  );
}
