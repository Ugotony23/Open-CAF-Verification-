'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_NAME_MAP: Record<string, string> = {
  dashboard: 'Executive Dashboard',
  assessments: 'CAF Assessment Matrix',
  evidence: 'Evidence Vault',
  gaps: 'Gap Analysis Engine',
  risk: 'Risk Prioritisation Matrix',
  remediation: 'Remediation Tracker',
  reports: 'Executive Reports',
  settings: 'System & Tenant Settings',
  outcomes: 'Contributing Outcome',
};

export function Breadcrumbs() {
  const pathname = usePathname();

  if (!pathname || pathname === '/') {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="py-2.5 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
      <ol className="flex items-center space-x-1.5 flex-wrap">
        <li>
          <Link
            href="/dashboard"
            className="flex items-center hover:text-govuk-blue dark:hover:text-sky-400 transition-colors"
          >
            <Home className="w-3.5 h-3.5 mr-1" />
            <span>Home</span>
          </Link>
        </li>

        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join('/')}`;
          const isLast = index === segments.length - 1;
          const label = ROUTE_NAME_MAP[segment] || segment.toUpperCase();

          return (
            <React.Fragment key={href}>
              <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-600 flex-shrink-0" />
              <li>
                {isLast ? (
                  <span className="font-semibold text-slate-900 dark:text-slate-200 truncate max-w-xs block">
                    {label}
                  </span>
                ) : (
                  <Link
                    href={href}
                    className="hover:text-govuk-blue dark:hover:text-sky-400 transition-colors truncate max-w-xs block"
                  >
                    {label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
