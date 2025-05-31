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
import { handleDragEndLogic } from './dragHandlers'; 


export default function DesignerPage() {
  const [placedElements, setPlacedElements] = useState<PlacedElementData[]>([]);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeElementData, setActiveElementData] = useState<ElementData | null>(null);
  const [toolbarElements, setToolbarElements] = useState<ElementData[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: { id: string, name: string, imgUrl?: string }[]; links: { source: string, target: string }[] } | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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
  
  const handleReset = async () => {
    try {
      setIsResetting(true);
      const response = await fetch('/api/element', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset progress');
      }
      
      setPlacedElements([]);
      
      const elementsResponse = await fetch('/api/element');
      if (elementsResponse.ok) {
        const elementsData = await elementsResponse.json();
        setToolbarElements(elementsData.elements || []);
      }
      await refreshGraphData();

      setShowResetConfirmation(false);
    } catch (error) {
      console.error("Error resetting progress:", error);
    } finally {
      setIsResetting(false);
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
        const elementsResponse = await fetch('/api/element');
        if (!elementsResponse.ok) {
          const errorData = await elementsResponse.json();
          throw new Error(errorData.message || `Failed to fetch elements: ${elementsResponse.status}`);
        }
        const elementsData = await elementsResponse.json();
        setToolbarElements(elementsData.elements || []);
        
        await refreshGraphData();
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    };
    
    fetchData();
  }, []);

  const toggleGraph = () => {
    setShowGraph(!showGraph);
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
    await handleDragEndLogic({
      event,
      setActiveId,
      setActiveElementData,
      setPlacedElements,
    });
  }

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
            
            <Toolbar elements={toolbarElements} />
            
            <div className="flex-1 p-4">
              <Canvas 
                placedElements={placedElements} 
                onDropElement={handleDropElement} 
              />
            </div>
          </div>
          
          {/* Reset Confirmation Modal */}
          {showResetConfirmation && (
            <div className="fixed inset-0 flex items-center justify-center z-[60]">
              {/* Modal Backdrop */}
              <div 
                className="fixed inset-0 backdrop-blur-sm bg-black/70" 
                onClick={() => setShowResetConfirmation(false)}
              ></div>
              
              {/* Modal Content */}
              <div className="relative rounded-lg shadow-xl w-full max-w-md p-6 z-[70] border border-red-500" 
                style={{ background: "rgb(1, 8, 19)" }}>
                <h2 className="text-xl font-semibold text-white mb-4">Reset Progress?</h2>
                <p className="text-gray-300 mb-6">
                  Are you sure you want to reset all progress? This will delete all discovered elements and combinations.
                  This action cannot be undone.
                </p>
                
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setShowResetConfirmation(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg transition-colors"
                    disabled={isResetting}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleReset}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Resetting...
                      </>
                    ) : (
                      'Reset All Data'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Graph Modal */}
          {showGraph && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              {/* Modal Backdrop */}
              <div 
                className="fixed inset-0 backdrop-blur-sm bg-black/50" 
                onClick={toggleGraph}
              ></div>
              
              {/* Modal Content */}
              <div className="relative rounded-3xl shadow-xl max-w-5xl w-[95%] h-[90%] max-h-[90vh] overflow-hidden z-50 border" style={{ background: "rgb(1, 8, 19)" }}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-white">Element Relationship Graph</h2>
                  <button 
                    onClick={toggleGraph}
                    className="text-gray-300 hover:text-white"
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
                      <p className="text-gray-400">Loading graph data...</p>
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
      </div>
    </div>
  );
}