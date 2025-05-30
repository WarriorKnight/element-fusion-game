import { connectToDB, Element, IElement } from '@/app/db/db'; // Assuming IElement is exported from db.ts

export async function getAllElements(): Promise<IElement[]> {
  await connectToDB();
  return Element.find({}).sort({ createdAt: -1 });
}

export async function getElementByName(name: string): Promise<IElement | null> {
  await connectToDB();
  return Element.findOne({ name });
}

export async function createElement(name: string, iconUrl: string): Promise<IElement> {
  await connectToDB();
  const newElement = new Element({
    name,
    iconUrl,
  });
  return newElement.save();
}

export async function deleteAllElements(): Promise<{ deletedCount?: number }> {
  await connectToDB();
  return Element.deleteMany({});
}