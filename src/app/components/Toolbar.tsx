'use client';

import { useDroppable } from '@dnd-kit/core';
import Element from './Element';

export interface ElementData {
  _id: string;
  name: string;
  iconUrl: string;
}

interface ToolbarProps {
  elements: ElementData[];
}

export default function Toolbar({ elements }: ToolbarProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'toolbar-droppable-area',
    data: {
      type: 'toolbar',
      accepts: ['element'],
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-3xl flex flex-wrap m-5 p-2.5 border border-gray-300 gap-2.5 items-center min-h-[76px]
         transition-colors duration-200
         ${isOver ? 'border-red-400' : ''}`}
    >
      {elements.length > 0 ? (
        elements.map((el, idx) => (
          <div key={`${el._id}-${idx}`} className="flex-1 min-w-[50px]">
            <Element id={`toolbar-${el._id}`} data={el} />
          </div>
        ))
      ) : (
        !isOver && <p className="text-gray-500">No elements found.</p>
      )}
    </div>
  );
}