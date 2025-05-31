import { connectToDB, Element, IElement } from '@/app/db/db';

/**
 * Retrieves all elements from the database, sorted by creation date in descending order.
 *
 * @returns {Promise<IElement[]>} A promise that resolves to an array of elements.
 */
export async function getAllElements(): Promise<IElement[]> {
  await connectToDB();
  return Element.find({}).sort({ createdAt: -1 });
}

/**
 * Retrieves a single element from the database by its name.
 *
 * @param {string} name - The name of the element to retrieve.
 * @returns {Promise<IElement | null>} A promise that resolves to the element if found, or null otherwise.
 */
export async function getElementByName(name: string): Promise<IElement | null> {
  await connectToDB();
  return Element.findOne({ name });
}

/**
 * Creates a new element in the database.
 *
 * @param {string} name - The name of the new element.
 * @param {string} iconUrl - The URL of the element's icon image.
 * @param {string} description - A description of the new element.
 * @param {string[]} [combinedFrom=[]] - An optional array of element IDs representing the elements that were combined to create this element.
 * @returns {Promise<IElement>} A promise that resolves to the newly created element.
 */
export async function createElement(name: string, iconUrl: string, description: string, combinedFrom: string[] = []): Promise<IElement> {
  await connectToDB();
  const newElement = new Element({
    name,
    iconUrl,
    description,
    combinedFrom,
  });
  return newElement.save();
}

/**
 * Deletes all elements from the database.
 *
 * @returns {Promise<{ deletedCount?: number }>} A promise that resolves to an object containing the count of deleted elements.
 */
export async function deleteAllElements(): Promise<{ deletedCount?: number }> {
  await connectToDB();
  return Element.deleteMany({});
}