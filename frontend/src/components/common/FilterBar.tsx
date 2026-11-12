import React from 'react';
import { PromoStatus } from '../../types/index.js';

interface FilterBarProps {
  currentStatus: PromoStatus | 'ALL';
  onStatusChange: (status: PromoStatus | 'ALL') => void;
  options?: { value: PromoStatus | 'ALL'; label: string; count?: number }[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  currentStatus,
  onStatusChange,
  options = [
    { value: 'ALL', label: 'All Promotions' },
    { value: 'SUBMITTED_TO_HEAD', label: 'Pending Head Review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED_BY_HEAD', label: 'Rejected by Head' },
    { value: 'DRAFT', label: 'Drafts' },
  ],
}) => {
  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-lg border border-slate-200">
      {options.map((opt) => {
        const isActive = currentStatus === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onStatusChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              isActive
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-spar-green-50 text-spar-green font-bold' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
