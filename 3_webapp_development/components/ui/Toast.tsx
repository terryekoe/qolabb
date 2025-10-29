'use client';

import { Toaster, toast } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

// Custom toast functions with icons
export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      icon: <CheckCircle className="w-5 h-5" />,
      style: {
        background: '#10b981',
        color: '#ffffff',
        borderRadius: '8px',
        padding: '12px 16px',
      },
    });
  },
  
  error: (message: string) => {
    toast.error(message, {
      icon: <XCircle className="w-5 h-5" />,
      style: {
        background: '#ef4444',
        color: '#ffffff',
        borderRadius: '8px',
        padding: '12px 16px',
      },
    });
  },
  
  warning: (message: string) => {
    toast(message, {
      icon: <AlertCircle className="w-5 h-5" />,
      style: {
        background: '#f59e0b',
        color: '#ffffff',
        borderRadius: '8px',
        padding: '12px 16px',
      },
    });
  },
  
  info: (message: string) => {
    toast(message, {
      icon: <Info className="w-5 h-5" />,
      style: {
        background: '#3b82f6',
        color: '#ffffff',
        borderRadius: '8px',
        padding: '12px 16px',
      },
    });
  },
  
  loading: (message: string) => {
    return toast.loading(message, {
      style: {
        background: '#6b7280',
        color: '#ffffff',
        borderRadius: '8px',
        padding: '12px 16px',
      },
    });
  },
  
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },
};

// Toast provider component
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#ffffff',
          color: '#374151',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        success: {
          duration: 3000,
        },
        error: {
          duration: 5000,
        },
      }}
    />
  );
}