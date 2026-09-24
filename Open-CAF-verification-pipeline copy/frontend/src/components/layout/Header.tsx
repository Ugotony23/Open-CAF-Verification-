'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Building2,
  ChevronDown,
  Moon,
  Sun,
  ShieldCheck,
  User as UserIcon,
  Menu,
  CheckCircle2,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { user, tenant, logout, isDemo } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showAssessmentDropdown, setShowAssessmentDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(
    'CAF v4.0 Annual Audit 2025/26 (In Progress)'
  );

  useEffect(() => {
    // Check initial dark mode preference
    const isDark =
      localStorage.getItem('opencaf_theme') === 'dark' ||
      (!('opencaf_theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('opencaf_theme', 'dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('opencaf_theme', 'light');
    }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'CISO_ADMIN':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300 dark:border-purple-700';
      case 'SECURITY_ASSESSOR':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'AUDITOR':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      case 'CABINET_VIEWER':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0b0c0c] text-white border-b border-slate-800 shadow-md">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left Section: Mobile Menu & Council Branding */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Council Badge */}
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-md bg-govuk-blue flex items-center justify-center font-bold text-white shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-white">
                  {tenant?.name || 'Borsetshire Council'}
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {tenant?.authority_type || 'UNITARY'}
                </span>
              </div>
              <div className="flex items-center space-x-1 text-[11px] text-slate-400">
                <Building2 className="w-3 h-3" />
                <span>Open CAF Assurance Platform</span>
                {isDemo && (
                  <span className="ml-1 px-1 py-0.2 rounded bg-amber-900/60 text-amber-300 border border-amber-700/50 text-[9px] font-mono">
                    DEMO TENANT
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Active Assessment Selector */}
        <div className="hidden lg:flex items-center relative">
          <button
            onClick={() => setShowAssessmentDropdown(!showAssessmentDropdown)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition-colors"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium truncate max-w-[280px]">
              {selectedAssessment}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showAssessmentDropdown && (
            <div className="absolute top-10 left-0 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 text-xs">
              <div className="px-3 py-2 text-[11px] uppercase font-semibold tracking-wider text-slate-400 border-b border-slate-800">
                Active Council Assessments
              </div>
              {[
                'CAF v4.0 Annual Audit 2025/26 (In Progress)',
                'Baseline Digital Services Audit 2024 (Completed)',
                'Revenues & Benefits Cloud Migration CAF (Draft)',
              ].map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setSelectedAssessment(item);
                    setShowAssessmentDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 text-slate-200 ${
                    selectedAssessment === item ? 'bg-slate-800/60 text-sky-400 font-semibold' : ''
                  }`}
                >
                  <span className="truncate">{item}</span>
                  {selectedAssessment === item && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Section: Theme Toggle & User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-300" />
            )}
          </button>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-slate-800 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 border border-slate-600">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-white leading-tight">
                  {user?.full_name || 'Arthur Pendelton'}
                </div>
                <div className="flex items-center mt-0.5">
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded border text-[9px] font-mono font-bold ${getRoleBadgeStyle(
                      user?.role
                    )}`}
                  >
                    {user?.role || 'CISO_ADMIN'}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 top-11 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="font-semibold text-white">{user?.full_name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  <div className="mt-1">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold ${getRoleBadgeStyle(
                        user?.role
                      )}`}
                    >
                      {user?.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 flex items-center space-x-2 text-rose-400 hover:bg-slate-800"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
