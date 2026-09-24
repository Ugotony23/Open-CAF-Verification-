'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldCheck,
  FolderLock,
  AlertTriangle,
  Flame,
  ListTodo,
  FileBarChart,
  ExternalLink,
  HelpCircle,
  BookOpen,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'CAF Assessment',
    href: '/assessments',
    icon: ShieldCheck,
    badge: '39 Outcomes',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  {
    name: 'Evidence Vault',
    href: '/evidence',
    icon: FolderLock,
    badge: 'MinIO S3',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  {
    name: 'Gap Analysis',
    href: '/gaps',
    icon: AlertTriangle,
    badge: '12 Blindspots',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  {
    name: 'Risk Prioritisation',
    href: '/risk',
    icon: Flame,
  },
  {
    name: 'Remediation Tracker',
    href: '/remediation',
    icon: ListTodo,
    badge: 'Kanban',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  },
  {
    name: 'Executive Reports',
    href: '/reports',
    icon: FileBarChart,
    badge: 'PDF',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  },
  {
    name: 'Project Blueprint',
    href: '/docs',
    icon: BookOpen,
    badge: 'Guide',
    badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  },
];

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed md:sticky top-16 md:top-16 z-40 md:z-0 h-[calc(100vh-4rem)] w-64 flex-shrink-0 flex flex-col justify-between bg-white dark:bg-[#0e1422] border-r border-slate-200 dark:border-slate-800 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Section: Nav Links */}
        <div className="flex-1 py-4 px-3 overflow-y-auto">
          {/* Mobile close button header */}
          <div className="flex items-center justify-between px-3 pb-3 mb-2 md:hidden border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Navigation</span>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Assurance Modules
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard' || pathname === '/'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-govuk-blue text-white shadow-sm font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-govuk-blue dark:group-hover:text-sky-400'
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide flex-shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.badgeColor || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Framework & Council Compliance Info */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="p-2.5 rounded-md bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              <span>Framework Target</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[9px] font-mono">
                CAF v4.0
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              MHCLG Local Government Profile (4 Objectives • 39 Outcomes)
            </p>
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
              <a
                href="https://www.ncsc.gov.uk/collection/cyber-assessment-framework"
                target="_blank"
                rel="noreferrer"
                className="flex items-center hover:text-govuk-blue dark:hover:text-sky-400 transition-colors"
              >
                <span>NCSC Guidance</span>
                <ExternalLink className="w-2.5 h-2.5 ml-1" />
              </a>
              <div className="flex items-center space-x-1">
                <HelpCircle className="w-2.5 h-2.5" />
                <span>v1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
