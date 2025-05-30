import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

export interface ElementDescription {
  name: string;
  description: string;
}

export async function generateElementDetails(
  openai: OpenAI,
  name1: string,
  name2: string,
  description1: string,
  description2: string
): Promise<ElementDescription> {
  const prompt = `
You are playing a game similar to Little Alchemy. You are given two elements, each with a name and a brief description.
Your task is to invent a new element by thoughtfully fusing these two. The new element should make logical sense based on the properties and
common associations of the input elements.

Element 1:
Name: "${name1}"
Description: "${description1}"

Element 2:
Name: "${name2}"
Description: "${description2}"

Invent a new element by combining Element 1 and Element 2. Consider their physical properties, symbolic meanings, and real-world or fantastical
combinations. The new element's name should be simple, concise, and commonly understood (one word). Do NOT blend parts of the input names.

Return your response as JSON with two keys: "name" (string) and "description" (string).
Example: {"name": "Mud", "description": "A thick, dark brown, wet, blocky blob or clumpy puddle."}
`;

  const gptResponseObject = await openai.responses.create({
    model: 'gpt-4.1-nano-2025-04-14',
    input: prompt,
  });

  if (!gptResponseObject || typeof gptResponseObject.output_text !== 'string') {
    console.error('Invalid response from OpenAI:', gptResponseObject);
    throw new Error('Failed to get valid content from OpenAI text generation.');
  }

  try {
    const parsedContent = JSON.parse(gptResponseObject.output_text);
    return parsedContent as ElementDescription;
  } catch (error) {
    console.error('Error parsing JSON from OpenAI response:', error);
    console.error('Response output_text:', gptResponseObject.output_text);
    throw new Error('OpenAI returned malformed JSON for the element details.');
  }
}


export async function generateImage(
  openai: OpenAI,
  name: string,
  description: string,
): Promise<string> {
  //return fs.readFile('./src/debug/base64.txt', 'utf-8');
  const imagePrompt = `A **highly detailed, symbolic 3D voxel icon** of ${name} (${description}). The icon is rendered with a **translucent, glossy frosted glass material**, clearly revealing its **pixelated structure** while maintaining a **smooth, shiny surface**. It features **sharp, defined blocky edges** and a **vibrant, dynamic color scheme**, including gradients where appropriate. Rendered with **subtle lighting and highlights** that emphasize the frosted finish, and a **strong, consistent glowing outline**. Presented on a **transparent background**. **No text** integrated into the icon design.`;

  const imageGenResponse = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: imagePrompt,
    tools: [
      {
        type: 'image_generation',
        background: 'transparent',
        quality: 'low',
      },
    ],
  });
  
  // Find the output that has the image generation result.
  const imageOutput = imageGenResponse.output.find(out => out.type === 'image_generation_call');
  if (!imageOutput || typeof imageOutput.result !== 'string') {
    console.error('Invalid image generation output:', imageGenResponse.output);
    throw new Error('Failed to retrieve image data from the image generation tool.');
  }
  return imageOutput.result;
}


export async function saveImageToFile(
  imageBase64: string,
  elementName: string
): Promise<string> {
  const sanitizedElementName = elementName.toLowerCase().replace(/\s+/g, '_');
  const imageName = `${sanitizedElementName}_${Date.now()}.png`;
  const imagesDir = path.join(process.cwd(), 'public', 'generated_images');
  const imagePath = path.join(imagesDir, imageName);

  await fs.mkdir(imagesDir, { recursive: true });
  await fs.writeFile(imagePath, Buffer.from(imageBase64, 'base64'));
  return `/generated_images/${imageName}`;
}