'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ElementData } from './Toolbar';
import Image from 'next/image';

/**
 * Props for the Element component.
 *
 * @property {string} id - Unique identifier for the draggable element.
 * @property {ElementData} data - The element data including name, iconUrl, and any other related properties.
 * @property {boolean} [isOverlay] - Optional flag to render the element as an overlay.
 * @property {React.CSSProperties} [style] - Optional custom styles for the element.
 */
export interface DraggableElementProps {
  id: string;
  data: ElementData;
  isOverlay?: boolean;
  style?: React.CSSProperties;
}

/**
 * Element component represents a draggable element within the Element Fusion Game.
 *
 * It uses the dnd-kit hook useDraggable to enable dragging functionality. The component
 * renders the element's icon using the Next.js Image component, with two layers for visual effects.
 * A title attribute is provided for accessibility, and the name is displayed below the image.
 *
 * @param {DraggableElementProps} props - Component props.
 * @returns {JSX.Element} The rendered draggable element.
 */
export default function Element({ id, data, isOverlay, style: customStyle }: DraggableElementProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
    data: {
      type: 'element',
      elementData: data,
      sourceId: id,
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging && !isOverlay ? 0.5 : 1,
    transition: 'opacity 0.2s ease-in-out',
    ...customStyle,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-2 rounded cursor-grab flex flex-col items-center w-24 text-sm`}
      title={data.name}
    >
      <div className="relative w-20 h-20 mb-1 flex items-center justify-center">
        <Image
          src={data.iconUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain duration-200 blur-[15px] opacity-60 hover:opacity-100 hover:blur-[20px]"
          style={{ zIndex: 0 }}
          width={1024}
          height={1024}
        />
        <Image
          src={data.iconUrl}
          alt={data.name}
          className="relative w-full h-full object-contain pointer-events-none"
          style={{ zIndex: 1 }}
          width={1024}
          height={1024}
        />
      </div>
      <span className="text-m text-center truncate w-full pointer-events-none">{data.name}</span>
    </div>
  );
}