import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Loader2, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { inspectionService } from '../services/inspection';
import type { PredictionResult } from '../types';

export default function InspectImage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG, BMP).');
      return;
    }
    setError(null);
    setResult(null);
    setFile(selectedFile);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    
    setIsAnalyzing(true);
    setError(null);
    try {
      const data = await inspectionService.uploadImage(file);
      setResult(data);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'An error occurred during analysis.';
      setError(detail);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-industrial-500" />
          Image Upload Inspection
        </h1>
        <p className="text-slate-500 mt-1">Upload a high-resolution steel surface image for AI analysis.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {!result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Uploader */}
          <div 
            className={`
              relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors
              ${isDragging ? 'border-industrial-500 bg-industrial-50/50' : 'border-slate-300 bg-white hover:bg-slate-50'}
              ${file ? 'hidden' : 'block'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect} 
              accept="image/jpeg, image/png, image/bmp" 
              className="hidden" 
            />
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-500">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Drag & Drop Image</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
              Supports JPEG, PNG, and BMP. Max file size 10MB.
            </p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2.5 bg-industrial-600 hover:bg-industrial-700 text-white font-semibold rounded-md shadow-sm transition-colors"
            >
              Browse Files
            </button>
          </div>

          {/* Preview State */}
          {file && previewUrl && (
            <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col items-center">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="max-h-[300px] w-auto object-contain rounded-md border border-slate-200 shadow-sm mb-6"
              />
              <div className="w-full flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-4">
                  <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button 
                    onClick={handleReset}
                    disabled={isAnalyzing}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-md transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="px-6 py-2 bg-industrial-600 hover:bg-industrial-700 text-white text-sm font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isAnalyzing ? 'Analyzing...' : 'Run Inspection'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex flex-col justify-center">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-industrial-500" />
              How it works
            </h3>
            <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
              <li>Upload a cropped patch image of the steel surface.</li>
              <li>The AI model (EfficientNet-B0) processes the image instantly.</li>
              <li>The system classifies the defect among 6 types: <span className="font-mono text-xs bg-slate-200 px-1 py-0.5 rounded">crazing, inclusion, patches, pitted_surface, rolled-in_scale, scratches</span>.</li>
              <li>A Grad-CAM heatmap is generated highlighting the specific defect area for explainability.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Result State */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Result Header */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Detection Result</p>
              <div className="flex items-center gap-4 text-2xl font-black text-slate-900 capitalize">
                {result.defect_class.replace('_', ' ')}
                <span className={`px-3 py-1 text-sm font-bold rounded-full ${
                  result.confidence > 0.8 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {(result.confidence * 100).toFixed(1)}% Confidence
                </span>
              </div>
            </div>
            <button 
              onClick={handleReset}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-md transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              New Inspection
            </button>
          </div>

          {/* Image Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                Original Image
              </div>
              <div className="p-6 flex-1 flex items-center justify-center bg-slate-100">
                <img 
                  src={`data:image/jpeg;base64,${result.original_base64}`} 
                  alt="Original" 
                  className="max-w-full h-auto max-h-[400px] object-contain rounded border border-slate-300 shadow-sm"
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-700 flex justify-between items-center">
                <span>Grad-CAM Heatmap</span>
                <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">AI Attention</span>
              </div>
              <div className="p-6 flex-1 flex items-center justify-center bg-slate-900">
                <img 
                  src={`data:image/png;base64,${result.gradcam_base64}`} 
                  alt="Grad-CAM" 
                  className="max-w-full h-auto max-h-[400px] object-contain rounded shadow-sm border border-slate-700"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
