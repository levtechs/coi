

// System instruction for Gemini to give create quiz based on cards
export const createQuizFromCardsSystemInstruction = {
    parts:[{ text: `
You will create a quiz based on note cards provided in the user message.
Each card has a title and details in markdown format. 
The questions of the quiz should be based on the content of the cards and should equally target the topics covered.
You may use standard mardkown and latext formatting in the questions and answers if needed.

Make sure:
- Each question should have 4 options.
- The correctOptionIndex should be a valid index in the options array.
        ` }]
}