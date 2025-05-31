'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import Element from './Element';
import { ElementData } from './Toolbar';

/**
 * Interface extending ElementData to include properties for an element
 * that is placed on the canvas.
 */
export interface PlacedElementData extends ElementData {
  instanceId: string;
  x: number;
  y: number;
}

/**
 * Props for the Canvas component.
 * - placedElements: An array of elements currently placed on the canvas.
 * - onDropElement: A callback function invoked when a new element (e.g., a fused element)
 *   is dropped onto the canvas.
 */
interface CanvasProps {
  placedElements: PlacedElementData[];
  onDropElement: (element: PlacedElementData, parentIds?: string[]) => void;
}

/**
 * LoadingText component displays animated loading text.
 *
 * The text cycles through the sequence "Loading.", "Loading..", and "Loading..."
 * every 500 milliseconds.
 *
 * @returns {JSX.Element} The animated loading text.
 */
function LoadingText() {
  const [text, setText] = useState('Loading.');
  useEffect(() => {
    const interval = setInterval(() => {
      setText(prev => {
        switch (prev) {
          case 'Loading.': return 'Loading..';
          case 'Loading..': return 'Loading...';
          default: return 'Loading.';
        }
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return <div className="loader">{text}</div>;
}

/**
 * Canvas component renders the droppable area where elements are placed.
 *
 * It handles rendering of individual elements, detecting collisions between them,
 * and triggering an API call to combine overlapping elements.
 *
 * When two elements overlap, a POST request is sent to create a combined element.
 * If successful, the new element is added via the onDropElement callback.
 *
 * @param {CanvasProps} props - The props for the Canvas component.
 * @returns {JSX.Element} The rendered canvas with placed elements.
 */
export default function Canvas({ placedElements, onDropElement }: CanvasProps) {
  // Maintain a reference to the latest onDropElement callback.
  const onDropElementRef = useRef(onDropElement);
  useEffect(() => {
    onDropElementRef.current = onDropElement;
  }, [onDropElement]);

  // State flag for showing the loading indicator during combination.
  const [isLoading, setIsLoading] = useState(false);
  // Ref to prevent multiple combination triggers for the same collision event.
  const combinationTriggeredRef = useRef(false);

  // Set up the droppable area for the canvas using dnd-kit.
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-droppable-area',
    data: {
      type: 'canvas',
      accepts: ['element'],
    },
  });

  // Fixed dimensions for element boundaries used in collision detection.
  const elementWidth = 100, elementHeight = 100;

  /**
   * Calculate overlapping elements by iterating through the placedElements list.
   * If two elements' positions intersect based on their widths and heights, add their instanceIds to a Set.
   */
  const overlapSet = React.useMemo(() => {
    const set = new Set<string>();
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
          set.add(el1.instanceId);
          set.add(el2.instanceId);
        }
      }
    }
    return set;
  }, [placedElements]);

  // Effect to detect collisions and trigger element combination.
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
              // Invoke callback with the new combined element and parent IDs.
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
         ${isOver ? 'border-green-300' : 'border-gray-200'}`}
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
          className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 backdrop-blur-sm transition-opacity duration-300"
        >
          <LoadingText />
        </div>
      )}
    </div>
  );
}