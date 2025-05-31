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
    <div className={`relative m-5 p-1 rounded-3xl border shadow-sm transition-colors duration-200  ${isOver ? 'border-red-400' : 'border-gray-200 '}`}>
      <div
        ref={setNodeRef}
        className={`flex overflow-x-auto py-2 px-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
        min-h-[76px] items-center gap-2.5 transition-colors duration-200 rounded-3xl`}
      >
        {elements.length > 0 ? (
          elements.map((el, idx) => (
            <div key={`${el._id}-${idx}`} className="flex-none w-[70px]">
              <Element id={`toolbar-${el._id}`} data={el} />
            </div>
          ))
        ) : (
          !isOver && <p className="text-gray-500 px-2">No elements found.</p>
        )}
      </div>
    </div>
  );
}