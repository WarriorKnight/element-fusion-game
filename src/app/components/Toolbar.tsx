'use client';

import { useEffect, useState } from 'react';
import Element from './Element';
import { useDroppable } from '@dnd-kit/core';

export interface ElementData {
  _id: string;
  name: string;
  iconUrl: string;
}

export default function Toolbar() {
  const [elements, setElements] = useState<ElementData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: 'toolbar-droppable-area',
    data: {
      type: 'toolbar',
      accepts: ['element'],
    },
  });

  useEffect(() => {
    const fetchElements = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/element');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch elements: ${response.status}`);
        }
        const data = await response.json();
        setElements(data.elements || []);
      } catch (err: any) {
        console.error("Error fetching elements for toolbar:", err);
        setError(err.message || 'An unknown error occurred while fetching elements.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchElements();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-wrap p-2.5 border-b border-gray-300 gap-2.5 items-center min-h-[60px]">
        <p className="text-gray-500">Loading elements...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-wrap p-2.5 border-b border-gray-300 gap-2.5 items-center min-h-[60px]">
        <p className="text-red-600">Error loading elements: {error}</p>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`rounded-3xl flex flex-wrap m-5 p-2.5 border border-gray-300 gap-2.5 items-center min-h-[76px] 
         transition-colors duration-200
         ${isOver ? 'border-red-400' : ''}`}
    >
      {elements.length > 0 ? (
        elements.map((el, idx) => (
          <Element key={`${el._id}-${idx}`} id={`toolbar-${el._id}`} data={el} />
        ))
      ) : (

        !isOver && <p className="text-gray-500">No elements found.</p>
      )}
    </div>
  );
}