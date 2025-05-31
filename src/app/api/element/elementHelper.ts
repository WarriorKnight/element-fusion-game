/**
 * This module provides helper functions for generating element details and images for the Element Fusion Game.
 * It leverages OpenAI models to generate a new element by fusing two given elements, and to create a symbolic 3D voxel icon image.
 */

import OpenAI from 'openai';

/**
 * Interface representing the description of an element.
 */
export interface ElementDescription {
  name: string;
  description: string;
}

/**
 * Generates details for a new element by fusing two existing elements.
 *
 * The function builds a prompt that describes a fusion process similar to Little Alchemy and sends the prompt
 * to an OpenAI model. The generated response (expected to be valid JSON) is parsed into an ElementDescription.
 *
 * @param openai - An instance of the OpenAI API client.
 * @param name1 - The name of the first element.
 * @param name2 - The name of the second element.
 * @param description1 - A brief description of the first element.
 * @param description2 - A brief description of the second element.
 * @returns A promise that resolves to an ElementDescription containing a new element's name and description.
 * @throws Will throw an error if the OpenAI response is invalid or if the response cannot be parsed as JSON.
 */
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
common associations of the input elements. Try to generate one of those categories. Earth resources, Human Inventions, Chemical Compounds, Celestial Phenomena, Mythical Elements, Technological Inventions 

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

/**
 * Generates a symbolic 3D voxel icon image for a given element.
 *
 * The function constructs an image prompt based on the element's name and description, then calls the OpenAI API
 * to generate an image using a dedicated image generation tool. The response is parsed to retrieve the generated image data.
 *
 * @param openai - An instance of the OpenAI API client.
 * @param name - The name of the element.
 * @param description - The element's description used to inspire the image.
 * @returns A promise that resolves to a string containing image data (e.g., a base64 encoded image).
 * @throws Will throw an error if the image generation output is invalid or if the image data cannot be retrieved.
 */
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
  
  const imageOutput = imageGenResponse.output.find(out => out.type === 'image_generation_call');
  if (!imageOutput || typeof imageOutput.result !== 'string') {
    console.error('Invalid image generation output:', imageGenResponse.output);
    throw new Error('Failed to retrieve image data from the image generation tool.');
  }
  return imageOutput.result;
}