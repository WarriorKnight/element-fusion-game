import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateElementDetails, generateImage } from './elementHelper';
import { uploadImageToS3 } from '@/app/lib/s3Service';
import {
  getAllElements,
  getElementByName,
  createElement,
  deleteAllElements
} from '@/app/lib/elementService';

/**
 * GET endpoint: If a "name" query parameter is provided, return that element.
 * Otherwise, return only allowed elements.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const elementName = url.searchParams.get("name");

    if (elementName) {
      const element = await getElementByName(elementName);
      if (!element) {
        return NextResponse.json({ message: 'Element not found' }, { status: 404 });
      }
      return NextResponse.json({ element }, { status: 200 });
    }

    const allElements = await getAllElements();
    const allowedElements = ["Water", "Fire", "Earth", "Air"];
    const filteredElements = allElements.filter(el => allowedElements.includes(el.name));
    return NextResponse.json({ elements: filteredElements }, { status: 200 });
  } catch (error) {
    console.error('[ELEMENT_GET_ERROR]', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to fetch elements', error: errorMessage }, { status: 500 });
  }
}

/**
 * POST endpoint: Attempts to combine two elements.
 * 
 * Steps:
 * 1. Validate input.
 * 2. Check if a combination of the given parent elements already exists.
 * 3. Use OpenAI to generate new element details and image.
 * 4. Upload image to S3 and create the new element with combinedFrom field.
 */
export async function POST(request: Request) {
  const { name1, name2 } = await request.json();

  if (!name1 || !name2) {
    return NextResponse.json({ message: 'Missing element details for combination.' }, { status: 400 });
  }

  // Initialize OpenAI inside the function where it's used
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY || '' // Provide fallback empty string
  });

  // Retrieve parent elements by name.
  const element1 = await getElementByName(name1) as { _id: { toString(): string }, name: string, description: string, combinedFrom?: string[] };
  const element2 = await getElementByName(name2) as { _id: { toString(): string }, name: string, description: string, combinedFrom?: string[] };

  //console.log("Processing element combination:", { name1, name2 });

  // Check if the combination already exists.
  if (element1 && element2) {
    const allElements = await getAllElements();
    for (const el of allElements) {
      if (el.combinedFrom && Array.isArray(el.combinedFrom)) {
        const parentIds = [element1._id.toString(), element2._id.toString()].sort();
        const elParentIds: string[] = (el.combinedFrom as (string | { toString(): string })[]).map(id => id.toString()).sort();
        if (JSON.stringify(elParentIds) === JSON.stringify(parentIds)) {
          console.log(`Element "${el.name}" already exists with parents "${element1.name}" and "${element2.name}".`);
          return NextResponse.json({
            message: 'Element already exists',
            element: el,
          }, { status: 200 });
        }
      }
    }
  }

  console.log(`No existing element for combination "${name1}" and "${name2}". Proceeding to create a new element.`);
  try {
    // Generate new element details with OpenAI.
    const { name: newElementName, description: newElementDescription } =
      await generateElementDetails(openai, name1, name2, element1.description, element2.description);

    // If the generated element already exists, return it.
    const existingElement = await getElementByName(newElementName);
    if (existingElement) {
      console.log(`Element "${newElementName}" already exists. Returning existing element.`);
      return NextResponse.json({
        message: 'Element already exists',
        element: existingElement,
      }, { status: 200 });
    }

    // Generate image for new element.
    const imageBase64 = await generateImage(openai, newElementName, newElementDescription);
    if (!imageBase64) {
      return NextResponse.json({ message: 'Failed to generate image.' }, { status: 500 });
    }

    // Upload image to S3.
    const imageUrl = await uploadImageToS3(imageBase64, newElementName);
    if (!imageUrl) {
      return NextResponse.json({ message: 'Failed to upload image to S3.' }, { status: 500 });
    }
    
    // Create new element with combinedFrom field.
    const newElement = await createElement(newElementName, imageUrl, newElementDescription, [
      element1._id.toString(),
      element2._id.toString(),
    ]);
    console.log(`Created new element "${newElement.name}" with ID "${newElement._id}".`);
    return NextResponse.json({
      message: 'Element created successfully',
      element: newElement,
    }, { status: 201 });

  } catch {
    console.error('[ELEMENT_POST_ERROR]');
    return NextResponse.json({ message: 'Failed to create element.' }, { status: 500 });
  }
}

/**
 * DELETE endpoint: Deletes all elements and resets the default ones.
 *
 * Requires a specific confirmation query parameter, which is stricter in production.
 */
export async function DELETE() {
  try {
    const deletionResult = await deleteAllElements();
    console.log(`Deleted ${deletionResult.deletedCount || 0} elements.`);

    // Reset default elements. 
    const defaultElementsData = [
      {
        name: 'Fire',
        iconUrl: 'https://fusiongame.s3.eu-north-1.amazonaws.com/elements/fire.png',
        description: 'A blazing element that brings warmth and light.'
      },
      {
        name: 'Water',
        iconUrl: 'https://fusiongame.s3.eu-north-1.amazonaws.com/elements/water.png',
        description: 'A fluid element that quenches thirst and nourishes life.'
      },
      {
        name: 'Earth',
        iconUrl: 'https://fusiongame.s3.eu-north-1.amazonaws.com/elements/earth.png',
        description: 'A solid element that provides stability and strength.'
      },
      {
        name: 'Air',
        iconUrl: 'https://fusiongame.s3.eu-north-1.amazonaws.com/elements/wind.png',
        description: 'An invisible element that carries scents and sounds.'
      },
    ];

    const createdDefaultElements = [];
    for (const elData of defaultElementsData) {
      try {
        const newDefaultElement = await createElement(elData.name, elData.iconUrl, elData.description, []);
        createdDefaultElements.push(newDefaultElement);
      } catch (createError) {
        console.error(`Failed to create default element "${elData.name}":`, createError);
      }
    }

    return NextResponse.json({
      message: 'All elements deleted and default elements have been added successfully.',
      deletedCount: deletionResult.deletedCount || 0,
      createdDefaultElementsCount: createdDefaultElements.length,
    }, { status: 200 });

  } catch (error) {
    console.error('[ELEMENT_DELETE_ALL_ERROR_OR_DEFAULT_SETUP]', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to process request.', error: errorMessage }, { status: 500 });
  }
}