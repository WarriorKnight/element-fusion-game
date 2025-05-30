import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

interface ElementDescription {
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
const gptResponseObject = await openai.responses.create({
  model: 'gpt-4.1-nano-2025-04-14',
  input: `You are playing a game similar to Little Alchemy. You are given two elements, each with a name and a brief description. Your task is to invent a new element by thoughtfully fusing these two. The new element should make logical sense based on the properties and common associations of the input elements.

    Element 1:
    Name: "${name1}"
    Description: "${description1}"

    Element 2:
    Name: "${name2}"
    Description: "${description2}"

    Invent a new element by combining Element 1 and Element 2. Consider their physical properties, symbolic meanings, and common real-world or fantastical combinations. The new element's name should be a simple, concise, and commonly understood term, often one word. AVOID combining parts of the input element names (e.g., "Earth" + "Air" should NOT be "Aeriarth").

    Provide:
    1. A unique and fitting name for the new combined element.
    2. A short description for the new element, explaining its nature or properties.

    Return your response ONLY as a JSON object with two keys: "name" (string) and "description" (string).
    Example: {"name": "Dust", "description": "Tiny particles of earth carried by the wind."}
    Do not include any other text, explanations, or markdown formatting around the JSON object.`,
});

  if (!gptResponseObject || typeof gptResponseObject.output_text !== 'string') {
    console.error('OpenAI text generation response was missing output_text or it was not a string:', gptResponseObject);
    throw new Error('Failed to get valid content from OpenAI text generation step.');
  }

  try {
    const parsedContent = JSON.parse(gptResponseObject.output_text);
    return parsedContent as ElementDescription;
  } catch (parseError) {
    console.error('Failed to parse JSON from gptResponseObject.output_text:', parseError);
    console.error('The problematic output_text was:', gptResponseObject.output_text);
    throw new Error('OpenAI returned malformed JSON content for the element name and description.');
  }
}

export async function generateImageWithTool(
  openai: OpenAI,
  imageName: string,
  parentName1: string,
  parentName2: string,
): Promise<string> {
  return fs.readFile('./src/debug/base64.txt', 'utf-8')
  const imageGenToolResponse = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: imageName + ", that happend when combining" + parentName1 + " and " + parentName2 + "glossy 3d icon rendered in a pixelated style with a frosted glass material, giving it a translucent and slightly blurred appearance. The icon features sharp, defined edges and a vibrant color scheme, standing out against a transparent background for seamless integration into various designs. This detailed, high-quality 3D icon showcases a unique aesthetic, combining smooth, shiny surfaces with a retro pixelated look. This design achieves a unique blend of textures and styles. The 3D model shows a detailed design with subtle lighting and highlights that emphasize the glossy finish, contrasting with the pixelated surface to create a visually appealing frosted glass effect.",
    tools: [
      {
        type: 'image_generation',
        background: 'transparent',
        quality: 'low',
      },
    ],
  });
  
  const imageGenerationOutput = imageGenToolResponse.output
  .find(out => out.type === 'image_generation_call');
  
  if (!imageGenerationOutput || typeof imageGenerationOutput.result !== 'string') {
    console.error('Image generation tool call (gpt-4.1-mini) did not return valid image data:', imageGenToolResponse.output);
    throw new Error('Failed to retrieve image data from gpt-4.1-mini image generation tool.');
  }
  return imageGenerationOutput.result;
}

export async function saveImageToFile(
  imageBase64: string,
  elementName: string
): Promise<string> {
  const imageName = `${elementName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.png`;
  const imagesDir = path.join(process.cwd(), 'public', 'generated_images');
  const imagePath = path.join(imagesDir, imageName);

  await fs.mkdir(imagesDir, { recursive: true });
  await fs.writeFile(imagePath, Buffer.from(imageBase64, 'base64'));

  return `/generated_images/${imageName}`;
}