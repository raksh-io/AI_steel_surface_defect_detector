import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CameraOff, Play, Square, Maximize, Minimize, AlertTriangle, Activity, ChevronRight, ChevronLeft, Target, X } from 'lucide-react';
import { inspectionService } from '../services/inspection';
import type { PredictionResult } from '../types';

export default function InspectLive() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [recentDetections, setRecentDetections] = useState<PredictionResult[]>([]);
  
  const [fps, setFps] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  
  const navigate = useNavigate();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  const fpsIntervalRef = useRef<number | null>(null);

  // Request camera permissions and setup stream
  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      streamRef.current = stream;
      setHasPermission(true);
      setIsActive(true);
    } catch (err: any) {
      setHasPermission(false);
      setError('Camera access denied or not available.');
    }
  };

  // Stop camera and cleanup stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setResult(null);
  }, []);

  // Frame capture loop
  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get Base64 JPEG
    const base64Frame = canvas.toDataURL('image/jpeg', 0.8);
    frameCountRef.current += 1;

    try {
      const data = await inspectionService.uploadWebcamFrame(base64Frame);
      setResult(data);
      if (data.is_defect) {
        setRecentDetections(prev => [data, ...prev].slice(0, 5));
      }
    } catch (err) {
      console.error('Frame analysis failed', err);
    }
  }, [isActive]);

  // Manage capture interval
  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(captureFrame, 500); // 2 FPS
      
      // Calculate fake display FPS based on stream activity
      fpsIntervalRef.current = window.setInterval(() => {
        setFps(frameCountRef.current * 2); // Frames in last 500ms * 2 = approx FPS for the visual (usually 2-4)
        frameCountRef.current = 0;
      }, 1000);

    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (fpsIntervalRef.current) clearInterval(fpsIntervalRef.current);
      setFps(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (fpsIntervalRef.current) clearInterval(fpsIntervalRef.current);
    };
  }, [isActive, captureFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const getStatusColor = (confidence: number, isDefect: boolean) => {
    if (!isDefect) return '#22C55E'; // Success Green
    if (confidence > 0.8) return '#EF4444'; // Danger Red
    return '#F59E0B'; // Warning Amber
  };

  return (
    <div ref={containerRef} className="h-screen w-full bg-black text-white flex overflow-hidden font-mono select-none">
      
      {/* Main Camera Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center bg-black">
        
        {/* Video Element */}
        <div className="relative w-full h-full flex items-center justify-center">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-contain ${!hasPermission && !isActive ? 'hidden' : 'block'}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Close/Exit Button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="absolute top-6 right-6 z-30 p-2 bg-black/50 hover:bg-[#EF4444] text-white/70 hover:text-white rounded-full backdrop-blur-md border border-white/10 transition-colors shadow-lg"
            title="Close and return to Dashboard"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Standby State */}
          {(!hasPermission || !isActive) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 z-10">
              <CameraOff className="w-24 h-24 mb-6 opacity-30" />
              <p className="text-2xl font-bold tracking-widest text-slate-400">VISION SYSTEM OFFLINE</p>
              <p className="text-sm opacity-75 mt-2">Awaiting operator initialization.</p>
            </div>
          )}

          {/* Top Left Telemetry Overlay */}
          {isActive && (
            <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded z-20 min-w-[280px]">
              <div className="flex items-center justify-between mb-4 border-b border-white/20 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="font-bold tracking-wider text-lg">LIVE</span>
                </div>
                <span className="text-xs text-white/50">{new Date().toLocaleTimeString()}</span>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Status</p>
                  <p className="text-sm font-bold text-[#22C55E]">DETECTING</p>
                </div>

                <div>
                  <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Defect Type</p>
                  <p className="text-xl font-bold uppercase" style={{ color: result?.is_defect ? getStatusColor(result.confidence, result.is_defect) : '#22C55E' }}>
                    {!result ? 'SCANNING...' : (!result.is_defect && result.defect_class === 'No_Defect' ? 'HEALTHY / NO DEFECT' : result.defect_class.replace('_', ' '))}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Confidence</p>
                  <p className="text-3xl font-black">
                    {result ? `${(result.confidence * 100).toFixed(1)}%` : '--.-%'}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-widest">Model</p>
                    <p className="text-xs font-bold text-white/80">EfficientNet-B0</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/50 uppercase tracking-widest">FPS</p>
                    <p className="text-xs font-bold text-white/80">{fps > 0 ? fps : '--'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#EF4444]/90 text-white px-6 py-3 rounded shadow-2xl flex items-center gap-3 z-30">
              <AlertTriangle className="w-6 h-6" />
              <span className="font-bold">{error}</span>
            </div>
          )}

          {/* Floating Controls Overlay */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md border border-white/10 rounded-full px-6 py-3 flex items-center gap-4 z-30 shadow-2xl">
            {!isActive ? (
              <button 
                onClick={startCamera}
                className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#22C55E]/80 text-black font-bold px-6 py-2 rounded-full transition-colors"
              >
                <Play className="w-5 h-5" /> Start Camera
              </button>
            ) : (
              <button 
                onClick={stopCamera}
                className="flex items-center gap-2 bg-[#EF4444] hover:bg-[#EF4444]/80 text-white font-bold px-6 py-2 rounded-full transition-colors"
              >
                <Square className="w-5 h-5" /> Stop Camera
              </button>
            )}
            
            <div className="w-px h-6 bg-white/20 mx-2"></div>

            <button 
              onClick={captureFrame}
              disabled={!isActive}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
              title="Manual Capture"
            >
              <Camera className="w-5 h-5" />
            </button>
            
            <button 
              onClick={toggleFullscreen}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Collapsible Right Panel */}
      <div 
        className={`bg-[#0a0a0a] border-l border-white/10 transition-all duration-300 ease-in-out flex flex-col relative z-20 shadow-2xl
          ${isPanelOpen ? 'w-80' : 'w-0'}
        `}
      >
        {/* Toggle Button */}
        <button 
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="absolute -left-8 top-1/2 -translate-y-1/2 bg-[#0a0a0a] border border-r-0 border-white/10 text-white/50 hover:text-white p-1 rounded-l-md"
        >
          {isPanelOpen ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
        </button>

        {isPanelOpen && (
          <div className="flex-1 w-80 overflow-y-auto flex flex-col p-6 min-w-[320px]">
            <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-6 border-b border-white/10 pb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Inspection Log
            </h3>

            {/* Current Result Heatmap */}
            <div className="mb-8">
              <p className="text-xs text-white/50 uppercase tracking-widest mb-2">Grad-CAM Attention</p>
              <div className="w-full aspect-video bg-black rounded border border-white/10 overflow-hidden flex items-center justify-center relative">
                {result?.gradcam_base64 ? (
                  <img 
                    src={`data:image/png;base64,${result.gradcam_base64}`} 
                    alt="Grad-CAM" 
                    className="w-full h-full object-cover opacity-80"
                  />
                ) : (
                  <Target className="w-8 h-8 text-white/20" />
                )}
                {/* Crosshair Overlay */}
                <div className="absolute inset-0 pointer-events-none border border-white/5">
                  <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10"></div>
                  <div className="absolute left-1/2 top-0 w-[1px] h-full bg-white/10"></div>
                </div>
              </div>
            </div>

            {/* Recent Detections */}
            <div>
              <p className="text-xs text-white/50 uppercase tracking-widest mb-3">Recent Defects</p>
              <div className="space-y-3">
                {recentDetections.filter(d => d.is_defect).length > 0 ? (
                  recentDetections.filter(d => d.is_defect).map((det, idx) => (
                    <div key={idx} className="bg-white/5 rounded p-3 border border-white/5 text-sm flex justify-between items-center">
                      <div>
                        <p className="font-bold text-[#EF4444] uppercase">{det.defect_class.replace('_', ' ')}</p>
                        <p className="text-xs text-white/50">{(det.confidence * 100).toFixed(1)}%</p>
                      </div>
                      <div className="w-10 h-10 bg-black rounded overflow-hidden border border-white/10">
                        <img 
                          src={`data:image/png;base64,${det.gradcam_base64}`} 
                          className="w-full h-full object-cover"
                          alt="Thumb"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-white/30 italic">No defects detected in this session.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
