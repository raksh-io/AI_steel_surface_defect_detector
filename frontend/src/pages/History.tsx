import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inspectionService } from '../services/inspection';
import { Link } from 'react-router-dom';
import {
  History as HistoryIcon,
  Loader2,
  AlertTriangle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Activity,
  Search,
  FileImage,
  Video,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const DEFECT_CLASSES = [
  'Crazing',
  'Inclusion',
  'Patches',
  'Pitted_Surface',
  'Rolled-in_Scale',
  'Scratches',
];

const PAGE_SIZES = [10, 20, 50];

export default function History() {
  const queryClient = useQueryClient();

  // Pagination & filter state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [filterClass, setFilterClass] = useState('');
  const [filterSource, setFilterSource] = useState('');

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const skip = page * pageSize;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inspection-history', skip, pageSize, filterClass, filterSource],
    queryFn: () =>
      inspectionService.getHistory(
        skip,
        pageSize,
        filterClass || undefined,
        filterSource || undefined,
      ),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inspectionService.deleteInspection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDeleteTarget(null);
    },
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const clearFilters = () => {
    setFilterClass('');
    setFilterSource('');
    setPage(0);
  };

  const hasFilters = filterClass || filterSource;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-red-500';
    if (confidence >= 0.7) return 'bg-orange-500';
    if (confidence >= 0.5) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getConfidenceTextColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-red-600';
    if (confidence >= 0.7) return 'text-orange-600';
    if (confidence >= 0.5) return 'text-amber-600';
    return 'text-green-600';
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <HistoryIcon className="w-6 h-6 text-industrial-500" />
          Inspection History
        </h1>
        <p className="text-slate-500 mt-1">
          Comprehensive log of all past quality inspections with filtering and management.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-500">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-semibold">Filters</span>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden sm:block" />

          {/* Defect Class Filter */}
          <select
            value={filterClass}
            onChange={(e) => {
              setFilterClass(e.target.value);
              setPage(0);
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-industrial-500/30 focus:border-industrial-500 transition-colors"
          >
            <option value="">All Defect Types</option>
            {DEFECT_CLASSES.map((cls) => (
              <option key={cls} value={cls}>
                {cls.replace('_', ' ')}
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={filterSource}
            onChange={(e) => {
              setFilterSource(e.target.value);
              setPage(0);
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-industrial-500/30 focus:border-industrial-500 transition-colors"
          >
            <option value="">All Sources</option>
            <option value="upload">Upload</option>
            <option value="webcam">Webcam</option>
          </select>

          {/* Clear Filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}

          {/* Page Size Selector — pushed right */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-industrial-500/30 focus:border-industrial-500 transition-colors"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400 font-medium">per page</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-industrial-500 mb-4" />
          <p className="text-slate-500 font-medium">Loading inspection records...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5" />
          <div>
            <h3 className="font-bold">Failed to load inspection history</h3>
            <p className="text-sm">Please check if the backend is running and you are authenticated.</p>
          </div>
        </div>
      )}

      {/* Data Table */}
      {data && !isLoading && (
        <>
          {data.items.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Table Header */}
              <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-600">
                  {data.total} record{data.total !== 1 && 's'} found
                  {hasFilters && <span className="text-industrial-600 ml-1">(filtered)</span>}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5 w-16">#</th>
                      <th className="px-6 py-3.5">Image</th>
                      <th className="px-6 py-3.5">Defect Class</th>
                      <th className="px-6 py-3.5">Confidence</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Source</th>
                      <th className="px-6 py-3.5">Date & Time</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items.map((record) => (
                      <tr
                        key={record.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* ID */}
                        <td className="px-6 py-3 text-slate-400 font-mono text-xs">
                          #{record.id}
                        </td>

                        {/* Thumbnail */}
                        <td className="px-6 py-3">
                          {record.original_image_path ? (
                            <img
                              src={
                                record.original_image_path.startsWith('http')
                                  ? record.original_image_path
                                  : `${API_BASE_URL}/uploads/${record.original_image_path}`
                              }
                              alt={record.defect_class}
                              className="w-11 h-11 rounded-lg object-cover border border-slate-200 bg-slate-100 shadow-sm"
                              loading="lazy"
                            />
                          ) : (

                            <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                              <Activity className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                        </td>

                        {/* Defect Class */}
                        <td className="px-6 py-3 font-semibold text-slate-900 capitalize">
                          {record.defect_class.replace('_', ' ')}
                        </td>

                        {/* Confidence */}
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${getConfidenceColor(record.confidence)}`}
                                style={{ width: `${record.confidence * 100}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold ${getConfidenceTextColor(record.confidence)}`}>
                              {(record.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>

                        {/* Defect Status */}
                        <td className="px-6 py-3">
                          {record.is_defect ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100">
                              Defect
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                              OK
                            </span>
                          )}
                        </td>

                        {/* Source */}
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider ${
                              record.source === 'webcam'
                                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {record.source === 'webcam' ? (
                              <Video className="w-3 h-3" />
                            ) : (
                              <FileImage className="w-3 h-3" />
                            )}
                            {record.source}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-3 text-slate-500 text-xs">
                          <div>
                            {new Date(record.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="text-slate-400">
                            {new Date(record.created_at).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => setDeleteTarget(record.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete inspection"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  Showing{' '}
                  <span className="font-semibold text-slate-700">{skip + 1}</span>
                  {' '}&ndash;{' '}
                  <span className="font-semibold text-slate-700">
                    {Math.min(skip + pageSize, data.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-slate-700">{data.total}</span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      // Show pages around current page
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i;
                      } else if (page < 3) {
                        pageNum = i;
                      } else if (page > totalPages - 4) {
                        pageNum = totalPages - 5 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded-lg transition-colors ${
                            page === pageNum
                              ? 'bg-industrial-600 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {pageNum + 1}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {hasFilters ? 'No matching records' : 'No inspections yet'}
              </h3>
              <p className="text-sm text-slate-500 max-w-sm">
                {hasFilters ? (
                  <>
                    No inspection records match your current filters.{' '}
                    <button onClick={clearFilters} className="text-industrial-600 hover:underline font-medium">
                      Clear all filters
                    </button>{' '}
                    to see all records.
                  </>
                ) : (
                  <>
                    Start inspecting steel surfaces to build your history.{' '}
                    <Link to="/inspect/image" className="text-industrial-600 hover:underline font-medium">
                      Upload an image
                    </Link>{' '}
                    or{' '}
                    <Link to="/inspect/live" className="text-industrial-600 hover:underline font-medium">
                      start live inspection
                    </Link>
                    .
                  </>
                )}
              </p>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget !== null && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Inspection</h3>
                <p className="text-sm text-slate-500">Record #{deleteTarget}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              This action cannot be undone. The inspection record and associated data will be permanently removed.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
