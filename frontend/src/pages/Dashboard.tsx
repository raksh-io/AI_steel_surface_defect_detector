import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, AlertTriangle, CheckCircle2, Loader2, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
    refetchInterval: 15000, // Refresh every 15s
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-industrial-500 mb-4" />
        <p className="text-slate-500 font-medium">Loading dashboard statistics...</p>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5" />
          <div>
            <h3 className="font-bold">Failed to load statistics</h3>
            <p className="text-sm">Please check if the backend is running and you are authenticated.</p>
          </div>
        </div>
      </div>
    );
  }

  // Define colors for defect classes
  const colors = ['#2b5c8f', '#4f83b6', '#3b82f6', '#1e40af', '#60a5fa', '#93c5fd'];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-industrial-500" />
          Quality Overview
        </h1>
        <p className="text-slate-500 mt-1">Real-time statistics of steel surface inspections.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Inspections */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <div className="flex items-center gap-3 text-slate-500 font-medium mb-4">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
              <Activity className="w-5 h-5" />
            </div>
            Total Inspections
          </div>
          <div className="text-4xl font-black text-slate-900">{stats.total_inspections}</div>
          <div className="text-sm text-slate-500 mt-2">All recorded items</div>
        </div>

        {/* Total Defects */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <div className="flex items-center gap-3 text-slate-500 font-medium mb-4">
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            Total Defects
          </div>
          <div className="text-4xl font-black text-slate-900">{stats.total_defects}</div>
          <div className="text-sm text-slate-500 mt-2">Items flagged as defective</div>
        </div>

        {/* Defect Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <div className="flex items-center gap-3 text-slate-500 font-medium mb-4">
            <div className="p-2 bg-industrial-50 rounded-lg text-industrial-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            Defect Rate
          </div>
          <div className="text-4xl font-black text-slate-900">
            {(stats.defect_rate * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-slate-500 mt-2">Defects per total inspections</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Defect Distribution</h3>
          {stats.class_distribution.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.class_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="defect_class" tick={{ fill: '#64748b', fontSize: 12 }} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.class_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400">
              No defect data available yet
            </div>
          )}
        </div>

        {/* Recent Inspections Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Recent Inspections</h3>
            <Link to="/history" className="text-sm font-semibold text-industrial-600 hover:text-industrial-700">
              View All &rarr;
            </Link>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Image</th>
                  <th className="px-6 py-3">Defect Class</th>
                  <th className="px-6 py-3">Confidence</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recent_inspections.length > 0 ? (
                  stats.recent_inspections.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        {record.original_image_path ? (
                          <img 
                            src={`${API_BASE_URL}/uploads/${record.original_image_path}`} 
                            alt="Defect" 
                            className="w-10 h-10 rounded-md object-cover border border-slate-200 bg-slate-100"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-900 capitalize">
                        {record.defect_class.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${record.confidence > 0.8 ? 'bg-red-500' : 'bg-orange-400'}`}
                              style={{ width: `${record.confidence * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-slate-500">{(record.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold uppercase tracking-wider
                          ${record.source === 'webcam' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}
                        `}>
                          {record.source}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-500 text-xs">
                        {new Date(record.created_at).toLocaleString(undefined, { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No inspections recorded yet. Go to <Link to="/inspect/image" className="text-industrial-600 hover:underline">Image Inspection</Link> to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
