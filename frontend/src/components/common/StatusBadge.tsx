import React from 'react';
import { PromoStatus } from '../../types/index.js';
import { getStatusDetails } from '../../utils/formatters.js';

interface StatusBadgeProps {
  status: PromoStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const details = getStatusDetails(status);

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses} ${details.badgeClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${details.dotClass}`} />
      {details.label}
    </span>
  );
};
