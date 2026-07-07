import React from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-800 max-w-md w-full overflow-hidden">
        <div className="bg-industrial-500 p-6 text-white text-center flex flex-col items-center">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-white/10 mb-3">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">AI Steel Defect Inspector</h1>
          <p className="text-xs text-slate-300 mt-1">Steel Surface Quality Inspection Platform</p>
        </div>
        <div className="p-8 bg-slate-50">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
