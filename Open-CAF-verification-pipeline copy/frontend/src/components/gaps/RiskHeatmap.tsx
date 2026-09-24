'use client';

import React from 'react';
import { Flame, Info, Filter, X, ArrowUpRight } from 'lucide-react';
import { PrioritizedRiskSummary } from '@/types/risk';

interface RiskHeatmapProps {
  summary: PrioritizedRiskSummary;
  selectedQuadrant: string | null;
  onSelectQuadrant: (quadrantKey: string | null) => void;
}

interface CellConfig {
  key: string;
  likelihood: 1 | 2 | 3;
  impact: 1 | 2 | 3;
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  bgActive: string;
  bgDefault: string;
  textColor: string;
  borderColor: string;
}

const HEATMAP_CELLS: CellConfig[][] = [
  // Row 1: High Likelihood (L3)
  [
    {
      key: 'L3_I1',
      likelihood: 3,
      impact: 1,
      level: 'MEDIUM',
      title: 'High Threat x Tier 3 Impact',
      bgActive: 'bg-amber-100 dark:bg-amber-950/70 border-amber-500',
      bgDefault: 'bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/80 border-amber-200 dark:border-amber-900/60',
      textColor: 'text-amber-700 dark:text-amber-400',
      borderColor: 'border-amber-400',
    },
    {
      key: 'L3_I2',
      likelihood: 3,
      impact: 2,
      level: 'HIGH',
      title: 'High Threat x Tier 2 Impact',
      bgActive: 'bg-orange-100 dark:bg-orange-950/70 border-orange-500',
      bgDefault: 'bg-orange-50/70 dark:bg-orange-950/30 hover:bg-orange-100/80 border-orange-200 dark:border-orange-900/60',
      textColor: 'text-orange-700 dark:text-orange-400',
      borderColor: 'border-orange-400',
    },
    {
      key: 'L3_I3',
      likelihood: 3,
      impact: 3,
      level: 'CRITICAL',
      title: 'High Threat x Tier 1 Impact',
      bgActive: 'bg-red-100 dark:bg-red-950/80 border-red-600',
      bgDefault: 'bg-red-50/80 dark:bg-red-950/40 hover:bg-red-100/90 border-red-200 dark:border-red-900/70',
      textColor: 'text-red-700 dark:text-red-400',
      borderColor: 'border-red-500',
    },
  ],
  // Row 2: Medium Likelihood (L2)
  [
    {
      key: 'L2_I1',
      likelihood: 2,
      impact: 1,
      level: 'LOW',
      title: 'Medium Threat x Tier 3 Impact',
      bgActive: 'bg-slate-100 dark:bg-slate-800 border-slate-500',
      bgDefault: 'bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100/80 border-slate-200 dark:border-slate-800',
      textColor: 'text-slate-700 dark:text-slate-300',
      borderColor: 'border-slate-400',
    },
    {
      key: 'L2_I2',
      likelihood: 2,
      impact: 2,
      level: 'MEDIUM',
      title: 'Medium Threat x Tier 2 Impact',
      bgActive: 'bg-amber-100 dark:bg-amber-950/70 border-amber-500',
      bgDefault: 'bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/80 border-amber-200 dark:border-amber-900/60',
      textColor: 'text-amber-700 dark:text-amber-400',
      borderColor: 'border-amber-400',
    },
    {
      key: 'L2_I3',
      likelihood: 2,
      impact: 3,
      level: 'HIGH',
      title: 'Medium Threat x Tier 1 Impact',
      bgActive: 'bg-orange-100 dark:bg-orange-950/70 border-orange-500',
      bgDefault: 'bg-orange-50/70 dark:bg-orange-950/30 hover:bg-orange-100/80 border-orange-200 dark:border-orange-900/60',
      textColor: 'text-orange-700 dark:text-orange-400',
      borderColor: 'border-orange-400',
    },
  ],
  // Row 3: Low Likelihood (L1)
  [
    {
      key: 'L1_I1',
      likelihood: 1,
      impact: 1,
      level: 'LOW',
      title: 'Low Threat x Tier 3 Impact',
      bgActive: 'bg-slate-100 dark:bg-slate-800 border-slate-500',
      bgDefault: 'bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100/80 border-slate-200 dark:border-slate-800',
      textColor: 'text-slate-700 dark:text-slate-300',
      borderColor: 'border-slate-400',
    },
    {
      key: 'L1_I2',
      likelihood: 1,
      impact: 2,
      level: 'LOW',
      title: 'Low Threat x Tier 2 Impact',
      bgActive: 'bg-slate-100 dark:bg-slate-800 border-slate-500',
      bgDefault: 'bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100/80 border-slate-200 dark:border-slate-800',
      textColor: 'text-slate-700 dark:text-slate-300',
      borderColor: 'border-slate-400',
    },
    {
      key: 'L1_I3',
      likelihood: 1,
      impact: 3,
      level: 'MEDIUM',
      title: 'Low Threat x Tier 1 Impact',
      bgActive: 'bg-amber-100 dark:bg-amber-950/70 border-amber-500',
      bgDefault: 'bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/80 border-amber-200 dark:border-amber-900/60',
      textColor: 'text-amber-700 dark:text-amber-400',
      borderColor: 'border-amber-400',
    },
  ],
];

export function RiskHeatmap({ summary, selectedQuadrant, onSelectQuadrant }: RiskHeatmapProps) {
  const distribution = summary.heatmap_distribution || {};

  const handleCellClick = (key: string) => {
    if (selectedQuadrant === key) {
      onSelectQuadrant(null);
    } else {
      onSelectQuadrant(key);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
            <Flame className="w-4 h-4" />
            <span>Interactive Risk Heatmap Matrix (3x3)</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            Threat Likelihood vs. Council Service Impact
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click any cell to filter prioritized risks below by risk quadrant.
          </p>
        </div>

        {selectedQuadrant && (
          <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 px-3 py-1.5 rounded-lg text-xs text-blue-900 dark:text-blue-300">
            <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>
              Filtered to: <strong>{selectedQuadrant}</strong>
            </span>
            <button
              onClick={() => onSelectQuadrant(null)}
              className="ml-1 p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded text-blue-700 dark:text-blue-300"
              title="Clear quadrant filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Heatmap Grid Layout */}
      <div className="relative pt-2 pb-1">
        {/* Y-Axis Label */}
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 flex items-center">
          <span>Threat Likelihood (Active UK Vectors)</span>
          <ArrowUpRight className="w-3.5 h-3.5 ml-1 text-slate-400" />
        </div>

        <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-2.5">
          {/* Column Headers: Service Impact */}
          <div className="flex items-end justify-center pb-1 text-[11px] font-semibold text-slate-400">
            <span>Likelihood</span>
          </div>
          <div className="text-center pb-1 border-b-2 border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Tier 3</span>
            <span className="text-[10px] text-slate-500 block">Informational (1.0x)</span>
          </div>
          <div className="text-center pb-1 border-b-2 border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Tier 2</span>
            <span className="text-[10px] text-slate-500 block">Operational (2.0x)</span>
          </div>
          <div className="text-center pb-1 border-b-2 border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Tier 1</span>
            <span className="text-[10px] text-slate-500 block">Critical Life/Welfare (3.0x)</span>
          </div>

          {/* Grid Rows */}
          {HEATMAP_CELLS.map((row, rowIdx) => {
            const rowLabel =
              rowIdx === 0
                ? { level: 'High (3)', sub: 'Ransomware/VPN' }
                : rowIdx === 1
                ? { level: 'Medium (2)', sub: 'Data Leak/SIEM' }
                : { level: 'Low (1)', sub: 'Governance' };

            return (
              <React.Fragment key={`row-${rowIdx}`}>
                {/* Row Header */}
                <div className="flex flex-col justify-center pr-2 border-r-2 border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {rowLabel.level}
                  </span>
                  <span className="text-[9px] text-slate-400 truncate">{rowLabel.sub}</span>
                </div>

                {/* 3 Columns */}
                {row.map((cell) => {
                  const count = distribution[cell.key] || 0;
                  const isSelected = selectedQuadrant === cell.key;

                  return (
                    <button
                      key={cell.key}
                      onClick={() => handleCellClick(cell.key)}
                      className={`h-24 p-3 rounded-xl border flex flex-col justify-between text-left transition-all relative ${
                        isSelected
                          ? `${cell.bgActive} ring-2 ring-offset-2 ring-blue-600 dark:ring-offset-slate-900 shadow-md scale-[1.02] z-10`
                          : cell.bgDefault
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                          {cell.key}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                            cell.level === 'CRITICAL'
                              ? 'bg-red-200/70 text-red-900 dark:bg-red-900/60 dark:text-red-200'
                              : cell.level === 'HIGH'
                              ? 'bg-orange-200/70 text-orange-900 dark:bg-orange-900/60 dark:text-orange-200'
                              : cell.level === 'MEDIUM'
                              ? 'bg-amber-200/70 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200'
                              : 'bg-slate-200/70 text-slate-900 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {cell.level}
                        </span>
                      </div>

                      <div className="mt-1 flex items-baseline justify-between w-full">
                        <span className={`text-2xl font-black ${cell.textColor}`}>
                          {count}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {count === 1 ? '1 risk' : `${count} risks`}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>

        {/* Bottom Legend */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500 mr-1.5" />
              Critical (≥75)
            </span>
            <span className="flex items-center">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 mr-1.5" />
              High (50-74)
            </span>
            <span className="flex items-center">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 mr-1.5" />
              Medium (25-49)
            </span>
            <span className="flex items-center">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 mr-1.5" />
              Low (&lt;25)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 flex items-center">
            <Info className="w-3 h-3 mr-1" />
            Impact weight multiplier: Tier 1 (3.0), Tier 2 (2.0), Tier 3 (1.0)
          </span>
        </div>
      </div>
    </div>
  );
}
