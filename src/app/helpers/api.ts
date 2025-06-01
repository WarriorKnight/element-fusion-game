'use client';

/**
 * Interface representing the API response for element data.
 */
export interface ElementResponse {
  /**
   * Array of element objects.
   */
  elements: { _id: string; name: string; iconUrl: string }[];
}

/**
 * Interface representing the graph data used for visualizing element relationships.
 */
export interface GraphData {
  /**
   * Array of node objects. Each node represents an element.
   */
  nodes: { id: string; name: string; imgUrl?: string }[];
  /**
   * Array of link objects that define relationships between nodes.
   */
  links: { source: string; target: string }[];
}

/**
 * Fetches the graph data from the API.
 *
 * @returns A promise that resolves to a GraphData object.
 * @throws An error if the API response is not okay.
 */
export async function fetchGraphData(): Promise<GraphData> {
  const response = await fetch('/api/graph');
  if (!response.ok) {
    throw new Error('Failed to fetch graph data');
  }
  return await response.json();
}

/**
 * Fetches the elements from the API.
 *
 * @returns A promise that resolves to an ElementResponse object.
 * @throws An error with an appropriate message if the API request fails.
 */
export async function fetchElements(): Promise<ElementResponse> {
  const response = await fetch('/api/element');
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Failed to fetch elements: ${response.status}`);
  }
  return await response.json();
}

/**
 * Resets the progress by deleting all element data and then refetches the elements.
 *
 * @returns A promise that resolves to an ElementResponse object with the updated elements.
 * @throws An error if the reset operation fails.
 */
export async function resetProgress(): Promise<ElementResponse> {
  const response = await fetch('/api/element', { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('Failed to reset progress');
  }
  return await fetchElements();
}