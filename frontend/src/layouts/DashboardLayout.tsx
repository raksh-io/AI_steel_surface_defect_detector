import React, { useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  FileImage,
  Video,
  History,
  BarChart3,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Cpu,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const isFullscreenRoute = location.pathname === '/inspect/live';

  const [backendOnline, setBackendOnline] = useState(false);
  const [notificationsCount] = useState(0);

  // Poll backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/health');
        setBackendOnline(res.ok);
      } catch {
        setBackendOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Image Inspection', href: '/inspect/image', icon: FileImage },
    { name: 'Live Inspection', href: '/inspect/live', icon: Video },
    { name: 'Inspection History', href: '/history', icon: History },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // Map route path to human-readable breadcrumb name
  const getPageTitle = () => {
    const currentPath = location.pathname;
    const navItem = navigation.find(item => item.href === currentPath);
    return navItem ? navItem.name : 'Platform';
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Mobile Top Header */}
      {!isFullscreenRoute && (
        <header className="lg:hidden bg-slate-900 text-white flex items-center justify-between p-4 border-b border-slate-800 shadow-md">
          <div className="flex items-center space-x-2">
            <Cpu className="w-6 h-6 text-industrial-400" />
            <span className="font-bold tracking-tight text-sm">SteelDefect AI</span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>
      )}

      <div className="flex-1 flex relative">
        {/* Sidebar Container */}
        {!isFullscreenRoute && (
          <aside
            className={`
              fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-[100vh]
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
          >
            <div>
              {/* Logo area */}
              <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-[#0c1220]">
                <Link to="/dashboard" className="flex items-center space-x-2.5">
                  <Cpu className="w-7 h-7 text-industrial-400" />
                  <span className="font-bold text-white tracking-tight text-lg">SteelDefect AI</span>
                </Link>
              </div>

              {/* Sidebar navigation */}
              <nav className="mt-6 px-4 space-y-1.5">
                {navigation.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => `
                        flex items-center space-x-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors duration-150
                        ${isActive
                          ? 'bg-industrial-600 text-white'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }
                      `}
                    >
                      <IconComponent className="w-5 h-5 shrink-0" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* User / Logout Section */}
            <div className="p-4 border-t border-slate-800 bg-[#0c1220]">
              <div className="flex items-center space-x-3 mb-3.5">
                <div className="w-9 h-9 rounded-full bg-industrial-600 text-white flex items-center justify-center font-bold text-sm">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user?.name ?? 'Inspector'}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email ?? ''}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/20 rounded-md transition-colors duration-150"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        )}

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto lg:h-[100vh]">
          {/* Top Navbar */}
          {!isFullscreenRoute && (
            <header className="hidden lg:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 sticky top-0 z-30 shadow-sm">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-bold text-slate-900">{getPageTitle()}</h2>
                
                {/* Backend Connectivity Status Indicator */}
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-semibold">
                  {backendOnline ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
                      <span className="text-green-700 text-[10px] uppercase font-bold tracking-wider">Sys Online</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                      <span className="text-red-700 text-[10px] uppercase font-bold tracking-wider">Sys Offline</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-5">
                {/* Notification icon */}
                <button className="relative p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full focus:outline-none transition-colors">
                  <Bell className="w-5 h-5" />
                  {notificationsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
                  )}
                </button>

                <div className="w-px h-6 bg-slate-200"></div>

                {/* User badge */}
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-industrial-600 text-white flex items-center justify-center font-bold text-xs border border-industrial-700">
                    {userInitials}
                  </div>
                  <div className="text-left leading-tight hidden xl:block">
                    <p className="text-xs font-semibold text-slate-800">{user?.name ?? 'Inspector'}</p>
                    <p className="text-[10px] font-bold text-industrial-500 uppercase tracking-wider">{user?.role ?? 'Inspector'}</p>
                  </div>
                </div>
              </div>
            </header>
          )}

          {/* Main content body */}
          <main className={`flex-1 overflow-x-hidden ${isFullscreenRoute ? 'bg-black' : 'bg-slate-50'}`}>
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm"
        ></div>
      )}
    </div>
  );
}
