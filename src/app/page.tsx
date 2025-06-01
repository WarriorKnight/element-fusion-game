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
import Header from './components/Header';
import Toolbar, { ElementData } from './components/Toolbar';
import Canvas, { PlacedElementData } from './components/Canvas';
import Element from './components/Element';
import GraphComponent from './components/Graph';
import UniversalModal from './components/Modal';
import ResetModalContent from './components/ResetModalContent';
import "./style.css";
import { handleDragEndLogic } from './helpers/dragHandlers';
import { fetchGraphData, fetchElements, resetProgress, GraphData, ElementResponse } from './helpers/api';

/**
 * GraphModalContent
 *
 * This function component conditionally renders the graph.
 * It shows the GraphComponent if graphData is available; otherwise, a loading message.
 *
 * @param {Object} props - Component properties.
 * @param {GraphData | null} props.graphData - The graph data to be rendered.
 * @returns {JSX.Element} The rendered graph modal content.
 */
function GraphModalContent({ graphData }: { graphData: GraphData | null; }) {
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

/**
 * DesignerPage component - the main component for the Element Fusion Game.
 * 
 * This component handles overall state, initialization, drag-and-drop interactions,
 * data fetching for elements and graph visualization, and renders UI including modals.
 * 
 * @returns {JSX.Element} The rendered DesignerPage component.
 */
export default function DesignerPage() {
  // ------------------------- State Hooks -------------------------
  // Stores the elements placed on the canvas.
  const [placedElements, setPlacedElements] = useState<PlacedElementData[]>([]);
  // Stores the currently active draggable ID.
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  // Stores the data for the currently active draggable element.
  const [activeElementData, setActiveElementData] = useState<ElementData | null>(null);
  // Stores the elements displayed in the toolbar.
  const [toolbarElements, setToolbarElements] = useState<ElementData[]>([]);
  // Stores the data for the relationship graph.
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  // Flag to control the visibility of the graph modal.
  const [showGraph, setShowGraph] = useState(false);
  // Flag to control the visibility of the reset confirmation modal.
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  // Flag indicating if the reset operation is currently in progress.
  const [isResetting, setIsResetting] = useState(false);

  // ------------------------- Data Fetching Functions -------------------------

  /**
   * refreshGraph - Fetches the latest graph data and updates the state.
   */
  const refreshGraph = async () => {
    try {
      const data = await fetchGraphData();
      setGraphData(data);
    } catch (error) {
      console.error("Error refreshing graph data:", error);
    }
  };

  /**
   * useEffect hook to fetch elements and graph data on component mount.
   */
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

  // ------------------------- Action Handlers -------------------------

  /**
   * handleReset - Handles the reset operation by clearing placed elements,
   * refreshing toolbar elements, and updating graph data.
   */
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

  /**
   * toggleGraph - Toggles the visibility of the graph modal.
   * If showing the graph, it also refreshes the graph data.
   */
  const toggleGraph = () => {
    setShowGraph(prev => !prev);
    if (!showGraph) refreshGraph();
  };

  // ------------------------- Drag Handlers -------------------------
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 0, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  /**
   * handleDragStart - Invoked when a drag operation starts.
   * Sets the currently active draggable element.
   *
   * @param {DragStartEvent} event - The drag start event.
   */
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    if (event.active.data.current?.elementData) {
      setActiveElementData(event.active.data.current.elementData as ElementData);
    }
  };

  /**
   * handleDragEnd - Invoked when a drag operation completes.
   * Processes the event using handleDragEndLogic to update state.
   *
   * @param {DragEndEvent} event - The drag end event.
   */
  async function handleDragEnd(event: DragEndEvent) {
    await handleDragEndLogic({
      event,
      setActiveId,
      setActiveElementData,
      setPlacedElements,
    });
  }

  /**
   * handleDropElement - Updates placedElements and toolbarElements when an element is dropped.
   *
   * @param {PlacedElementData} newElement - The element being dropped.
   * @param {string[]} [parentIds] - (Optional) Parent IDs to filter out from placedElements.
   */
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

  // ------------------------- Render -------------------------
  return (
    <div className="crt-container">
      <div className="crt-content">
        <div className="crt-rgb-shift"></div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col h-screen">
            {/*
              Header component is extracted into its own file.
              It receives callbacks for resetting progress and toggling graph visibility.
            */}
            <Header
              onResetConfirmation={() => setShowResetConfirmation(true)}
              onToggleGraph={toggleGraph}
              showGraph={showGraph}
            />
            {/*
              Toolbar displays available elements and Canvas handles element placement.
            */}
            <Toolbar elements={toolbarElements} />
            <div className="flex-1 p-4">
              <Canvas placedElements={placedElements} onDropElement={handleDropElement} />
            </div>
          </div>

          {/*
            Modal for reset confirmation.
            Triggered when showResetConfirmation is true.
          */}
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

          {/*
            Modal for displaying element relationship graph.
          */}
          {showGraph && (
            <UniversalModal
              title="Element Relationship Graph"
              onClose={toggleGraph}
              containerClassName="h-[90vh] max-h-[90vh]"
              content={<GraphModalContent graphData={graphData} />}
            />
          )}

          {/*
            Drag overlay renders the active draggable element during a drag operation.
          */}
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