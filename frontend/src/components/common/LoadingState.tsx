import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading promotional data...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-slate-200">
      <div className="w-8 h-8 border-3 border-spar-green border-t-transparent rounded-full animate-spin mb-3"></div>
      <p className="text-xs font-medium text-slate-500">{message}</p>
    </div>
  );
};
