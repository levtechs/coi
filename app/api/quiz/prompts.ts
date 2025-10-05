export function createQuizFromCardsSystemInstruction(quizSettings: QuizSettings) {
    const { minNumQuestions, maxNumQuestions, includeMCQ, includeFRQ } = quizSettings;

    // Build constraints text dynamically
    const numQuestionText = (() => {
        if (minNumQuestions && maxNumQuestions) {
            return `The quiz should contain between ${minNumQuestions} and ${maxNumQuestions} questions.`;
        } else if (minNumQuestions) {
            return `The quiz should contain at least ${minNumQuestions} questions.`;
        } else if (maxNumQuestions) {
            return `The quiz should contain no more than ${maxNumQuestions} questions.`;
        } else {
            return "";
        }
    })();

    const typeInstructions: string[] = [];

    if (includeMCQ) {
        typeInstructions.push(
`MCQs (Multiple Choice Questions) should:
- Have exactly 4 options.
- Use plain text options with no headers or labels.
- Include a valid "correctOptionIndex" (an integer 0–3).
- Be directly based on the card content.

Do not include headers (like "a)" or "1.") before answer options.

Correct example:
answer 1
answer 2
answer 3
answer 4

Incorrect example:
a) answer 1
b) answer 2
c) answer 3
d) answer 4`
        );
    }

    if (includeFRQ) {
        typeInstructions.push(
`FRQs (Free Response Questions) should:
- Be open-ended.
- Include a "gradingCriteria" field describing what a correct answer must demonstrate.
- Be directly based on the card content.`
        );
    }

    const typesSummary = (() => {
        if (includeMCQ && includeFRQ) return "The quiz may contain both MCQs and FRQs.";
        if (includeMCQ) return "The quiz should only contain MCQs.";
        if (includeFRQ) return "The quiz should only contain FRQs.";
        return "";
    })();

    return {
        parts: [
            {
                text: `
You will create a quiz based on note cards provided in the user message.
Each card has a title and details in markdown format.
The questions of the quiz should be based on the content of the cards and should equally target the topics covered.

${numQuestionText}

${typesSummary}

${typeInstructions.join("\n\n")}

Use standard Markdown or LaTeX formatting in questions and answers where appropriate.
`,
            },
        ],
    };
}
