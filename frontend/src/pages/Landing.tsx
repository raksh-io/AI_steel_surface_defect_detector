import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Cpu,
  ArrowRight,
  ShieldCheck,
  Zap,
  Eye,
  BarChart3,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-industrial-500 selection:text-white">
      {/* Background Decorative Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-industrial-600/20 via-blue-600/10 to-transparent blur-3xl opacity-60 rounded-full" />
        <div className="absolute top-[40%] -left-[10%] w-[600px] h-[600px] bg-indigo-600/10 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-industrial-600/10 blur-3xl rounded-full" />
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Header / Navbar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2.5 bg-industrial-600/20 border border-industrial-500/30 rounded-xl group-hover:border-industrial-500 transition-colors">
              <Cpu className="w-6 h-6 text-industrial-400" />
            </div>
            <span className="font-bold tracking-tight text-xl text-white">
              SteelDefect <span className="text-industrial-400">AI</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#explainability" className="hover:text-white transition-colors">
              AI Explainability
            </a>
            <a href="#defects" className="hover:text-white transition-colors">
              Supported Defects
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2.5 rounded-lg bg-industrial-600 hover:bg-industrial-500 text-white font-semibold text-sm shadow-lg shadow-industrial-600/20 transition-all flex items-center gap-2"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-lg bg-industrial-600 hover:bg-industrial-500 text-white font-semibold text-sm shadow-lg shadow-industrial-600/25 hover:shadow-industrial-500/40 transition-all flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1">
        {/* Hero Section */}
        <section className="pt-24 pb-20 px-6 max-w-5xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-semibold text-industrial-400 shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Industrial Quality Assurance Platform</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            Automated Steel Surface <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-industrial-400 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
              Defect Detection
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Instant AI classification and Grad-CAM visual explainability designed for high-precision steel manufacturing quality control.
          </p>

          {/* Call to Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-industrial-600 hover:bg-industrial-500 text-white font-bold text-base shadow-xl shadow-industrial-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Access Platform Dashboard
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-industrial-600 hover:bg-industrial-500 text-white font-bold text-base shadow-xl shadow-industrial-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Sign In to Platform
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-base transition-colors flex items-center justify-center"
            >
              Learn More
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Model</p>
              <p className="text-lg font-bold text-white mt-1">EfficientNet-B0</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Classes</p>
              <p className="text-lg font-bold text-white mt-1">6 Defect Types</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Latency</p>
              <p className="text-lg font-bold text-industrial-400 mt-1">Sub-100ms</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Explainability</p>
              <p className="text-lg font-bold text-white mt-1">Grad-CAM Heatmaps</p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 border-t border-slate-900 bg-slate-950/60">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center space-y-3 mb-16">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Engineered for Industrial Reliability
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto text-sm">
                Streamlined inspection workflow designed to reduce quality defects and increase throughput.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-industrial-500/50 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-industrial-600/10 border border-industrial-500/20 flex items-center justify-center text-industrial-400 mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Real-Time Inspection</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Upload surface patches or run real-time camera streams with live defect detection telemetry.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-industrial-500/50 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-industrial-600/10 border border-industrial-500/20 flex items-center justify-center text-industrial-400 mb-6 group-hover:scale-110 transition-transform">
                  <Eye className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Visual Explainability</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Integrated Grad-CAM heatmaps highlight precise spatial defect regions for immediate operator verification.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-industrial-500/50 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-industrial-600/10 border border-industrial-500/20 flex items-center justify-center text-industrial-400 mb-6 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Historical Analytics</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Track historical quality trends, per-class distributions, and confidence telemetry across all inspections.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Defect Classes Grid */}
        <section id="defects" className="py-20 border-t border-slate-900">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center space-y-3 mb-12">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Detectable Defect Categories
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto text-sm">
                Trained to accurately classify NEU surface defect types with high confidence.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                'Crazing',
                'Inclusion',
                'Patches',
                'Pitted Surface',
                'Rolled-in Scale',
                'Scratches',
              ].map((defect) => (
                <div
                  key={defect}
                  className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-2 hover:border-slate-700 transition-colors"
                >
                  <CheckCircle2 className="w-5 h-5 text-industrial-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-200">{defect}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-industrial-500" />
            <span className="font-semibold text-slate-400">SteelDefect AI Platform</span>
          </div>
          <p>&copy; {new Date().getFullYear()} SteelDefect AI. All rights reserved.</p>
          <div className="flex items-center space-x-4">
            <Link to="/login" className="hover:text-slate-300 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
