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