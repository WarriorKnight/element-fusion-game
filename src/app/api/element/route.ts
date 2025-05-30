import { NextResponse } from 'next/server';
import OpenAI from 'openai';

import { generateElementDetails, generateImageWithTool } from './elementHelper';
import { uploadImageToS3 } from '@/app/lib/s3Service';
import {
  getAllElements,
  getElementByName,
  createElement,
  deleteAllElements
} from '@/app/lib/elementService';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function helloWorldGET() {
  return NextResponse.json({ message: 'Hello, world!' }, { status: 200 });
}

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
    } else {
      const allElements = await getAllElements();
      const allowedElements = ["Water", "Fire", "Earth", "Air"];
      const filteredElements = allElements.filter(el => allowedElements.includes(el.name));
      return NextResponse.json({ elements: filteredElements }, { status: 200 });
    }
  } catch (error) {
    console.error('[ELEMENT_GET_ERROR]', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to fetch elements', error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { name1, name2 } = await request.json();
  if (!name1 || !name2) {
    return NextResponse.json({ message: 'Missing element details for combination.' }, { status: 400 });
  }

  const element1 = await getElementByName(name1);
  const element2 = await getElementByName(name2);

  console.log("Currently processing element combination:", { name1, name2 });

  if (element1 && element2) {
    const allElements = await getAllElements();
    for (const el of allElements) {
      console.log('combinedFrom:', el.combinedFrom);
      console.log('element1:', element1._id.toString());
      console.log('element2:', element2._id.toString());
      if (el.combinedFrom && Array.isArray(el.combinedFrom)) {
        const parentIds = [element1._id.toString(), element2._id.toString()].sort();
        const elParentIds = el.combinedFrom.map(id => id.toString()).sort();
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

 //  const mockElement = {
 //  name: "New Element", // Use combinedName as the new element's name
 //  iconUrl: 'https://fusiongame.s3.eu-north-1.amazonaws.com/elements/Hot_Steam-e38776be-4303-486d-bf09-fcc242444704.png',
 //  createdAt: new Date().toISOString(),
 //  updatedAt: new Date().toISOString(),
 //  _id: 'mocked_id'
 //};
 //return NextResponse.json({
 //  message: 'Mock element created successfully',
 //  element: mockElement,
 //}, { status: 201 });

  console.log(`No existing element found for combination of "${name1}" and "${name2}". Proceeding to create a new element.`);
  try {
    const { name: newElementName, description: newElementDescription } = await generateElementDetails(openai, name1, name2, element1.description, element2.description);

     const existingElement = await getElementByName(newElementName);

     if (existingElement) {
       console.log(`Element "${newElementName}" already exists. Returning existing element.`);
       return NextResponse.json({
         message: 'Element already exists',
         element: existingElement,
       }, { status: 200 });
     }

    const imageBase64 = await generateImageWithTool(openai, newElementName, name1, name2);
    if (!imageBase64) {
      return NextResponse.json({ message: 'Failed to generate image.' }, { status: 500 });
    }

    const imageUrl = await uploadImageToS3(imageBase64, newElementName);
    if (!imageUrl) {
      return NextResponse.json({ message: 'Failed to upload image to S3.' }, { status: 500 });
    }
    const newElement = await createElement(newElementName, imageUrl, newElementDescription, [element1._id, element2._id]);
    console.log(`Created new element "${newElement.name}" with ID "${newElement._id}".`);
    return NextResponse.json({
      message: 'Element created successfully',
      element: newElement,
    }, { status: 201 });

  } catch (error: any) {
    console.error('[ELEMENT_POST_ERROR]', error);
    if (error.code === 11000) {
        return NextResponse.json({
            message: `Element with name '${error.keyValue?.name || 'unknown'}' already exists.`,
            error: error.message
        }, { status: 409 });
    }
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to create element.', error: errorMessage }, { status: 500 });
  }


}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const confirmDelete = url.searchParams.get("confirm");

  const isProduction = process.env.NODE_ENV === 'production';
  const devConfirm = !isProduction && confirmDelete === 'yes';
  const prodConfirm = isProduction && confirmDelete === 'ERASE_ALL_MY_DATA_REALLY';

  if (!devConfirm && !prodConfirm) {
    const message = isProduction
      ? 'Deletion in production requires specific confirmation (ERASE_ALL_MY_DATA_REALLY).'
      : 'To delete all elements in development, add ?confirm=yes to the URL.';
    const status = isProduction ? 403 : 400;
    return NextResponse.json({ message }, { status });
  }

  try {
    const deletionResult = await deleteAllElements();
    console.log(`Deleted ${deletionResult.deletedCount || 0} elements.`);

    const defaultElementsData = [
      { name: 'Fire', iconUrl: 'https://fusiongame.s3.eu-north-1.amazonaws.com/elements/fire.png', description: 'A blazing element that brings warmth and light.' },
      { name: 'Water', iconUrl: 'https://fusiongame.s3.eu-north-1.amazonaws.com/elements/water.png', description: 'A fluid element that quenches thirst and nourishes life.' },
      { name: 'Earth', iconUrl: 'https://fusiongame.s3.eu-north-1.amazonaws.com/elements/earth.png', description: 'A solid element that provides stability and strength.' },
      { name: 'Air', iconUrl: 'https://fusiongame.s3.eu-north-1.amazonaws.com/elements/wind.png', description: 'An invisible element that carries scents and sounds.' },
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