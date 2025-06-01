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
import UniversalModal from './components/Modal';
import ResetModalContent from './components/ResetModalContent';
import "./style.css";
import { handleDragEndLogic } from './helpers/dragHandlers';
import { fetchGraphData, fetchElements, resetProgress, GraphData, ElementResponse } from './helpers/api';

function GraphModalContent({
  graphData,
}: {
  graphData: GraphData | null;
}) {
  return graphData ? (
    <div className="w-full h-full">
      <GraphComponent nodes={graphData.nodes} links={graphData.links} />
    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-400">Loading graph data...</p>
    </div>
  );
}

export default function DesignerPage() {
  const [placedElements, setPlacedElements] = useState<PlacedElementData[]>([]);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeElementData, setActiveElementData] = useState<ElementData | null>(null);
  const [toolbarElements, setToolbarElements] = useState<ElementData[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Data Fetching Functions
  const refreshGraph = async () => {
    try {
      const data = await fetchGraphData();
      setGraphData(data);
    } catch (error) {
      console.error("Error refreshing graph data:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const elementsData: ElementResponse = await fetchElements();
        setToolbarElements(elementsData.elements || []);
        await refreshGraph();
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  // Action Handlers
  const handleReset = async () => {
    try {
      setIsResetting(true);
      const elementsData: ElementResponse = await resetProgress();
      setPlacedElements([]);
      setToolbarElements(elementsData.elements || []);
      await refreshGraph();
      setShowResetConfirmation(false);
    } catch (error) {
      console.error("Error resetting progress:", error);
    } finally {
      setIsResetting(false);
    }
  };

  const toggleGraph = () => {
    setShowGraph(prev => !prev);
    if (!showGraph) refreshGraph();
  };

  // Drag Handlers
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 0, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    if (event.active.data.current?.elementData) {
      setActiveElementData(event.active.data.current.elementData as ElementData);
    }
  };

  async function handleDragEnd(event: DragEndEvent) {
    await handleDragEndLogic({
      event,
      setActiveId,
      setActiveElementData,
      setPlacedElements,
    });
  }

  function handleDropElement(newElement: PlacedElementData, parentIds?: string[]) {
    setPlacedElements(prev => {
      const filtered = parentIds ? prev.filter(el => !parentIds.includes(el.instanceId)) : prev;
      return [...filtered, newElement];
    });
    setToolbarElements(prev => {
      const exists = prev.find(el => el._id === newElement._id);
      if (!exists) return [...prev, { _id: newElement._id, name: newElement.name, iconUrl: newElement.iconUrl }];
      return prev;
    });
  }

  return (
    <div>
      <div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col h-screen">
            {/* Header */}
            <div className="bg-blue-600 p-2 text-white">
              <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-xl font-bold">Element Fusion Game</h1>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowResetConfirmation(true)}
                    className="px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg transition-colors"
                  >
                    Reset Progress
                  </button>
                  <button
                    onClick={toggleGraph}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                  >
                    {showGraph ? "Hide Graph" : "Show Graph"}
                  </button>
                </div>
              </div>
            </div>
            {/* Toolbar and Canvas */}
            <Toolbar elements={toolbarElements} />
            <div className="flex-1 p-4">
              <Canvas placedElements={placedElements} onDropElement={handleDropElement} />
            </div>
          </div>

          {/* Modals */}
          {showResetConfirmation && (
            <UniversalModal
              title="Reset Progress?"
              onClose={() => setShowResetConfirmation(false)}
              containerClassName="w-full max-w-md"
              content={
                <ResetModalContent
                  isResetting={isResetting}
                  onCancel={() => setShowResetConfirmation(false)}
                  onReset={handleReset}
                />
              }
            />
          )}
          {showGraph && (
            <UniversalModal
              title="Element Relationship Graph"
              onClose={toggleGraph}
              containerClassName="h-[90vh] max-h-[90vh]"
              content={<GraphModalContent graphData={graphData} />}
            />
          )}

          <DragOverlay dropAnimation={null}>
            {activeId && activeElementData && (
              <Element id={`${activeId}-overlay`} data={activeElementData} isOverlay />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}