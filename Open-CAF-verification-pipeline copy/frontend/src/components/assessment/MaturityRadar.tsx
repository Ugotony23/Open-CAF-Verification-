'use client';

import React from 'react';
import {
  PieChart,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Filter,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { ScoreSummary, AssessmentFilter } from '@/types/assessment';

interface MaturityRadarProps {
  scoreSummary?: ScoreSummary;
  filter: AssessmentFilter;
  onFilterChange: (filter: AssessmentFilter) => void;
}

export function MaturityRadar({
  scoreSummary,
  filter,
  onFilterChange,
}: MaturityRadarProps) {
  const objectives = [
    {
      id: 'A',
      title: 'Managing Risk',
      score: scoreSummary?.objectives?.A?.completion_rate ?? 0,
      achieved: scoreSummary?.objectives?.A?.achieved ?? 0,
      total: scoreSummary?.objectives?.A?.total_outcomes ?? 9,
      color: 'text-govuk-blue dark:text-sky-400',
      stroke: '#1d70b8',
    },
    {
      id: 'B',
      title: 'Protecting',
      score: scoreSummary?.objectives?.B?.completion_rate ?? 0,
      achieved: scoreSummary?.objectives?.B?.achieved ?? 0,
      total: scoreSummary?.objectives?.B?.total_outcomes ?? 20,
      color: 'text-amber-500',
      stroke: '#f59e0b',
    },
    {
      id: 'C',
      title: 'Detecting',
      score: scoreSummary?.objectives?.C?.completion_rate ?? 0,
      achieved: scoreSummary?.objectives?.C?.achieved ?? 0,
      total: scoreSummary?.objectives?.C?.total_outcomes ?? 5,
      color: 'text-emerald-500',
      stroke: '#10b981',
    },
    {
      id: 'D',
      title: 'Minimising',
      score: scoreSummary?.objectives?.D?.completion_rate ?? 0,
      achieved: scoreSummary?.objectives?.D?.achieved ?? 0,
      total: scoreSummary?.objectives?.D?.total_outcomes ?? 5,
      color: 'text-purple-500',
      stroke: '#8b5cf6',
    },
  ];

  // SVG Radar coordinates calculation
  const size = 200;
  const center = size / 2;
  const radius = 70;

  // 4 axes for 4 Objectives
  const points = objectives.map((obj, i) => {
    const angle = (i * 2 * Math.PI) / 4 - Math.PI / 2;
    const r = (Math.max(obj.score, 10) / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  });

  const polygonPath = points.join(' ');

  const filterButtons: Array<{ id: AssessmentFilter; label: string; count?: number }> = [
    { id: 'all', label: 'Show All (39)' },
    {
      id: 'unassessed',
      label: 'Unassessed',
      count: scoreSummary?.overall_not_started_count,
    },
    { id: 'needs_evidence', label: 'Needs Evidence' },
    {
      id: 'deficits_only',
      label: 'Deficits Only',
      count:
        (scoreSummary?.overall_not_achieved_count || 0) +
        (scoreSummary?.overall_partially_achieved_count || 0),
    },
  ];

  const overallMaturity = scoreSummary?.overall_maturity_score ?? 0;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          <PieChart className="w-3.5 h-3.5 text-govuk-blue dark:text-sky-400" />
          <span>Maturity Scoring</span>
        </div>
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-govuk-blue text-white shadow-xs font-mono">
          {overallMaturity}% Maturity
        </span>
      </div>

      <div className="p-4 space-y-5 overflow-y-auto flex-1">
        {/* Visual 4-Axis Radar Chart */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
          <svg width={size} height={size} className="overflow-visible">
            {/* Background grid rings */}
            {[0.25, 0.5, 0.75, 1].map((scale) => (
              <circle
                key={scale}
                cx={center}
                cy={center}
                r={radius * scale}
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700/60"
                strokeDasharray="3 3"
              />
            ))}

            {/* Radar cross axes */}
            <line
              x1={center}
              y1={center - radius}
              x2={center}
              y2={center + radius}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-700/60"
            />
            <line
              x1={center - radius}
              y1={center}
              x2={center + radius}
              y2={center}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-700/60"
            />

            {/* Polygon Shape */}
            <polygon
              points={polygonPath}
              fill="rgba(29, 112, 184, 0.25)"
              stroke="#1d70b8"
              strokeWidth="2.5"
              className="transition-all duration-300"
            />

            {/* Node dots */}
            {points.map((pt, idx) => {
              const [x, y] = pt.split(',').map(Number);
              return (
                <circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#1d70b8"
                  className="ring-2 ring-white dark:ring-slate-900"
                />
              );
            })}

            {/* Labels */}
            <text
              x={center}
              y={center - radius - 8}
              textAnchor="middle"
              className="text-[10px] font-bold fill-slate-700 dark:fill-slate-300"
            >
              Obj A (Risk)
            </text>
            <text
              x={center + radius + 8}
              y={center + 3}
              textAnchor="start"
              className="text-[10px] font-bold fill-slate-700 dark:fill-slate-300"
            >
              Obj B (Protect)
            </text>
            <text
              x={center}
              y={center + radius + 14}
              textAnchor="middle"
              className="text-[10px] font-bold fill-slate-700 dark:fill-slate-300"
            >
              Obj C (Detect)
            </text>
            <text
              x={center - radius - 8}
              y={center + 3}
              textAnchor="end"
              className="text-[10px] font-bold fill-slate-700 dark:fill-slate-300"
            >
              Obj D (Minimise)
            </text>
          </svg>
        </div>

        {/* Objective Progress Bars */}
        <div className="space-y-2.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Objective Completion
          </h4>
          {objectives.map((obj) => (
            <div key={obj.id} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-800 dark:text-slate-200">
                  {obj.id}: {obj.title}
                </span>
                <span className={obj.color}>{obj.score}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${obj.score}%`,
                    backgroundColor: obj.stroke,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Filter Buttons */}
        <div>
          <div className="flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            <Filter className="w-3 h-3" />
            <span>Matrix Filters</span>
          </div>

          <div className="flex flex-col space-y-1.5">
            {filterButtons.map((btn) => {
              const isSelected = filter === btn.id;

              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => onFilterChange(btn.id)}
                  className={`px-3 py-2 rounded-md text-xs font-medium text-left flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-govuk-blue text-white shadow-xs font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{btn.label}</span>
                  {btn.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {btn.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
