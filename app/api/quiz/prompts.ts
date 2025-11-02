import { QuizSettings } from "@/lib/types";

export function gradeFRQsSystemInstruction() {
    return {
        parts: [
            {
                text: `
You are grading free response questions for a quiz. Multiple questions are provided in one message, separated by ---. For each question, evaluate the student's response based on the grading criteria.

An example answer is provided to guide what a good answer might look like, but responses do not need to match the example perfectly. The grading criteria are more important than matching the example.

Return an array of objects, one for each question in the order they appear.

Each object should have:
- feedback: A constructive explanation of the strengths and weaknesses of the response, explaining why it received the score.
- score: A number from 0 to 3 (can be fractional like 2.5).

Scoring guidelines:
- 0: No correct information or completely off-topic.
- 1: Some correct information but major errors or significant omissions.
- 2: Mostly correct with minor errors or small omissions.
- 3: Fully correct, meets all grading criteria perfectly.

Be fair and consistent. Base the score strictly on how well the response meets the grading criteria.
`,
            },
        ],
    };
}

export function createQuizFromCardsSystemInstruction(quizSettings: QuizSettings) {
    const { minNumQuestions, maxNumQuestions, includeMCQ, includeFRQ, quizStyle, length, difficulty, customPrompt } = quizSettings;

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
- Include a "exampleAnswer" field to give an example of an answer that would earn a perfect score, meeting all of the gradingCriteria
- Be directly based on the card content.`
        );
    }

    const typesSummary = (() => {
        if (includeMCQ && includeFRQ) return "The quiz may contain both MCQs and FRQs.";
        if (includeMCQ) return "The quiz should only contain MCQs.";
        if (includeFRQ) return "The quiz should only contain FRQs.";
        return "";
    })();

    const styleInstructions = (() => {
        switch (quizStyle) {
            case "practice":
                return "Focus on creating practice problems that help reinforce learning. Questions should be designed to build understanding and allow students to apply concepts in different ways.";
            case "knowledge_test":
                return "Create questions that test deep knowledge and understanding. Focus on comprehensive assessment of the material rather than simple recall.";
            case "mixed":
            default:
                return "Create a balanced mix of practice problems and knowledge-testing questions.";
        }
    })();

    const lengthInstructions = (() => {
        switch (length) {
            case "short":
                return "Keep the quiz brief with fewer questions. Focus on the most important concepts.";
            case "long":
                return "Make the quiz comprehensive, covering all aspects of the material in detail.";
            case "normal":
            default:
                return "Create a quiz of normal length that adequately covers the material.";
        }
    })();

    const difficultyInstructions = difficulty ? (() => {
        switch (difficulty) {
            case "easy":
                return "Make questions relatively straightforward and accessible.";
            case "hard":
                return "Create challenging questions that require deep understanding.";
            case "normal":
            default:
                return "Use normal difficulty appropriate for the material.";
        }
    })() : "";

    const customPromptInstructions = customPrompt ? `Additional instructions: ${customPrompt}` : "";

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

${styleInstructions}

${lengthInstructions}

${difficultyInstructions}

${customPromptInstructions}

Use standard Markdown or LaTeX formatting in questions and answers where appropriate.

Return only a valid JSON object with the following properties: title (string), description (string), questions (array of objects, each with type ("MCQ" or "FRQ"), question (string), content (object with options array and correctOptionIndex for MCQ, or gradingCriteria and exampleAnswer for FRQ)). Do not include any additional text, explanations, or formatting outside of the JSON.
`,
            },
        ],
    };
}
