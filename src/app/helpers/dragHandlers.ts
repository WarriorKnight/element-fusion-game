import { DragEndEvent, UniqueIdentifier } from '@dnd-kit/core';
import { ElementData } from './../components/Toolbar';
import { PlacedElementData } from './../components/Canvas';

/**
 * Interface for the properties to calculate drop coordinates.
 *
 * @property active - The active draggable item from the DragEndEvent.
 * @property over - The droppable area (over element) from the DragEndEvent.
 * @property delta - The movement delta from the DragEndEvent.
 * @property activatorEvent - The original event (MouseEvent, TouchEvent, etc.) that initiated the drag.
 * @property defaultWidth - Optional default width of the draggable element.
 * @property defaultHeight - Optional default height of the draggable element.
 */
interface CalculateDropCoordinatesProps {
  active: DragEndEvent['active'];
  over: DragEndEvent['over'];
  delta: DragEndEvent['delta'];
  activatorEvent: Event | null;
  defaultWidth?: number;
  defaultHeight?: number;
}

/**
 * Calculates the (x, y) drop coordinates for a draggable element.
 *
 * This function computes the new position based on either the initial pointer event and delta,
 * or by using the active element's translated rectangle if the activator event is not available.
 *
 * @param props - The properties required for calculating drop coordinates.
 * @returns The x and y coordinates where the element should be dropped. Returns null if over.rect is unavailable.
 */
function calculateDropCoordinates({
  active,
  over,
  delta,
  activatorEvent,
  defaultWidth = 96,
  defaultHeight = 76,
}: CalculateDropCoordinatesProps): { x: number; y: number } | null {
  if (!over?.rect) return null; // Ensure we have the droppable area's rectangle.

  const canvasViewportRect = over.rect;
  let dropX = 0;
  let dropY = 0;

  if (activatorEvent) {
    // Get initial pointer positions from the activator event.
    let initialPointerClientX = 0;
    let initialPointerClientY = 0;

    if (activatorEvent instanceof MouseEvent) {
      initialPointerClientX = activatorEvent.clientX;
      initialPointerClientY = activatorEvent.clientY;
    } else if (activatorEvent instanceof TouchEvent && activatorEvent.touches.length > 0) {
      initialPointerClientX = activatorEvent.touches[0].clientX;
      initialPointerClientY = activatorEvent.touches[0].clientY;
    } else {
      // Fallback: if no pointer information is available,
      // use the active element's translated rectangle.
      const activeTranslatedRect = active.rect.current.translated;
      if (activeTranslatedRect) {
        dropX = activeTranslatedRect.left - canvasViewportRect.left;
        dropY = activeTranslatedRect.top - canvasViewportRect.top;
        const elementWidth = active.rect.current.initial?.width ?? defaultWidth;
        const elementHeight = active.rect.current.initial?.height ?? defaultHeight;
        dropX -= elementWidth / 2;
        dropY -= elementHeight / 2;
        return { x: Math.max(0, dropX), y: Math.max(0, dropY) };
      }
    }

    // Calculate final pointer positions by adding delta.
    const finalPointerClientX = initialPointerClientX + delta.x;
    const finalPointerClientY = initialPointerClientY + delta.y;

    // Convert the final pointer position relative to the canvas.
    dropX = finalPointerClientX - canvasViewportRect.left;
    dropY = finalPointerClientY - canvasViewportRect.top;

    const elementWidth = active.rect.current.initial?.width ?? defaultWidth;
    const elementHeight = active.rect.current.initial?.height ?? defaultHeight;
    dropX -= elementWidth / 2;
    dropY -= elementHeight / 2;

  } else {
    // Fallback if no activator event is available.
    const activeTranslatedRect = active.rect.current.translated;
    if (activeTranslatedRect) {
      dropX = activeTranslatedRect.left - canvasViewportRect.left;
      dropY = activeTranslatedRect.top - canvasViewportRect.top;
    } else {
      dropX = canvasViewportRect.width / 2 - (active.rect.current.initial?.width ?? defaultWidth) / 2;
      dropY = canvasViewportRect.height / 2 - (active.rect.current.initial?.height ?? defaultHeight) / 2;
    }
  }
  // Ensure coordinates are not negative.
  return { x: Math.max(0, dropX), y: Math.max(0, dropY) };
}

/**
 * Interface for the parameters of handleDragEndLogic.
 *
 * @property event - The DragEndEvent triggered when drag stops.
 * @property setActiveId - Function to clear or update the active id state.
 * @property setActiveElementData - Function to clear or update the active element data state.
 * @property setPlacedElements - Function to update the state for placed elements on the canvas.
 */
interface HandleDragEndParams {
  event: DragEndEvent;
  setActiveId: React.Dispatch<React.SetStateAction<UniqueIdentifier | null>>;
  setActiveElementData: React.Dispatch<React.SetStateAction<ElementData | null>>;
  setPlacedElements: React.Dispatch<React.SetStateAction<PlacedElementData[]>>;
}

/**
 * Handles the logic for drag end events.
 *
 * This function resets active state, determines whether a dragged element is dropped on the canvas or toolbar,
 * calculates its final coordinates if needed, and updates the placed elements accordingly.
 *
 * @param params - The parameters for handling the drag end event.
 */
export async function handleDragEndLogic({
  event,
  setActiveId,
  setActiveElementData,
  setPlacedElements,
}: HandleDragEndParams): Promise<void> {
  const { active, over, delta } = event;
  // Clear active states once drag is complete.
  setActiveId(null);
  setActiveElementData(null);

  // If not over a droppable area, exit.
  if (!over) return;

  // Retrieve custom data from active and over elements.
  const activeData = active.data.current;
  const overData = over.data.current;

  // If item dropped on the toolbar and it's not a toolbar drag, remove the placed element.
  if (overData?.type === 'toolbar' && activeData?.type === 'element' && !active.id.toString().startsWith('toolbar-')) {
    setPlacedElements((prevElements) =>
      prevElements.filter((el) => el.instanceId !== active.id)
    );
    return;
  }

  // Handle dropping element onto the canvas.
  if (activeData?.elementData && overData?.type === 'canvas') {
    const element = activeData.elementData as ElementData;
    const isToolbarItem = active.id.toString().startsWith('toolbar-');

    if (isToolbarItem) {
      // Calculate drop coordinates if the element originates from the toolbar.
      const coordinates = calculateDropCoordinates({
        active,
        over,
        delta,
        activatorEvent: event.activatorEvent as Event | null,
      });

      if (coordinates) {
        // Create a new canvas element with a unique instanceId and computed coordinates.
        const newElement: PlacedElementData = {
          ...element,
          instanceId: `canvas-el-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          x: coordinates.x,
          y: coordinates.y,
        };
        setPlacedElements((prev) => [...prev, newElement]);
      }
    } else {
      // If dragging an already placed element, adjust its position based on the delta.
      setPlacedElements((prev) =>
        prev.map((el) =>
          el.instanceId === active.id
            ? { ...el, x: Math.max(0, el.x + delta.x), y: Math.max(0, el.y + delta.y) }
            : el
        )
      );
    }
  }
}