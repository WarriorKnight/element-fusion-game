import { DragEndEvent, UniqueIdentifier } from '@dnd-kit/core';
import { ElementData } from './components/Toolbar';
import { PlacedElementData } from './components/Canvas';

interface CalculateDropCoordinatesProps {
  active: DragEndEvent['active'];
  over: DragEndEvent['over'];
  delta: DragEndEvent['delta'];
  activatorEvent: Event | null;
  defaultWidth?: number;
  defaultHeight?: number;
}

function calculateDropCoordinates({
  active,
  over,
  delta,
  activatorEvent,
  defaultWidth = 96,
  defaultHeight = 76,
}: CalculateDropCoordinatesProps): { x: number; y: number } | null {
  if (!over?.rect) return null;

  const canvasViewportRect = over.rect;
  let dropX = 0;
  let dropY = 0;

  if (activatorEvent) {
    let initialPointerClientX = 0;
    let initialPointerClientY = 0;

    if (activatorEvent instanceof MouseEvent) {
      initialPointerClientX = activatorEvent.clientX;
      initialPointerClientY = activatorEvent.clientY;
    } else if (activatorEvent instanceof TouchEvent && activatorEvent.touches.length > 0) {
      initialPointerClientX = activatorEvent.touches[0].clientX;
      initialPointerClientY = activatorEvent.touches[0].clientY;
    } else {
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

    const finalPointerClientX = initialPointerClientX + delta.x;
    const finalPointerClientY = initialPointerClientY + delta.y;

    dropX = finalPointerClientX - canvasViewportRect.left;
    dropY = finalPointerClientY - canvasViewportRect.top;

    const elementWidth = active.rect.current.initial?.width ?? defaultWidth;
    const elementHeight = active.rect.current.initial?.height ?? defaultHeight;
    dropX -= elementWidth / 2;
    dropY -= elementHeight / 2;

  } else {
    const activeTranslatedRect = active.rect.current.translated;
    if (activeTranslatedRect) {
      dropX = activeTranslatedRect.left - canvasViewportRect.left;
      dropY = activeTranslatedRect.top - canvasViewportRect.top;
    } else {
      dropX = canvasViewportRect.width / 2 - (active.rect.current.initial?.width ?? defaultWidth) / 2;
      dropY = canvasViewportRect.height / 2 - (active.rect.current.initial?.height ?? defaultHeight) / 2;
    }
  }
  return { x: Math.max(0, dropX), y: Math.max(0, dropY) };
}

interface HandleDragEndParams {
  event: DragEndEvent;
  setActiveId: React.Dispatch<React.SetStateAction<UniqueIdentifier | null>>;
  setActiveElementData: React.Dispatch<React.SetStateAction<ElementData | null>>;
  setPlacedElements: React.Dispatch<React.SetStateAction<PlacedElementData[]>>;
}

export async function handleDragEndLogic({
  event,
  setActiveId,
  setActiveElementData,
  setPlacedElements,
}: HandleDragEndParams): Promise<void> {
  const { active, over, delta } = event;
  setActiveId(null);
  setActiveElementData(null);

  if (!over) return;

  const activeData = active.data.current;
  const overData = over.data.current;

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
      const coordinates = calculateDropCoordinates({
        active,
        over,
        delta,
        activatorEvent: event.activatorEvent as Event | null,
      });

      if (coordinates) {
        const newElement: PlacedElementData = {
          ...element,
          instanceId: `canvas-el-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          x: coordinates.x,
          y: coordinates.y,
        };
        setPlacedElements((prev) => [...prev, newElement]);
      }
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
}