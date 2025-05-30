'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import Element from './Element';
import { ElementData } from './Toolbar';

export interface PlacedElementData extends ElementData {
  instanceId: string;
  x: number;
  y: number;
}

interface CanvasProps {
  placedElements: PlacedElementData[];
  onDropElement: (element: PlacedElementData, parentIds?: string[]) => void;
}

export default function Canvas({ placedElements, onDropElement }: CanvasProps) {
  const onDropElementRef = useRef(onDropElement);
  useEffect(() => {
    onDropElementRef.current = onDropElement;
  }, [onDropElement]);

  const [isLoading, setIsLoading] = useState(false);
  const combinationTriggeredRef = useRef(false);

  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-droppable-area',
    data: {
      type: 'canvas',
      accepts: ['element'],
    },
  });

  const elementWidth = 100, elementHeight = 100;
  const overlapSet = new Set<string>();
  for (let i = 0; i < placedElements.length; i++) {
    const el1 = placedElements[i];
    for (let j = i + 1; j < placedElements.length; j++) {
      const el2 = placedElements[j];
      if (
        el1.x < el2.x + elementWidth &&
        el1.x + elementWidth > el2.x &&
        el1.y < el2.y + elementHeight &&
        el1.y + elementHeight > el2.y
      ) {
        overlapSet.add(el1.instanceId);
        overlapSet.add(el2.instanceId);
      }
    }
  }

  useEffect(() => {
    if (overlapSet.size > 0 && !combinationTriggeredRef.current) {
      const collided = placedElements.filter(el => overlapSet.has(el.instanceId));
      if (collided.length >= 2) {
        combinationTriggeredRef.current = true;
        const { x: x1, y: y1 } = collided[0];
        const { x: x2, y: y2 } = collided[1];
        (async () => {
          setIsLoading(true);
          try {
            const response = await fetch('/api/element', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name1: collided[0].name, name2: collided[1].name })
            });
            if (response.ok) {
              const data = await response.json();
              console.log('Combined element:', data.element);
              const combinedElement = {
                ...data.element,
                instanceId: `${data.element._id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                x: (x1 + x2) / 2,
                y: (y1 + y2) / 2
              };
              // Pass parent IDs (from collided elements instanceIds)
              onDropElementRef.current(combinedElement, [collided[0].instanceId, collided[1].instanceId]);
            }
          } catch (error) {
            console.error('Error combining elements:', error);
          } finally {
            setIsLoading(false);
          }
        })();
      }
    } else if (overlapSet.size === 0) {
      combinationTriggeredRef.current = false;
    }
  }, [placedElements, overlapSet]);

  return (
    <div
      ref={setNodeRef}
      className={`w-full h-full border rounded-4xl relative overflow-hidden transition-colors duration-200
         ${isOver ? 'border-green-300 bg-black' : 'border-gray-200'}`}
      style={{ position: 'relative' }}
    >
      {placedElements.map(el => (
        <Element
          key={el.instanceId}
          id={el.instanceId}
          data={{ _id: el._id, name: el.name, iconUrl: el.iconUrl }}
          style={{
            position: 'absolute',
            left: el.x,
            top: el.y,
            touchAction: 'none',
            ...(overlapSet.has(el.instanceId) && { border: 'opacity-25' })
          }} 
        />
      ))}
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50 z-10"
        >
          <div className="loader">Loading...</div>
        </div>
      )}
    </div>
  );
}