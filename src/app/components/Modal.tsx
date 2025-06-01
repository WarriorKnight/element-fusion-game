'use client';

import React from 'react';

export interface UniversalModalProps {
  title: string;
  onClose: () => void;
  content: React.ReactNode;
  containerClassName?: string;
}

export default function UniversalModal({ title, onClose, content, containerClassName }: UniversalModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 backdrop-blur-sm bg-black/50" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div 
        className={`relative rounded-3xl shadow-xl max-w-5xl w-[95%] overflow-hidden z-50 border ${containerClassName || ''}`}
        style={{ background: "rgb(1, 8, 19)" }}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-300 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-auto">
          {content}
        </div>
      </div>
    </div>
  );
}