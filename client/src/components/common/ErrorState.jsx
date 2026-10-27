import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function ErrorState({
  title = 'Something went wrong',
  message = 'We encountered an error loading this data. Please try again.',
  onRetry = null,
}) {
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 my-6 text-center flex flex-col items-center">
      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-rose-900 mb-1">{title}</h3>
      <p className="text-sm text-rose-700 max-w-md mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 border border-rose-300 text-sm font-medium rounded-lg text-rose-800 bg-white hover:bg-rose-50 shadow-sm transition"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      )}
    </div>
  );
}
