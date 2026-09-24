'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  Flame,
  ListTodo,
  FolderLock,
  FileBarChart,
  Layers,
  ArrowRight,
  CheckCircle2,
  Users,
  Target,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Cpu,
  Workflow,
  ExternalLink,
  ChevronRight,
  Database,
  Building2,
  FileSpreadsheet,
  FileText,
  Lock,
  Check,
  Info,
  Terminal,
  Download,
  GitBranch,
  Copy,
  Server,
  Laptop,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<'install' | 'problem' | 'solution' | 'matrix' | 'steps' | 'reference'>('install');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedSnippet(id);
      setTimeout(() => setCopiedSnippet(null), 2500);
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-govuk-blue via-[#002f6c] to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-4xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Framework Blueprint &amp; Local Setup Guide</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              What is Open CAF &amp; How Does It Solve Council Cyber Risk?
            </h1>
            <p className="mt-3 text-sm sm:text-base text-blue-100 leading-relaxed">
              An operational, tamper-evident NCSC Cyber Assessment Framework (CAF v4.0) pipeline designed to replace static spreadsheets with continuous assurance, citizen service risk prioritization, and actionable remediation workflows.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveTab('install')}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow transition-all"
              >
                <Terminal className="w-3.5 h-3.5 mr-1.5" />
                <span>Download &amp; Run Locally</span>
              </button>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-white text-govuk-blue hover:bg-blue-50 font-semibold text-xs shadow transition-all"
              >
                <span>FastAPI Swagger Docs</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </a>
              <Link
                href="/assessments"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold text-xs transition-all"
              >
                <span>Explore Live Assessment</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold text-xs transition-all"
              >
                <span>Executive Briefing PDF</span>
                <FileBarChart className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Tabbed Navigation Bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'install', label: '📥 Download & Run Locally', icon: Terminal, highlight: true },
            { id: 'problem', label: '1. The Core Problem', icon: AlertTriangle },
            { id: 'solution', label: '2. How Open CAF Solves It', icon: ShieldCheck },
            { id: 'matrix', label: '3. Inputs & Outputs Matrix', icon: Layers },
            { id: 'steps', label: '4. Workflow Implementation', icon: Workflow },
            { id: 'reference', label: '5. Demo & Quick Reference', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-govuk-blue text-govuk-blue dark:text-sky-400 dark:border-sky-400 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
                } ${tab.highlight && !isActive ? 'text-emerald-700 dark:text-emerald-400' : ''}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-govuk-blue dark:text-sky-400' : (tab.highlight ? 'text-emerald-600' : 'text-slate-400')}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 0: DOWNLOAD & RUN LOCALLY (GITHUB GUIDE) */}
        {activeTab === 'install' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Quickstart Header Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tested &amp; Production Verified</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    How to Download &amp; Run Open CAF Locally
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Follow this step-by-step tutorial to clone the repository from GitHub, seed the NCSC CAF v4.0 taxonomy, and run the entire platform.
                  </p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300">
                    Est. Setup Time: ~3 mins
                  </span>
                </div>
              </div>

              {/* Prerequisites */}
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  System Prerequisites
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10">
                    <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                      <Server className="w-4 h-4" />
                      <span>Method 1: Docker (Recommended)</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Requires <strong>Docker Desktop</strong> (macOS, Windows, or Linux) with Docker Compose. Spins up PostgreSQL (`pgvector`), MinIO S3, FastAPI backend, and Next.js frontend with 1 command.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/10">
                    <div className="flex items-center space-x-2 text-xs font-bold text-govuk-blue dark:text-sky-400 mb-1">
                      <Laptop className="w-4 h-4" />
                      <span>Method 2: Native Local Development</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Requires <strong>Python 3.11+</strong>, <strong>Node.js 18+</strong>, and <strong>npm</strong>. Uses local SQLite for instant zero-dependency database execution.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 1: Clone Repository */}
              <div className="mt-8 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-govuk-blue text-white flex items-center justify-center text-xs font-bold">1</span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Clone the Repository from GitHub
                    </h3>
                  </div>
                  <button
                    onClick={() => copyToClipboard('git clone https://github.com/Ugotony23/open-caf-verification-pipeline.git\ncd open-caf-verification-pipeline/test', 'clone')}
                    className="inline-flex items-center space-x-1 text-xs text-govuk-blue dark:text-sky-400 hover:underline"
                  >
                    {copiedSnippet === 'clone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet === 'clone' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <div className="relative p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto shadow-inner border border-slate-800">
                  <div className="text-slate-400"># Open your terminal and clone the repository:</div>
                  <div className="text-emerald-400 font-bold mt-1">git clone https://github.com/Ugotony23/open-caf-verification-pipeline.git</div>
                  <div className="text-emerald-400 font-bold">cd open-caf-verification-pipeline/test</div>
                </div>
              </div>

              {/* Step 2: Choose Method */}
              <div className="mt-10 space-y-8">
                <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase mb-4">
                    <span>Option A: Quickstart via Docker Compose (Turnkey)</span>
                  </div>

                  <div className="space-y-4">
                    {/* Docker Substep 1 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <span>Step A.1: Copy the Environment Variables</span>
                        <button
                          onClick={() => copyToClipboard('cp .env.example .env', 'env-docker')}
                          className="inline-flex items-center space-x-1 text-govuk-blue dark:text-sky-400 hover:underline"
                        >
                          {copiedSnippet === 'env-docker' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSnippet === 'env-docker' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-lg border border-slate-800">
                        cp .env.example .env
                      </div>
                    </div>

                    {/* Docker Substep 2 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <span>Step A.2: Launch Containers (Postgres pgvector, MinIO, Backend, Frontend)</span>
                        <button
                          onClick={() => copyToClipboard('docker compose up -d', 'docker-up')}
                          className="inline-flex items-center space-x-1 text-govuk-blue dark:text-sky-400 hover:underline"
                        >
                          {copiedSnippet === 'docker-up' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSnippet === 'docker-up' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-lg border border-slate-800">
                        docker compose up -d
                      </div>
                      <p className="text-[11px] text-slate-500">
                        This downloads and starts: PostgreSQL 16 on port 5432, MinIO S3 on 9000/9001, FastAPI on 8000, and Next.js on 3000.
                      </p>
                    </div>

                    {/* Docker Substep 3 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <span>Step A.3: Seed CAF v4.0 Taxonomy &amp; Load Demo Council Audit Dataset</span>
                        <button
                          onClick={() => copyToClipboard('docker compose exec backend python -m app.cli.seed_caf\ndocker compose exec backend python -m app.cli.seed_council_services\ndocker compose exec backend python -m app.cli.load_demo', 'docker-seed')}
                          className="inline-flex items-center space-x-1 text-govuk-blue dark:text-sky-400 hover:underline"
                        >
                          {copiedSnippet === 'docker-seed' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSnippet === 'docker-seed' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="p-3 bg-slate-950 text-slate-200 font-mono text-xs rounded-lg border border-slate-800 space-y-1">
                        <div className="text-slate-400"># 1. Seed NCSC CAF v4.0 Framework (4 Objectives, 39 Outcomes, 78 IGPs)</div>
                        <div className="text-emerald-400">docker compose exec backend python -m app.cli.seed_caf</div>
                        <div className="text-slate-400 mt-2"># 2. Seed UK Council Service Criticality Catalog (Tiers 1, 2, 3)</div>
                        <div className="text-emerald-400">docker compose exec backend python -m app.cli.seed_council_services</div>
                        <div className="text-slate-400 mt-2"># 3. Load Realistic Borsetshire District Council Audit Dataset</div>
                        <div className="text-emerald-400">docker compose exec backend python -m app.cli.load_demo</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Option B: Native Setup */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded bg-blue-100 dark:bg-blue-950 text-govuk-blue dark:text-sky-300 text-xs font-bold uppercase mb-4">
                    <span>Option B: Native Setup (Python + Node.js without Docker)</span>
                  </div>

                  <div className="space-y-4">
                    {/* Native Backend */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <span>Step B.1: Configure and Start the FastAPI Backend</span>
                        <button
                          onClick={() => copyToClipboard('cd backend\npython3 -m venv .venv\nsource .venv/bin/activate\npip install -r requirements.txt\npython -m app.cli.seed_caf\npython -m app.cli.seed_council_services\npython -m app.cli.load_demo\nuvicorn app.main:app --host 0.0.0.0 --port 8000', 'native-backend')}
                          className="inline-flex items-center space-x-1 text-govuk-blue dark:text-sky-400 hover:underline"
                        >
                          {copiedSnippet === 'native-backend' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSnippet === 'native-backend' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="p-3 bg-slate-950 text-slate-200 font-mono text-xs rounded-lg border border-slate-800 space-y-1">
                        <div className="text-slate-400"># Navigate to backend directory and create virtualenv:</div>
                        <div className="text-emerald-400">cd backend</div>
                        <div className="text-emerald-400">python3 -m venv .venv</div>
                        <div className="text-emerald-400">source .venv/bin/activate  <span className="text-slate-500"># On Windows: .venv\Scripts\activate</span></div>
                        <div className="text-slate-400 mt-2"># Install dependencies:</div>
                        <div className="text-emerald-400">pip install -r requirements.txt</div>
                        <div className="text-slate-400 mt-2"># Seed NCSC taxonomy and load demo assessment:</div>
                        <div className="text-emerald-400">python -m app.cli.seed_caf</div>
                        <div className="text-emerald-400">python -m app.cli.seed_council_services</div>
                        <div className="text-emerald-400">python -m app.cli.load_demo</div>
                        <div className="text-slate-400 mt-2"># Start backend server on port 8000:</div>
                        <div className="text-emerald-400">uvicorn app.main:app --host 0.0.0.0 --port 8000</div>
                      </div>
                    </div>

                    {/* Native Frontend */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <span>Step B.2: In a Second Terminal, Start the Next.js Frontend</span>
                        <button
                          onClick={() => copyToClipboard('cd frontend\nnpm install\nnpm run dev', 'native-frontend')}
                          className="inline-flex items-center space-x-1 text-govuk-blue dark:text-sky-400 hover:underline"
                        >
                          {copiedSnippet === 'native-frontend' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSnippet === 'native-frontend' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="p-3 bg-slate-950 text-slate-200 font-mono text-xs rounded-lg border border-slate-800 space-y-1">
                        <div className="text-slate-400"># Open a new terminal tab and run:</div>
                        <div className="text-emerald-400">cd frontend</div>
                        <div className="text-emerald-400">npm install</div>
                        <div className="text-emerald-400">npm run dev</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3: Access the App */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-govuk-blue text-white flex items-center justify-center text-xs font-bold">3</span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Open in Browser &amp; Log In
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
                        🌐 Access URLs
                      </h4>
                      <ul className="text-xs space-y-2">
                        <li className="flex items-center justify-between">
                          <span className="text-slate-500">Frontend Web UI:</span>
                          <a href="http://localhost:3000" target="_blank" rel="noreferrer" className="font-mono text-govuk-blue hover:underline">
                            http://localhost:3000
                          </a>
                        </li>
                        <li className="flex items-center justify-between">
                          <span className="text-slate-500">FastAPI Swagger UI:</span>
                          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="font-mono text-govuk-blue hover:underline">
                            http://localhost:8000/docs
                          </a>
                        </li>
                        <li className="flex items-center justify-between">
                          <span className="text-slate-500">MinIO S3 Storage:</span>
                          <span className="font-mono text-slate-600 dark:text-slate-400">
                            http://localhost:9001
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
                        🔑 Pre-Loaded Demo Login
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-500">Email:</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">ciso@borsetshire.gov.uk</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-500">Password:</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">Borsetshire2025!</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-500">Council:</span>
                          <span className="text-slate-800 dark:text-slate-200">Borsetshire District Council</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4: Run Automated Tests */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-govuk-blue text-white flex items-center justify-center text-xs font-bold">4</span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Verify System Health &amp; Automated Test Suites
                    </h3>
                  </div>
                  <div className="p-4 bg-slate-950 text-slate-200 font-mono text-xs rounded-xl border border-slate-800 space-y-2">
                    <div className="text-slate-400"># Run the full backend test suite (76/76 unit &amp; integration tests):</div>
                    <div className="text-emerald-400">pytest backend/tests/ -v</div>
                    <div className="text-slate-400 mt-3"># Run frontend TypeScript validation:</div>
                    <div className="text-emerald-400">cd frontend &amp;&amp; npm test</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: THE CORE PROBLEM */}
        {activeTab === 'problem' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Grid: Who & Why */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Who is facing the problem? */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Who is Facing This Problem?
                    </h2>
                    <p className="text-xs text-slate-500">Key local government stakeholders affected by compliance breakdown</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">CISOs &amp; Heads of Information Security</span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">Operational</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Must demonstrate adherence to 39 NCSC CAF Contributing Outcomes across fragmented council directorates without real-time audit tools.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Section 151 Officers (CFOs) &amp; Chief Executives</span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">Statutory</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Statutorily responsible for public funds and citizen safety, yet forced to approve million-pound cybersecurity budget requests based on opaque, technical spreadsheets.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Security Assessors &amp; Internal Audit</span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">Assurance</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Waste weeks chasing policies and pentest PDFs, verifying whether evidence is stale (&gt;12 months old), and manually computing scores.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Engineering &amp; Infrastructure Teams</span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">Execution</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Rarely receive structured Jira or GitHub tickets from audit findings. Deficits remain theoretical rather than prioritized technical work.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: Why are they facing the problem? */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Why Does the Traditional Approach Fail?
                    </h2>
                    <p className="text-xs text-slate-500">Root causes of compliance breakdown in UK local authorities</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="border-l-4 border-rose-500 pl-3.5 py-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">1. Spreadsheets Rot Immediately</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Excel workbooks are static snapshots. The moment an assessor enters an assessment, server configurations change, cloud services rotate, and staff turn over, rendering the document instantly obsolete.
                    </p>
                  </div>

                  <div className="border-l-4 border-amber-500 pl-3.5 py-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">2. Tamperable &amp; Stale Evidence</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Evidence files reside in personal SharePoint folders or local drives without SHA-256 integrity verification. Audits regularly cite 3-year-old backup procedures as current proof.
                    </p>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-3.5 py-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">3. Blindness to Citizen Service Impact</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      General cybersecurity tools treat all vulnerabilities equally. A lack of MFA on <strong>Adult &amp; Children&apos;s Social Care</strong> (Tier 1 Life Safety) gets the same severity as a vulnerability on the <strong>Public Leisure Wi-Fi</strong> (Tier 3).
                    </p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-3.5 py-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">4. The Executive &quot;Language Barrier&quot;</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Technical audit findings (e.g. &quot;IGP B2.a unmet due to NTLMv1 hash negotiation&quot;) are meaningless to Council Cabinet members, blocking capital expenditure sign-off.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Table: Static Excel vs Open CAF */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
                Comparative Analysis: Traditional NCSC CAF Excel vs. Open CAF
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">Dimension</th>
                      <th className="py-2.5 px-3 font-semibold text-rose-700 dark:text-rose-400">Traditional Static Excel</th>
                      <th className="py-2.5 px-3 font-semibold text-emerald-700 dark:text-emerald-400">Open CAF Operational Hub</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-200">Assessment Cadence</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Annual one-off rush before audit</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">Continuous, live multi-user verification</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-200">Evidence Verification</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Subjective claim, unverified links</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">SHA-256 cryptographic hashing &amp; 12mo freshness flag</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-200">Gap Classification</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Lumped together as &quot;Partially Achieved&quot;</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">Strictly separates Evidential Gaps from Control Deficits</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-200">Council Context</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">None; generic enterprise framing</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">Tiered (Tier 1 Life Safety: Social Care &amp; Elections)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-200">Engineering Action</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Manual copy-paste into emails</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">1-click export to Jira REST API &amp; GitHub Issues</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-200">Executive Reporting</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">40-page technical spreadsheets</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">2-page Cabinet Briefing PDF with £ GBP budget justification</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HOW OPEN CAF SOLVES IT */}
        {activeTab === 'solution' && (
          <div className="space-y-8 animate-fadeIn">
            {/* The 7 Core Architectural Pillars */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                The 7-Stage Core Resilience Pipeline
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                How data flows from NCSC guidance into concrete engineering remediations and executive assurance
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20">
                  <div className="flex items-center space-x-2 text-govuk-blue dark:text-sky-400 font-bold text-xs mb-2">
                    <span className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-[10px]">1</span>
                    <span>CAF v4.0 Assessment Engine</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Full hierarchy of 4 Objectives (A-D), 14 Principles, 39 Outcomes, and 78 IGPs. Evaluates Achieved, Partially Achieved, and Not Achieved with mathematical score aggregation.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20">
                  <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs mb-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-[10px]">2</span>
                    <span>Tamper-Evident Evidence Vault</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    S3/MinIO secure storage. Calculates SHA-256 checksum on upload, enforces strict MIME types, and monitors document freshness (&gt;12mo flagged as stale).
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
                  <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400 font-bold text-xs mb-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-[10px]">3</span>
                    <span>Automated Gap Detection</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Distinguishes between <em>Evidential Gaps</em> (control asserted but lacking cryptographic evidence) and <em>Control Deficits</em> (unmet IGPs) with automated severity ratings (1-5).
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20">
                  <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400 font-bold text-xs mb-2">
                    <span className="w-5 h-5 rounded-full bg-rose-200 dark:bg-rose-800 flex items-center justify-center text-[10px]">4</span>
                    <span>Council Impact Matrix</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Weights technical severity against real-world council service criticality (Tier 1: Social Care, Elections; Tier 2: Waste, Housing; Tier 3: Wi-Fi) to compute a 0-100 Priority Score.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20">
                  <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-400 font-bold text-xs mb-2">
                    <span className="w-5 h-5 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center text-[10px]">5</span>
                    <span>Remediation Kanban &amp; SLAs</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    1-click convert gaps into assigned tasks with £ GBP cost, effort hours, SLA deadlines (14/45/90/180 days), and drag-and-drop Kanban state management.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20">
                  <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-400 font-bold text-xs mb-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-[10px]">6</span>
                    <span>Multi-Format Integrations</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Directly export remediation plans to Jira REST API bulk JSON, GitHub Issues JSON, and formatted openpyxl Excel spreadsheets for Council Audit Committees.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/40 dark:bg-sky-950/20 md:col-span-2 lg:col-span-3">
                  <div className="flex items-center space-x-2 text-sky-700 dark:text-sky-400 font-bold text-xs mb-2">
                    <span className="w-5 h-5 rounded-full bg-sky-200 dark:bg-sky-800 flex items-center justify-center text-[10px]">7</span>
                    <span>Human-in-the-Loop Assistive AI &amp; Executive PDF Generation</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Client-side redactor scrubs IPs, hostnames, and PII before passing text to local Ollama or cloud LLMs for mapping recommendations. One-click WeasyPrint compiler produces publication-grade 2-page Cabinet Briefings.
                  </p>
                </div>
              </div>
            </div>

            {/* Formula Callout */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-6 shadow-md border border-slate-700">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                    The Council Impact Risk Prioritization Formula
                  </h3>
                  <div className="mt-2 p-3 bg-black/40 rounded-lg font-mono text-xs text-slate-200">
                    Priority Score (0 - 100) = Normalized [ Gap Severity (1-5) × Service Criticality Weight (1.0 - 3.0) × Threat Likelihood (1-3) ]
                  </div>
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    This mathematical model ensures that a technical deficit on an <strong>Adult Social Care case management system</strong> automatically generates a <strong>CRITICAL SLA (14 Days)</strong>, while an identical deficit on a public guest Wi-Fi system receives a <strong>LOW SLA (180 Days)</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INPUTS & OUTPUTS MATRIX */}
        {activeTab === 'matrix' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Component Inputs &amp; Outputs Specification
                  </h2>
                  <p className="text-xs text-slate-500">
                    Detailed breakdown of data ingested, internal processing rules, and outputs generated by each subsystem
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-govuk-blue text-white text-[11px] font-semibold">
                  8 Pipeline Stages
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      <th className="py-3 px-3 font-bold text-slate-700 dark:text-slate-300 w-1/5">Subsystem / Module</th>
                      <th className="py-3 px-3 font-bold text-blue-700 dark:text-blue-400 w-1/4">Key Ingested Inputs</th>
                      <th className="py-3 px-3 font-bold text-purple-700 dark:text-purple-400 w-1/4">Processing &amp; Algorithms</th>
                      <th className="py-3 px-3 font-bold text-emerald-700 dark:text-emerald-400 w-1/3">Produced Outputs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        1. Assessment Engine
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        Council tenant scope, assessor status selections (Achieved / Partial / Not Achieved), IGP check toggles, assessor rationale text.
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        Evaluates all 39 Contributing Outcomes against NCSC CAF v4.0 rules. Re-aggregates scores at Principle and Objective level on every update.
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                        Overall compliance % (0-100%), Objective maturity radar breakdowns (A, B, C, D), immutable audit logs.
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        2. Evidence Vault
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        Uploaded binary files (PDF, DOCX, XLSX, JSON, PNG), artifact category, validity date range, uploader user ID.
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        Computes cryptographic SHA-256 hash. Validates MIME headers. Stores in MinIO/S3. Computes staleness (&gt;365 days).
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                        Tamper-evident checksum header (`X-Checksum-SHA256`), download URL, freshness warning tags.
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        3. Evidence Linking
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        Assessment ID, Contributing Outcome Code (e.g. B2.a), Evidence ID, citation rationale quote.
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        Many-to-many junction mapping (`EvidenceOutcomeLink`). Verifies tenant boundary isolation.
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                        Linked evidence register per outcome, assessment coverage count, audit trail linking assessor to artifact.
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        4. Gap Analysis Engine
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        Outcome statuses, linked evidence count, evidence age (&gt;12mo), and unmet IGP items.
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        Evaluates blindspots: Flag as <em>Evidential Gap</em> if outcome claimed achieved with 0 evidence or stale evidence. Flag as <em>Control Deficit</em> if outcome is Partial or Not Achieved.
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                        Classified gaps register, gap severity scores (1-5), unmet IGP checklist, remediation recommendations.
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        5. Risk Prioritisation
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        Identified gaps + Council Service Catalog (Tier 1: 3.0x, Tier 2: 2.0x, Tier 3: 1.0x) + Threat Landscape weights.
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        Normalized multiplicative algorithm: Severity &times; Council Tier Weight &times; Threat Likelihood. Computes 3x3 heatmap coordinates (Likelihood vs Impact).
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                        Ranked Risk Register (Scores 0-100), Risk Tiers (Critical/High/Med/Low), Target SLAs (14, 45, 90, 180 days).
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        6. Remediation Planner
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        Gap details, task title, technical steps checklist, assignee name/email, estimated effort (hours), budget (£ GBP).
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        State machine transitions (`BACKLOG` &rarr; `IN_PROGRESS` &rarr; `IN_REVIEW` &rarr; `COMPLETED`). Auto-sets `completed_at` timestamp.
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                        Drag-and-drop Kanban board, budget burndown velocity %, open vs closed task metrics.
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        7. Multi-Format Exporters
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        Remediation tasks, assessment metadata, risk tiers, and costs.
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        Translates internal models into Jira REST API v2/v3 bulk issues, GitHub Issues payload, RFC 4180 CSV, and openpyxl styled workbooks.
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                        Downloadable `.csv`, formatted `.xlsx` with £ currency and status styling, copy-ready Jira JSON payloads.
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        8. Executive PDF Generator
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        Assessment compliance scores, Tier 1 service risks, total remediation investment (£ GBP), full 39 outcome evidence citations.
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        WeasyPrint HTML5/CSS3 paged media renderer. Injects SVG maturity donuts, risk tables, and statutory signatures.
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                        2-Page Executive Cabinet Briefing PDF (for Chief Exec &amp; S151 Officer) and 10+ page Comprehensive Audit Assurance Pack PDF.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WORKFLOW IMPLEMENTATION PLAYBOOK */}
        {activeTab === 'steps' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                How Any Local Authority Can Implement Open CAF
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                A 6-step practical operational roadmap to migrate from Excel into continuous assurance
              </p>

              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-full bg-govuk-blue text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Tenant Provisioning &amp; Role-Based Access Control (RBAC)
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Register your council entity (e.g. &quot;Borsetshire District Council&quot;) with designated authority type (Unitary, County, District, Metropolitan, London Borough). Provision user accounts with appropriate RBAC roles:
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2 text-[11px]">
                      <span className="px-2.5 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 font-mono">CISO_ADMIN</span>
                      <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-mono">SECURITY_ASSESSOR</span>
                      <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-mono">AUDITOR</span>
                      <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-mono">CABINET_VIEWER</span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start space-x-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-govuk-blue text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Configure the Council Service Criticality Catalog
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Populate your authority&apos;s digital systems across the 3 standard criticality tiers:
                    </p>
                    <ul className="mt-2 text-xs space-y-1 text-slate-600 dark:text-slate-400 list-disc list-inside">
                      <li><strong>Tier 1 (Weight 3.0 - Life Safety &amp; Statutory):</strong> Adult &amp; Children&apos;s Social Care, Revenues &amp; Council Tax, Electoral Roll, Emergency Planning, Payments Gateway.</li>
                      <li><strong>Tier 2 (Weight 2.0 - Operational):</strong> Planning Applications, Housing Repairs, Waste Routing, Staff Payroll.</li>
                      <li><strong>Tier 3 (Weight 1.0 - Informational):</strong> Public Website, Leisure Centre Bookings, Public Wi-Fi.</li>
                    </ul>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start space-x-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-govuk-blue text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Conduct Baseline CAF v4.0 Assessment
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Navigate to <strong>CAF Assessment</strong> (`/assessments`). Evaluate all 39 Contributing Outcomes across Objectives A, B, C, and D. Check achieved Indicators of Good Practice (IGPs) and record professional rationale notes.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start space-x-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-govuk-blue text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Upload &amp; Cryptographically Link Audit Evidence
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Deposit policies, pen test summaries, and disaster recovery plans into the <strong>Evidence Vault</strong> (`/evidence`). Link artifacts directly to relevant outcomes to clear Evidential Gaps.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex items-start space-x-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-govuk-blue text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow">
                    5
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Review Gaps, Heatmap &amp; Prioritize Risks
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Open <strong>Gap Analysis</strong> (`/gaps`) and <strong>Risk Prioritisation</strong> (`/risk`). Review the 3x3 Heatmap. 1-click convert high-priority gaps into active remediation tasks.
                    </p>
                  </div>
                </div>

                {/* Step 6 */}
                <div className="flex items-start space-x-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-govuk-blue text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow">
                    6
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Manage Remediation Kanban &amp; Generate Cabinet Briefing PDF
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Track tasks on the <strong>Remediation Tracker</strong> (`/remediation`), export to Jira, and download the 2-page <strong>Executive Cabinet Briefing PDF</strong> (`/reports`) to secure S151 Officer budget approval.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DEMO & QUICK REFERENCE */}
        {activeTab === 'reference' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                Pre-Loaded Demo Environment &amp; Quick Reference
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Ready-to-use testing environment with realistic UK local authority data
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
                    🔑 Pre-Loaded Demo Credentials
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500">Council Authority:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">Borsetshire District Council</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500">User Role:</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">CISO_ADMIN</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500">Email:</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">ciso@borsetshire.gov.uk</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500">Password:</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">Borsetshire2025!</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Pre-seeded Data:</span>
                      <span className="text-slate-900 dark:text-slate-100 font-semibold">39 Outcomes • 8 Evidence • 10 Tasks</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
                    🌐 System Endpoints
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500">Web App (Frontend):</span>
                      <a href="http://localhost:3000" target="_blank" rel="noreferrer" className="font-mono text-govuk-blue hover:underline">
                        http://localhost:3000
                      </a>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500">Backend API:</span>
                      <a href="http://localhost:8000" target="_blank" rel="noreferrer" className="font-mono text-govuk-blue hover:underline">
                        http://localhost:8000
                      </a>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500">Swagger Docs:</span>
                      <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="font-mono text-govuk-blue hover:underline">
                        http://localhost:8000/docs
                      </a>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500">Health Check:</span>
                      <a href="http://localhost:8000/api/v1/health" target="_blank" rel="noreferrer" className="font-mono text-emerald-600 hover:underline">
                        /api/v1/health
                      </a>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Architecture Guide:</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">/docs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CLI Commands */}
              <div className="mt-6 p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Command Line Quick Seeding Commands
                </h4>
                <pre className="text-xs font-mono text-emerald-400 overflow-x-auto space-y-1">
                  <code># 1. Seed NCSC CAF v4.0 Framework (39 Outcomes &amp; 78 IGPs)</code><br/>
                  <code>python -m app.cli.seed_caf</code><br/><br/>
                  <code># 2. Seed Standard UK Council Service Catalog (Tiers 1, 2, 3)</code><br/>
                  <code>python -m app.cli.seed_council_services</code><br/><br/>
                  <code># 3. Load Realistic Borsetshire District Council Audit Dataset</code><br/>
                  <code>python -m app.cli.load_demo</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
