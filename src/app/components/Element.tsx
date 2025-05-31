'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ElementData } from './Toolbar';
import Image from 'next/image';
export interface DraggableElementProps {
  id: string;
  data: ElementData;
  isOverlay?: boolean;
  style?: React.CSSProperties;
}

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