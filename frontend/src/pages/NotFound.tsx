import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button.js';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="p-4 bg-slate-100 text-slate-500 rounded-full mb-4">
        <HelpCircle className="w-12 h-12" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800">404 - Page Not Found</h2>
      <p className="text-xs text-slate-500 max-w-sm mt-2 mb-6">
        The promotional page or resource you requested could not be found.
      </p>
      <Button
        variant="primary"
        size="md"
        leftIcon={<ArrowLeft className="w-4 h-4" />}
        onClick={() => navigate('/dashboard')}
      >
        Back to Dashboard
      </Button>
    </div>
  );
};
