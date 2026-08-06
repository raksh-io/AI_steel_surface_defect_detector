import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard';
import { inspectionService } from '../services/inspection';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts';
import {
  BarChart3,
  Loader2,
  AlertTriangle,
  Activity,
  Target,
  TrendingUp,
  Layers,
  FileImage,
  Video,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { InspectionRecord } from '../types';

// Color palette
const CHART_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'];
const SOURCE_COLORS = ['#3b82f6', '#8b5cf6'];

// Build confidence histogram buckets from raw records
function buildConfidenceHistogram(records: InspectionRecord[]) {
  const buckets = [
    { range: '0-20%', min: 0, max: 0.2, count: 0 },
    { range: '20-40%', min: 0.2, max: 0.4, count: 0 },
    { range: '40-60%', min: 0.4, max: 0.6, count: 0 },
    { range: '60-80%', min: 0.6, max: 0.8, count: 0 },
    { range: '80-100%', min: 0.8, max: 1.01, count: 0 },
  ];
  records.forEach((r) => {
    const bucket = buckets.find((b) => r.confidence >= b.min && r.confidence < b.max);
    if (bucket) bucket.count += 1;
  });
  return buckets;
}

// Build source breakdown (upload vs webcam)
function buildSourceBreakdown(records: InspectionRecord[]) {
  const counts: Record<string, number> = {};
  records.forEach((r) => {
    counts[r.source] = (counts[r.source] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

// Build timeline data (inspections per day)
function buildTimeline(records: InspectionRecord[]) {
  const byDate: Record<string, { total: number; defects: number }> = {};
  records.forEach((r) => {
    const day = new Date(r.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    if (!byDate[day]) byDate[day] = { total: 0, defects: 0 };
    byDate[day].total += 1;
    if (r.is_defect) byDate[day].defects += 1;
  });
  // Return in chronological order (reverse since records come newest-first)
  return Object.entries(byDate)
    .map(([date, vals]) => ({ date, ...vals }))
    .reverse();
}

// Custom tooltip for recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-2.5">
        <p className="text-xs font-bold text-slate-700 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  // Fetch dashboard stats (totals + class distribution)
  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
  });

  // Fetch all inspection records for detailed analysis (up to 500)
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['analytics-all-records'],
    queryFn: () => inspectionService.getHistory(0, 500),
  });

  const isLoading = statsLoading || historyLoading;
  const allRecords = historyData?.items || [];

  // Derived chart data
  const confidenceHistogram = buildConfidenceHistogram(allRecords);
  const sourceBreakdown = buildSourceBreakdown(allRecords);
  const timeline = buildTimeline(allRecords);
  const avgConfidence =
    allRecords.length > 0
      ? allRecords.reduce((sum, r) => sum + r.confidence, 0) / allRecords.length
      : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-industrial-500 mb-4" />
        <p className="text-slate-500 font-medium">Loading analytics data...</p>
      </div>
    );
  }

  if (statsError || !stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5" />
          <div>
            <h3 className="font-bold">Failed to load analytics</h3>
            <p className="text-sm">Please check if the backend is running and you are authenticated.</p>
          </div>
        </div>
      </div>
    );
  }

  const hasData = stats.total_inspections > 0;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-industrial-500" />
          Defect Analytics
        </h1>
        <p className="text-slate-500 mt-1">
          Historical trends, distribution patterns, and AI model performance analytics.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Total Inspections */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
          <div className="flex items-center gap-3 text-slate-500 font-medium mb-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-sm">Total Inspections</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.total_inspections}</div>
          <div className="text-xs text-slate-400 mt-1">All recorded items</div>
        </div>

        {/* Total Defects */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
          <div className="flex items-center gap-3 text-slate-500 font-medium mb-3">
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-sm">Total Defects</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.total_defects}</div>
          <div className="text-xs text-slate-400 mt-1">Items flagged as defective</div>
        </div>

        {/* Defect Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
          <div className="flex items-center gap-3 text-slate-500 font-medium mb-3">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <Target className="w-4 h-4" />
            </div>
            <span className="text-sm">Defect Rate</span>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {(stats.defect_rate * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Defects per total inspections</div>
        </div>

        {/* Average Confidence */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
          <div className="flex items-center gap-3 text-slate-500 font-medium mb-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-sm">Avg Confidence</span>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {(avgConfidence * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Mean prediction confidence</div>
        </div>
      </div>

      {!hasData ? (
        /* Empty State */
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No analytics data yet</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            Start inspecting steel surfaces to see analytics.{' '}
            <Link to="/inspect/image" className="text-industrial-600 hover:underline font-medium">
              Upload an image
            </Link>{' '}
            or{' '}
            <Link to="/inspect/live" className="text-industrial-600 hover:underline font-medium">
              start live inspection
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          {/* Charts Grid — Row 1 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Chart 1: Defect Class Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Layers className="w-5 h-5 text-industrial-500" />
                <h3 className="text-lg font-bold text-slate-900">Defect Class Distribution</h3>
              </div>
              {stats.class_distribution.length > 0 ? (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.class_distribution}
                      margin={{ top: 10, right: 10, left: -15, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="defect_class"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Count">
                        {stats.class_distribution.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[320px] flex items-center justify-center text-slate-400">
                  No distribution data
                </div>
              )}
            </div>

            {/* Chart 2: Confidence Histogram */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-industrial-500" />
                <h3 className="text-lg font-bold text-slate-900">Confidence Distribution</h3>
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={confidenceHistogram}
                    margin={{ top: 10, right: 10, left: -15, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Inspections" fill="#7c3aed">
                      {confidenceHistogram.map((_entry, index) => {
                        const gradient = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];
                        return <Cell key={`conf-${index}`} fill={gradient[index]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Grid — Row 2 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Chart 3: Source Breakdown (Donut) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Layers className="w-5 h-5 text-industrial-500" />
                <h3 className="text-lg font-bold text-slate-900">Inspection Source Breakdown</h3>
              </div>
              {sourceBreakdown.length > 0 ? (
                <div className="h-[320px] w-full flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourceBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={120}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                          `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
                        }
                        labelLine={{ stroke: '#94a3b8' }}
                      >
                        {sourceBreakdown.map((_entry, index) => (
                          <Cell key={`pie-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        iconType="circle"
                        iconSize={10}
                        formatter={(value: string) => (
                          <span className="text-sm font-semibold text-slate-600 capitalize ml-1">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[320px] flex items-center justify-center text-slate-400">
                  No source data available
                </div>
              )}

              {/* Source legend cards */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {sourceBreakdown.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <div className="p-1.5 bg-white rounded-md shadow-sm border border-slate-200">
                      {s.name === 'webcam' ? (
                        <Video className="w-4 h-4 text-violet-600" />
                      ) : (
                        <FileImage className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 capitalize">{s.name}</p>
                      <p className="text-lg font-black text-slate-900">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 4: Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-industrial-500" />
                <h3 className="text-lg font-bold text-slate-900">Inspection Timeline</h3>
              </div>
              {timeline.length > 1 ? (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={timeline}
                      margin={{ top: 10, right: 10, left: -15, bottom: 10 }}
                    >
                      <defs>
                        <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradDefects" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        iconType="circle"
                        iconSize={10}
                        formatter={(value: string) => (
                          <span className="text-sm font-semibold text-slate-600 ml-1">{value}</span>
                        )}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke="#3b82f6"
                        fill="url(#gradTotal)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="defects"
                        name="Defects"
                        stroke="#ef4444"
                        fill="url(#gradDefects)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[320px] flex flex-col items-center justify-center text-slate-400">
                  <TrendingUp className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">Need more data points to show timeline</p>
                  <p className="text-xs text-slate-300 mt-1">At least 2 days of inspections required</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
