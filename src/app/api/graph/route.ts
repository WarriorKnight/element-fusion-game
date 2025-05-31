/**
 * GET /api/graph
 * 
 * This API endpoint retrieves the element fusion game graph data.
 * 
 * Steps performed:
 * 1. Establish a connection to the database.
 * 2. Query all elements from the database.
 * 3. Map each element to a node containing its id, name, and image URL.
 * 4. Identify elements that have been created by fusing two elements (i.e., have a valid 'combinedFrom' array with two entries)
 *    and construct link objects representing the relationships between parent and fused element.
 * 5. Return the constructed graph data in JSON format, which includes nodes and links.
 *
 * @returns {NextResponse} A JSON response with the graph structure.
 */

import { NextResponse } from 'next/server';
import { connectToDB, Element } from '../../db/db';

export async function GET() {
  await connectToDB();

  const elements = await Element.find({}).exec();

  const nodes = elements.map(el => ({
    id: el._id.toString(),
    name: el.name,
    imgUrl: el.iconUrl
  }));

  interface Link {
    source: string;
    target: string;
  }

  const links: Link[] = elements
    .filter((el): el is typeof el & { combinedFrom: [unknown, unknown] } => Array.isArray(el.combinedFrom) && el.combinedFrom.length === 2)
    .flatMap(el =>
      el.combinedFrom!.map((parentId: unknown): Link => ({
        source: String(parentId),
        target: el._id.toString(),
      }))
    );

  return NextResponse.json({ nodes, links });
}