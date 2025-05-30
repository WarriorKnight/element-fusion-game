'use client';

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import Toolbar, { ElementData } from './components/Toolbar';
import Canvas, { PlacedElementData } from './components/Canvas';
import Element from './components/Element';
import "./style.css";


export default function DesignerPage() {
  const [placedElements, setPlacedElements] = useState<PlacedElementData[]>([]);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeElementData, setActiveElementData] = useState<ElementData | null>(null);
  const [toolbarElements, setToolbarElements] = useState<ElementData[]>([]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    const fetchToolbarElements = async () => {
      try {
        const response = await fetch('/api/element');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch elements: ${response.status}`);
        }
        const data = await response.json();
        setToolbarElements(data.elements || []);
      } catch (error) {
        console.error("Error fetching toolbar elements: ", error);
      }
    };
    fetchToolbarElements();
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    if (event.active.data.current?.elementData) {
      setActiveElementData(event.active.data.current.elementData as ElementData);
    }
  };


  async function handleDragEnd(event: DragEndEvent) {
    const { active, over, delta } = event;
    setActiveId(null);
    setActiveElementData(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (
      over.id !== active.id &&
      typeof over.id === 'string' &&
      over.id.startsWith('canvas-el-') &&
      typeof active.id === 'string' &&
      active.id.startsWith('canvas-el-') &&
      activeData?.type === 'element' &&
      overData?.type === 'element'
    ) {
      const elementA = placedElements.find((el) => el.instanceId === active.id);
      const elementB = placedElements.find((el) => el.instanceId === over.id);

      if (elementA && elementB) {
        handleCombineElements(elementA, elementB);
        return;
      } else {
        console.error(
          'Combine error: Draggable or droppable element data not found in placedElements state for an element-on-element drop.',
          { activeId: active.id, overId: over.id, elementA_found: !!elementA, elementB_found: !!elementB }
        );
        return;
      }
    }

    if (overData?.type === 'toolbar' && activeData?.type === 'element' && !active.id.toString().startsWith('toolbar-')) {
      setPlacedElements((prevElements) =>
        prevElements.filter((el) => el.instanceId !== active.id)
      );
      return;
    }

    if (activeData?.elementData && overData?.type === 'canvas') {
      const element = activeData.elementData as ElementData;
      const isToolbarItem = active.id.toString().startsWith('toolbar-');

      if (isToolbarItem) {
        const canvasViewportRect = over.rect;

        let dropX = 0;
        let dropY = 0;

        if (canvasViewportRect && event.activatorEvent) {
          let initialPointerClientX = 0;
          let initialPointerClientY = 0;

          if (event.activatorEvent instanceof MouseEvent) {
            initialPointerClientX = event.activatorEvent.clientX;
            initialPointerClientY = event.activatorEvent.clientY;
          } else if (event.activatorEvent instanceof TouchEvent && event.activatorEvent.touches.length > 0) {
            initialPointerClientX = event.activatorEvent.touches[0].clientX;
            initialPointerClientY = event.activatorEvent.touches[0].clientY;
          } else {
            const activeTranslatedRect = active.rect.current.translated;
            if (activeTranslatedRect) {
              dropX = activeTranslatedRect.left - canvasViewportRect.left;
              dropY = activeTranslatedRect.top - canvasViewportRect.top;
            }
          }

          const finalPointerClientX = initialPointerClientX + delta.x;
          const finalPointerClientY = initialPointerClientY + delta.y;

          dropX = finalPointerClientX - canvasViewportRect.left;
          dropY = finalPointerClientY - canvasViewportRect.top;

          const elementWidth = active.rect.current.initial?.width ?? 96;
          const elementHeight = active.rect.current.initial?.height ?? 76;
          dropX -= elementWidth / 2;
          dropY -= elementHeight / 2;

        } else if (canvasViewportRect) {
          const activeTranslatedRect = active.rect.current.translated;
          if (activeTranslatedRect) {
            dropX = activeTranslatedRect.left - canvasViewportRect.left;
            dropY = activeTranslatedRect.top - canvasViewportRect.top;
          } else {
            dropX = canvasViewportRect.width / 2 - (active.rect.current.initial?.width ?? 96) / 2;
            dropY = canvasViewportRect.height / 2 - (active.rect.current.initial?.height ?? 76) / 2;
          }
        }

        const newElement: PlacedElementData = {
          ...element,
          instanceId: `canvas-el-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          x: Math.max(0, dropX),
          y: Math.max(0, dropY),
        };
        setPlacedElements((prev) => [...prev, newElement]);
      } else {
        setPlacedElements((prev) =>
          prev.map((el) =>
            el.instanceId === active.id
              ? { ...el, x: Math.max(0, el.x + delta.x), y: Math.max(0, el.y + delta.y) }
              : el
          )
        );
      }
    }
  };

  function handleDropElement(newElement: PlacedElementData, parentIds?: string[]) {
  setPlacedElements(prevElements => {
    const filtered = parentIds ? prevElements.filter(el => !parentIds.includes(el.instanceId)) : prevElements;
    return [...filtered, newElement];
  });
  setToolbarElements(prevElements => {
    const exists = prevElements.find(el => el._id === newElement._id);
    if (!exists) {
      return [...prevElements, { _id: newElement._id, name: newElement.name, iconUrl: newElement.iconUrl }];
    }
    return prevElements;
  });
}

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-screen">
        <Toolbar elements={toolbarElements} />
        <div className="flex-grow p-4">
          <Canvas placedElements={placedElements} onDropElement={handleDropElement} />
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeId && activeElementData ? (
          <Element
            id={`${activeId}-overlay`}
            data={activeElementData}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}