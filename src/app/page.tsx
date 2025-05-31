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
import GraphComponent from './components/Graph';
import "./style.css";

export default function DesignerPage() {
  const [placedElements, setPlacedElements] = useState<PlacedElementData[]>([]);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeElementData, setActiveElementData] = useState<ElementData | null>(null);
  const [toolbarElements, setToolbarElements] = useState<ElementData[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: { id: string, name: string, imgUrl?: string }[]; links: { source: string, target: string }[] } | null>(null);
  const [showGraph, setShowGraph] = useState(false);

  // Function to refresh graph data
  const refreshGraphData = async () => {
    try {
      const graphResponse = await fetch('/api/graph');
      if (!graphResponse.ok) {
        throw new Error('Failed to fetch graph data');
      }
      const data = await graphResponse.json();
      setGraphData(data);
    } catch (error) {
      console.error("Error refreshing graph data:", error);
    }
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 0, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch toolbar elements
        const elementsResponse = await fetch('/api/element');
        if (!elementsResponse.ok) {
          const errorData = await elementsResponse.json();
          throw new Error(errorData.message || `Failed to fetch elements: ${elementsResponse.status}`);
        }
        const elementsData = await elementsResponse.json();
        setToolbarElements(elementsData.elements || []);
        
        // Fetch graph data
        await refreshGraphData();
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    };
    
    fetchData();
  }, []);

  // Toggle graph modal
  const toggleGraph = () => {
    setShowGraph(!showGraph);
    // Refresh graph data when opening the modal
    if (!showGraph) {
      refreshGraphData();
    }
  };

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
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col h-screen">
          <div className="bg-blue-600 p-2 text-white">
            <div className="container mx-auto flex justify-between items-center">
              <h1 className="text-xl font-bold">Element Fusion Game</h1>
              <button 
                onClick={toggleGraph} 
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
              >
                {showGraph ? "Hide Graph" : "Show Graph"}
              </button>
            </div>
          </div>
          
          <Toolbar elements={toolbarElements} />
          
          <div className="flex-1 p-4">
            <Canvas 
              placedElements={placedElements} 
              onDropElement={handleDropElement} 
              refreshGraphData={refreshGraphData}
            />
          </div>
        </div>
        
        {/* Graph Modal */}
        {showGraph && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* Modal Backdrop */}
            <div 
              className="fixed inset-0 backdrop-blur-sm bg-black/50" 
              onClick={toggleGraph}
            ></div>
            
            {/* Modal Content */}
            <div className="relative rounded-lg shadow-xl max-w-5xl w-[95%] h-[90%] max-h-[90vh] overflow-hidden z-50 border" style={{ background: "rgb(1, 8, 19)" }}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Element Relationship Graph</h2>
              <button 
                onClick={toggleGraph}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
              </div>
              
              <div className="p-6 h-[calc(100%-4rem)] overflow-auto">
              {graphData ? (
                <div className="w-full h-full">
                <GraphComponent nodes={graphData.nodes} links={graphData.links} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Loading graph data...</p>
                </div>
              )}
              </div>
            </div>
          </div>
        )}
        
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
    </>
  );
}