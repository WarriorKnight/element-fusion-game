import { NextResponse } from 'next/server';
import { connectToDB, Element } from '../../db/db';

export async function GET(request: Request) {
  await connectToDB();

  const elements = await Element.find({}).exec();

  const nodes = elements.map(el => ({
    id: el._id.toString(),
    name: el.name,
    imgUrl: el.iconUrl
  }));

  const links = elements
    .filter(el => el.combinedFrom && el.combinedFrom.length === 2)
    .flatMap(el =>
      el.combinedFrom!.map(parentId => ({
        source: parentId.toString(),
        target: el._id.toString(),
      }))
    );

  return NextResponse.json({ nodes, links });
}