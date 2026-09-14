'use client';

import React from 'react';
import {
  Settings,
  Server,
  Database,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function SuperAdminSettingsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Platform Global Configuration
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-400">
              SaaS engine defaults, tax parameters, and infrastructure connectivity
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* System Infrastructure */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Server className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Infrastructure Stack</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Primary Database</span>
              <span className="font-semibold text-white flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Neon Serverless Postgres
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Cache & Search Layer</span>
              <span className="font-semibold text-white flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                Upstash Redis (TTL 24h)
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Authentication Driver</span>
              <span className="font-semibold text-purple-300 font-mono">
                Better Auth + Org Plugin
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Application Architecture</span>
              <span className="font-semibold text-slate-200">
                Next.js 15 App Router + Drizzle ORM
              </span>
            </div>
          </div>
        </div>

        {/* Optical GST Tax Defaults */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Zap className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Indian GST Optical Defaults</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Spectacle Lenses (HSN 9001)</span>
              <span className="font-bold text-emerald-400 font-mono">
                5% (2.5% CGST + 2.5% SGST)
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Spectacle Frames (HSN 9003)</span>
              <span className="font-bold text-emerald-400 font-mono">
                5% (2.5% CGST + 2.5% SGST)
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Sunglasses & Accessories (HSN 9004)</span>
              <span className="font-bold text-amber-400 font-mono">
                18% (9% CGST + 9% SGST)
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Contact Lenses & Soln</span>
              <span className="font-bold text-amber-400 font-mono">
                18% (9% CGST + 9% SGST)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
