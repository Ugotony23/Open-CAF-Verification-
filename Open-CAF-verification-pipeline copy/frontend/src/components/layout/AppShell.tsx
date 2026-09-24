'use client';

import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navigation Header */}
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      {/* Main Layout Body */}
      <div className="flex-1 flex flex-row">
        {/* Persistent Desktop / Drawer Mobile Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Content Column */}
        <div className="flex-1 flex flex-col min-w-0">
          <Breadcrumbs />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
