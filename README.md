# Element Fusion Game

## About the Project
This is a web application inspired by games like [Infinite Craft](https://neal.fun/infinite-craft/), where users combine basic elements to create new ones with the help of Artificial Intelligence.

## Project Goal
To create a Next.js application that allows users to combine elements and, using the OpenAI API, generate new elements.

## Functionality Checklist

### Core Requirements
- [x] Game starts with 4 basic elements (💧 Water, 🔥 Fire, 💨 Air, 🌍 Earth)
- [x] User can select two elements for combination
- [x] After selecting two elements, an API endpoint is called which communicates with OpenAI - *Implemented in `/api/element` (POST).*
- [x] OpenAI generates a new element (name + image) - *Implemented in `elementHelper.ts` using OpenAI for name/description and image generation.*
- [x] The new element is added to the list of available elements - *Handled by `handleDropElement` and state updates.*
- [x] History of discovered elements is visible to the user

## Expected Output
A functional web application that allows users to:
-  [x] Select and combine elements.
-  [x] Discover new elements using AI.
-  [x] Browse the history of discoveries (element graph).
-  [x] Restart the game (reset progress).