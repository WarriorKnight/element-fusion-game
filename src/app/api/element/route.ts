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
      return NextResponse.json({ elements: allElements }, { status: 200 });
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

  if (element1 && element2) {
    const allElements = await getAllElements();
    for (const el of allElements) {
      if (
        el.combinedFrom &&
        el.combinedFrom.includes(element1._id.toString()) &&
        el.combinedFrom.includes(element2._id.toString())
      ) {
        console.log(`Element "${el.name}" already exists with parents "${element1.name}" and "${element2.name}".`);
        return NextResponse.json({
          message: 'Element already exists',
          element: el,
        }, { status: 200 });
      }
    }
  }

  try {
    const { name: newElementName } = await generateElementDetails(openai, name1, name2);

    // let existingElement = await getElementByName(newElementName);

    // if (existingElement) {
    //   console.log(`Element "${newElementName}" already exists. Returning existing element.`);
    //   return NextResponse.json({
    //     message: 'Element already exists',
    //     element: existingElement,
    //   }, { status: 200 });
    // }

    const imageBase64 = await generateImageWithTool(openai, newElementName, name1, name2);
    if (!imageBase64) {
      return NextResponse.json({ message: 'Failed to generate image.' }, { status: 500 });
    }
    // const imageBase64 = await fs.readFile('./debug/base64.txt', 'utf-8');

    const imageUrl = await uploadImageToS3(imageBase64, newElementName);
    if (!imageUrl) {
      return NextResponse.json({ message: 'Failed to upload image to S3.' }, { status: 500 });
    }
    const newElement = await createElement(newElementName, imageUrl);
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

  const mockElement = {
    name: "New Element", // Use combinedName as the new element's name
    iconUrl: 'https://fusiongame.s3.eu-north-1.amazonaws.com/elements/Hot_Steam-e38776be-4303-486d-bf09-fcc242444704.png',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _id: 'mocked_id'
  };
  return NextResponse.json({
    message: 'Mock element created successfully',
    element: mockElement,
  }, { status: 201 });
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
      { name: 'Fire', iconUrl: 'https://fusiongame.s3.eu-north-1.amazonaws.com/elements/fire.png' },
      { name: 'Water', iconUrl: 'https://fusiongame.s3.eu-north-1.amazonaws.com/elements/water.png' },
      { name: 'Earth', iconUrl: 'https://fusiongame.s3.eu-north-1.amazonaws.com/elements/earth.png' },
      { name: 'Air', iconUrl: 'https://fusiongame.s3.eu-north-1.amazonaws.com/elements/wind.png' },
    ];

    const createdDefaultElements = [];

    for (const elData of defaultElementsData) {
      try {
        const newDefaultElement = await createElement(elData.name, elData.iconUrl);
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