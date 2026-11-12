import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button.js';
import { ShieldX, ArrowLeft } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="p-4 bg-rose-50 text-spar-red rounded-full mb-4 border border-rose-200">
        <ShieldX className="w-12 h-12" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800">Access Restricted</h2>
      <p className="text-xs text-slate-500 max-w-md mt-2 mb-6">
        Your assigned user role does not possess the necessary permissions to access this promotional section. 
        Please contact your SPAR system administrator if you require role re-assignment.
      </p>
      <Button
        variant="primary"
        size="md"
        leftIcon={<ArrowLeft className="w-4 h-4" />}
        onClick={() => navigate('/dashboard')}
      >
        Return to Dashboard
      </Button>
    </div>
  );
};
