'use client';

import React from 'react';

/**
 * Props for the ResetModalContent component.
 */
export interface ResetModalContentProps {
  /**
   * Indicates whether the reset process is currently in progress.
   */
  isResetting: boolean;
  /**
   * Callback function to execute when the cancel button is clicked.
   */
  onCancel: () => void;
  /**
   * Callback function to execute when the reset button is clicked.
   */
  onReset: () => void;
}

/**
 * ResetModalContent component.
 *
 * This component renders the content to be displayed inside a modal when the user wishes
 * to reset all progress. It includes a warning message and two buttons: one for cancelling
 * the reset action and another for performing the reset. While the reset operation is in progress,
 * the reset button displays an animated spinner.
 *
 * @param props - The ResetModalContentProps object containing the component's properties.
 * @returns The rendered ResetModalContent component.
 */
export default function ResetModalContent({ isResetting, onCancel, onReset }: ResetModalContentProps) {
  return (
    <>
      <p className="text-gray-300 mb-6">
        Are you sure you want to reset all progress? This will delete all discovered elements and combinations.
        This action cannot be undone.
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={isResetting}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onReset}
          disabled={isResetting}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
        >
          {isResetting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Resetting...
            </>
          ) : (
            'Reset All Data'
          )}
        </button>
      </div>
    </>
  );
}