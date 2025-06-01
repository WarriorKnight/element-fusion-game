'use client';

import React from 'react';

/**
 * Props for the Header component.
 */
interface HeaderProps {
  /**
   * Callback function to trigger when the "Reset Progress" button is clicked.
   */
  onResetConfirmation: () => void;
  /**
   * Callback function to trigger when the "Show/Hide Graph" button is clicked.
   */
  onToggleGraph: () => void;
  /**
   * Boolean indicating whether the graph is currently visible.
   */
  showGraph: boolean;
}

/**
 * Header component for the Element Fusion Game.
 *
 * This component displays the title of the game along with two control buttons:
 * one to trigger a reset confirmation and another to toggle the visibility of the relationship graph.
 *
 * @param props - The HeaderProps object.
 * @returns The rendered header section.
 */
export default function Header({ onResetConfirmation, onToggleGraph, showGraph }: HeaderProps) {
  return (
    <div className="bg-blue-600 p-2 text-white">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">Element Fusion Game</h1>
        <div className="flex gap-2">
          <button
            onClick={onResetConfirmation}
            className="px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg transition-colors"
          >
            Reset Progress
          </button>
          <button
            onClick={onToggleGraph}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
          >
            {showGraph ? "Hide Graph" : "Show Graph"}
          </button>
        </div>
      </div>
    </div>
  );
}