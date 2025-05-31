'use client';

import { useDroppable } from '@dnd-kit/core';
import Element from './Element';

/**
 * ElementData interface represents the basic information of an element.
 *
 * @property {string} _id - Unique identifier for the element.
 * @property {string} name - Name of the element.
 * @property {string} iconUrl - URL to the element's icon image.
 */
export interface ElementData {
  _id: string;
  name: string;
  iconUrl: string;
}

/**
 * Props for the Toolbar component.
 *
 * @property {ElementData[]} elements - Array of elements to be displayed in the toolbar.
 */
interface ToolbarProps {
  elements: ElementData[];
}

/**
 * Toolbar component renders a droppable area containing element icons.
 *
 * This component uses the dnd-kit hook 'useDroppable' to enable dragging functionality.
 * It displays each element using the Element component and provides visual feedback for drop interactions.
 *
 * @param {ToolbarProps} props - The props of the Toolbar component.
 * @returns {JSX.Element} The rendered toolbar with draggable elements.
 */
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