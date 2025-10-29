import { NewCard, NewCourse, NewLesson, QuizSettings } from "@/lib/types";
import { llmModel, limitedGeneralConfig, genAI } from "@/app/api/gemini/config";
import { SchemaType, ObjectSchema } from "@google/generative-ai";
import {
    createLessonFromTextSystemInstruction,
    createLessonFromDescriptionSystemInstruction,
    createLessonDescriptionsFromTextSystemInstruction,
    createLessonFromTextPrompt,
    createCourseStructurePrompt,
    createLessonContentPrompt
} from "./prompts";
import { createQuizFromCards, writeQuizToDb } from "../../quiz/helpers";

const fullLessonSchema: ObjectSchema = {
    type: SchemaType.OBJECT,
    properties: {
        title: { type: SchemaType.STRING },
        description: { type: SchemaType.STRING },
        content: { type: SchemaType.STRING },
        cards: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    title: { type: SchemaType.STRING },
                    details: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING }
                    }
                },
                required: ["title", "details"]
            }
        }
    },
    required: ["title", "description", "content", "cards"]
};

const courseStructureSchema: ObjectSchema = {
    type: SchemaType.OBJECT,
    properties: {
        courseTitle: { type: SchemaType.STRING },
        courseDescription: { type: SchemaType.STRING },
        lessons: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    title: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING }
                },
                required: ["title", "description"]
            }
        }
    },
    required: ["courseTitle", "courseDescription", "lessons"]
};

const lessonContentSchema: ObjectSchema = {
    type: SchemaType.OBJECT,
    properties: {
        content: { type: SchemaType.STRING },
        cards: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    title: { type: SchemaType.STRING },
                    details: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING }
                    }
                },
                required: ["title", "details"]
            }
        }
    },
    required: ["content", "cards"]
};

export const createCourseFromText = async (text: string, enqueue?: (data: string) => void, lessonQuizSettings?: QuizSettings): Promise<NewCourse> => {
    enqueue?.(JSON.stringify({ type: "status", message: "Analyzing input text and creating course structure..." }));

    const prompt = createCourseStructurePrompt(text);

    try {
        const requestBody = {
            model: llmModel,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            systemInstruction: { role: "system", parts: createLessonDescriptionsFromTextSystemInstruction.parts },
            generationConfig: {
                ...limitedGeneralConfig,
                responseMimeType: "application/json",
                responseSchema: courseStructureSchema,
            },
        };

        let jsonString: string;
        try {
            const result = await genAI.models.generateContent(requestBody);
            jsonString = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch (err) {
            const error = err as { status?: number };
            if (error.status === 503) {
                const streamingResp = await genAI.models.generateContentStream(requestBody);
                let accumulated = "";
                for await (const chunk of streamingResp) {
                    const partText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    accumulated += partText;
                }
                jsonString = accumulated;
            } else {
                throw err;
            }
        }
        if (!jsonString || jsonString.trim() === "") {
            throw new Error("Empty response from Gemini API for course structure");
        }
        let courseStructure;
        try {
            courseStructure = JSON.parse(jsonString) as {
                courseTitle: string;
                courseDescription: string;
                lessons: {
                    title: string;
                    description: string;
                }[];
            };
        } catch (parseErr) {
            console.error("createCourseFromText: Failed to parse course structure JSON:", parseErr);
            console.error("createCourseFromText: Raw JSON string:", jsonString);
            throw new Error("Invalid JSON response from Gemini for course structure");
        }

        const lessons: NewLesson[] = [];
        enqueue?.(JSON.stringify({ type: "status", message: `Course outline created with ${courseStructure.lessons.length} lessons. Generating detailed content for each lesson...` }));

        for (let i = 0; i < courseStructure.lessons.length; i++) {
            const desc = courseStructure.lessons[i];
            enqueue?.(JSON.stringify({ type: "lesson_start", lessonNumber: i + 1, lessonTitle: desc.title }));

            let lesson: NewLesson | null = null;
            let retryCount = 0;
            const maxRetries = 3;

            while (!lesson && retryCount < maxRetries) {
                try {
                    const lessonPrompt = createLessonContentPrompt({
                        title: desc.title,
                        description: desc.description,
                        originalText: text,
                        courseOutline: courseStructure.lessons,
                        previousLesson: i > 0 ? { content: lessons[i-1].content, cards: lessons[i-1].cardsToUnlock.map(c => ({ title: c.title, details: c.details || [] })) } : undefined
                    });

                    const lessonRequestBody = {
                        model: llmModel,
                        contents: [{ role: "user", parts: [{ text: lessonPrompt }] }],
                        systemInstruction: { role: "system", parts: createLessonFromDescriptionSystemInstruction.parts },
                        generationConfig: {
                            ...limitedGeneralConfig,
                            responseMimeType: "application/json",
                            responseSchema: lessonContentSchema,
                        },
                    };

                    let lessonJsonString: string;
                    try {
                        const result = await genAI.models.generateContent(lessonRequestBody);
                        lessonJsonString = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    } catch (err) {
                        const error = err as { status?: number };
                        if (error.status === 503) {
                            const streamingResp = await genAI.models.generateContentStream(lessonRequestBody);
                            let accumulated = "";
                            for await (const chunk of streamingResp) {
                                const partText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                                accumulated += partText;
                            }
                            lessonJsonString = accumulated;
                        } else {
                            throw err;
                        }
                    }
                    if (!lessonJsonString || lessonJsonString.trim() === "") {
                        throw new Error("Empty response from Gemini API for lesson content");
                    }
                    let lessonData;
                    try {
                        lessonData = JSON.parse(lessonJsonString) as {
                            content: string;
                            cards: {
                                title: string;
                                details: string[];
                            }[];
                        };
                    } catch (parseErr) {
                        console.error("createCourseFromText: Failed to parse lesson content JSON:", parseErr);
                        console.error("createCourseFromText: Raw lesson JSON string:", lessonJsonString);
                        throw new Error("Invalid JSON response from Gemini for lesson content");
                    }

                    const cards: NewCard[] = lessonData.cards.map((card) => ({
                        title: card.title,
                        details: card.details,
                    }));

                    lesson = {
                        index: i,
                        title: desc.title,
                        description: desc.description,
                        content: lessonData.content,
                        cardsToUnlock: cards,
                        quizIds: []
                    };

                    // Generate quiz for lesson if lessonQuizSettings provided
                    if (lessonQuizSettings) {
                        enqueue?.(JSON.stringify({ type: "status", message: `Generating quiz for lesson ${i + 1}...` }));
                        const quizJson = await createQuizFromCards(cards, lessonQuizSettings);
                        if (quizJson) {
                            const quizId = await writeQuizToDb(quizJson);
                            lesson.quizIds = [quizId];
                        }
                    }
                } catch (error) {
                    retryCount++;
                    console.error(`Lesson ${i + 1} generation failed (attempt ${retryCount}/${maxRetries}):`, error);
                    if (retryCount >= maxRetries) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        throw new Error(`Failed to generate lesson ${i + 1} after ${maxRetries} attempts: ${errorMessage}`);
                    }
                    // Wait a bit before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            if (!lesson) {
                throw new Error(`Failed to generate lesson ${i + 1}`);
            }

            lessons.push(lesson);
            enqueue?.(JSON.stringify({ type: "lesson_complete", lessonNumber: i + 1, lesson, cardCount: lesson.cardsToUnlock.length }));
        }

        const result = {
            title: courseStructure.courseTitle,
            description: courseStructure.courseDescription,
            lessons,
            public: false,
            sharedWith: []
        };
        enqueue?.(JSON.stringify({ type: "complete", course: result }));
        return result;
    } catch (error) {
        console.error("Error creating course from text:", error);
        throw error;
    }
};

export const createLessonFromText = async (text: string): Promise<NewLesson> => {
    const prompt = createLessonFromTextPrompt(text);

    try {
        const requestBody = {
            model: llmModel,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            systemInstruction: { role: "system", parts: createLessonFromTextSystemInstruction.parts },
            generationConfig: {
                ...limitedGeneralConfig,
                responseMimeType: "application/json",
                responseSchema: fullLessonSchema,
            },
        };

        let jsonString: string;
        try {
            const result = await genAI.models.generateContent(requestBody);
            jsonString = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch (err) {
            const error = err as { status?: number };
            if (error.status === 503) {
                const streamingResp = await genAI.models.generateContentStream(requestBody);
                let accumulated = "";
                for await (const chunk of streamingResp) {
                    const partText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    accumulated += partText;
                }
                jsonString = accumulated;
            } else {
                throw err;
            }
        }
        if (!jsonString || jsonString.trim() === "") {
            throw new Error("Empty response from Gemini API for lesson content");
        }
        let lessonData;
        try {
            lessonData = JSON.parse(jsonString) as {
                title: string;
                description: string;
                content: string;
                cards: {
                    title: string;
                    details: string[];
                }[];
            };
        } catch (parseErr) {
            console.error("createLessonFromText: Failed to parse lesson JSON:", parseErr);
            console.error("createLessonFromText: Raw JSON string:", jsonString);
            throw new Error("Invalid JSON response from Gemini for lesson");
        }

        const cards: NewCard[] = lessonData.cards.map((card) => ({
            title: card.title,
            details: card.details,
        }));

        return {
            index: 0,
            title: lessonData.title,
            description: lessonData.description,
            content: lessonData.content,
            cardsToUnlock: cards,
            quizIds: []
        };
    } catch (error) {
        console.error("Error creating lesson from text:", error);
        throw error;
    }
};
