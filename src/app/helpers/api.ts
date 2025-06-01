'use client';

export interface ElementResponse {
  elements: { _id: string; name: string; iconUrl: string }[];
}

export interface GraphData {
  nodes: { id: string; name: string; imgUrl?: string }[];
  links: { source: string; target: string }[];
}

export async function fetchGraphData(): Promise<GraphData> {
  const response = await fetch('/api/graph');
  if (!response.ok) {
    throw new Error('Failed to fetch graph data');
  }
  return await response.json();
}

export async function fetchElements(): Promise<ElementResponse> {
  const response = await fetch('/api/element');
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Failed to fetch elements: ${response.status}`);
  }
  return await response.json();
}

export async function resetProgress(): Promise<ElementResponse> {
  const response = await fetch('/api/element', { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('Failed to reset progress');
  }
  // After deletion, refetch the elements
  return await fetchElements();
}