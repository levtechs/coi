import { NewCard, NewCourse, NewLesson, QuizSettings } from "@/lib/types";
import { genAI } from "@/app/api/gemini/config";
import { Type, Schema, Content } from "@google/genai";
import { MyConfig, MyGenerateContentParameters } from "../../gemini/types";
import {
    createLessonFromTextSystemInstruction,
    createLessonFromDescriptionSystemInstruction,
    createLessonDescriptionsFromTextSystemInstruction,
    createLessonFromTextPrompt,
    createCourseStructurePrompt,
    createLessonContentPrompt
} from "./prompts";
import { createQuizFromCards, writeQuizToDb } from "../../quiz/helpers";

const fullLessonSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING } as Schema,
        description: { type: Type.STRING } as Schema,
        content: { type: Type.STRING } as Schema,
        cards: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING } as Schema,
                    details: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING } as Schema
                    } as Schema
                },
                required: ["title", "details"]
            } as Schema
        } as Schema
    },
    required: ["title", "description", "content", "cards"]
} as Schema;

const courseStructureSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        courseTitle: { type: Type.STRING } as Schema,
        courseDescription: { type: Type.STRING } as Schema,
        lessons: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING } as Schema,
                    description: { type: Type.STRING } as Schema
                },
                required: ["title", "description"]
            } as Schema
        } as Schema
    },
    required: ["courseTitle", "courseDescription", "lessons"]
} as Schema;

const lessonContentSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        content: { type: Type.STRING } as Schema,
        cards: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING } as Schema,
                    details: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING } as Schema
                    } as Schema
                },
                required: ["title", "details"]
            } as Schema
        } as Schema
    },
    required: ["content", "cards"]
} as Schema;

export const createCourseFromText = async (text: string, enqueue?: (data: string) => void, lessonQuizSettings?: QuizSettings): Promise<NewCourse> => {
    enqueue?.(JSON.stringify({ type: "status", message: "Analyzing input text and creating course structure..." }));

    const prompt = createCourseStructurePrompt(text);

    try {
        const model = "gemini-2.5-flash-lite";
        const config: MyConfig = {
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: courseStructureSchema,
            },
        };

        const systemInstructionContent = { role: "user", parts: createLessonDescriptionsFromTextSystemInstruction.parts };
        const contents = [{ role: "user", parts: [{ text: prompt }] }];

        const allContents = [systemInstructionContent, ...contents];

        const params: MyGenerateContentParameters = {
            model,
            contents: allContents as Content[],
            config,
        };

        let jsonString: string;
        try {
            const result = await genAI.models.generateContent(params);
            jsonString = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch (err) {
            const error = err as { status?: number };
            if (error.status === 503) {
                const streamingResp = await genAI.models.generateContentStream(params);
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
        // Clean the response to extract JSON
        jsonString = jsonString.replace(/```json\s*/, '').replace(/\s*```$/, '').trim();
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

                    const systemInstructionContent = { role: "user", parts: createLessonFromDescriptionSystemInstruction.parts };
                    const contents = [{ role: "user", parts: [{ text: lessonPrompt }] }];

                    const allContents = [systemInstructionContent, ...contents];

                    const model = "gemini-2.5-flash-lite";
                    const config: MyConfig = {
                        generationConfig: {
                            responseMimeType: "application/json",
                            responseSchema: lessonContentSchema,
                        },
                    };

                    const lessonParams: MyGenerateContentParameters = {
                        model,
                        contents: allContents as Content[],
                        config,
                    };

                    let lessonJsonString: string;
                    try {
                        const result = await genAI.models.generateContent(lessonParams);
                        lessonJsonString = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    } catch (err) {
                        const error = err as { status?: number };
                        if (error.status === 503) {
                            // For overload (503), try streaming API
                            const streamingResp = await genAI.models.generateContentStream(lessonParams);
                            let accumulated = "";
                            for await (const chunk of streamingResp) {
                                const partText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                                accumulated += partText;
                            }
                            lessonJsonString = accumulated;
                        } else if (error.status === 429) {
                            // For quota exceeded (429), don't retry with streaming, just re-throw
                            // The lesson retry loop will handle it with longer delay
                            throw err;
            } else if (error.status === 429) {
                throw err;
            } else {
                throw err;
            }
                    }
                    if (!lessonJsonString || lessonJsonString.trim() === "") {
                        throw new Error("Empty response from Gemini API for lesson content");
                    }
                    // Clean the response to extract JSON
                    lessonJsonString = lessonJsonString.replace(/```json\s*/, '').replace(/\s*```$/, '').trim();
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
                    // Wait before retrying - longer delay for quota errors
                    const isQuotaError = error && typeof error === 'object' && 'status' in error && (error as { status?: number }).status === 429;
                    const retryDelay = isQuotaError ? 35000 : 1000; // 35 seconds for quota, 1 second for others
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
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
        const systemInstructionContent = { role: "user", parts: createLessonFromTextSystemInstruction.parts };
        const contents = [{ role: "user", parts: [{ text: prompt }] }];

        const allContents = [systemInstructionContent, ...contents];

        const model = "gemini-2.5-flash-lite";
        const config: MyConfig = {
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: courseStructureSchema,
            },
        };

        const params: MyGenerateContentParameters = {
            model,
            contents: allContents as Content[],
            config,
        };

        let jsonString: string;
        try {
            const result = await genAI.models.generateContent(params);
            jsonString = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch (err) {
            const error = err as { status?: number };
            if (error.status === 503) {
                const streamingResp = await genAI.models.generateContentStream(params);
                let accumulated = "";
                for await (const chunk of streamingResp) {
                    const partText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    accumulated += partText;
                }
                jsonString = accumulated;
            } else if (error.status === 429) {
                throw err;
            } else {
                throw err;
            }
        }
        if (!jsonString || jsonString.trim() === "") {
            throw new Error("Empty response from Gemini API for lesson content");
        }
        // Clean the response to extract JSON
        jsonString = jsonString.replace(/```json\s*/, '').replace(/\s*```$/, '').trim();
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
