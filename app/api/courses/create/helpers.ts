import { Course, CourseLesson, NewCard, NewCourse, NewLesson } from "@/lib/types";
import { llmModel, limitedGeneralConfig } from "@/app/api/gemini/config";
import { SchemaType, ObjectSchema } from "@google/generative-ai";
import {
    createLessonFromTextSystemInstruction,
    createLessonFromDescriptionSystemInstruction,
    createLessonDescriptionsFromTextSystemInstruction,
    createLessonFromTextPrompt,
    createCourseStructurePrompt,
    createLessonContentPrompt
} from "./prompts";

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

export const createCourseFromText = async (text: string, enqueue?: (data: string) => void): Promise<NewCourse> => {
    console.log("createCourseFromText: Starting with text length:", text.length);
    const prompt = createCourseStructurePrompt(text);
    console.log("createCourseFromText: Generated prompt, length:", prompt.length);

    try {
        const requestBody = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            systemInstruction: { role: "system", parts: createLessonDescriptionsFromTextSystemInstruction.parts },
            generationConfig: {
                ...limitedGeneralConfig,
                responseMimeType: "application/json",
                responseSchema: courseStructureSchema,
            },
        };

        console.log("createCourseFromText: Calling Gemini for course structure");
        let jsonString: string;
        try {
            console.log("createCourseFromText: Trying non-streaming request");
            const result = await llmModel.generateContent(requestBody);
            jsonString = result?.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
            console.log("createCourseFromText: Non-streaming response received, length:", jsonString.length);
        } catch (err) {
            const error = err as { status?: number };
            console.log("createCourseFromText: Non-streaming failed with status:", error.status, "error:", err);
            if (error.status === 503) {
                console.log("createCourseFromText: Falling back to streaming");
                const streamingResp = await llmModel.generateContentStream(requestBody);
                let accumulated = "";
                for await (const chunk of streamingResp.stream) {
                    const partText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    accumulated += partText;
                    console.log("createCourseFromText: Accumulated chunk, total length:", accumulated.length);
                }
                jsonString = accumulated;
                console.log("createCourseFromText: Streaming response complete, length:", jsonString.length);
            } else {
                throw err;
            }
        }
        if (!jsonString || jsonString.trim() === "") {
            console.log("createCourseFromText: Empty response from Gemini");
            throw new Error("Empty response from Gemini API for course structure");
        }
        console.log("createCourseFromText: Parsing course structure JSON");
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
            console.log("createCourseFromText: Parsed course structure, lessons count:", courseStructure.lessons.length);
        } catch (parseErr) {
            console.error("createCourseFromText: Failed to parse course structure JSON:", parseErr);
            console.error("createCourseFromText: Raw JSON string:", jsonString);
            throw new Error("Invalid JSON response from Gemini for course structure");
        }

        const lessons: NewLesson[] = [];
        console.log("createCourseFromText: Starting lesson generation for", courseStructure.lessons.length, "lessons");
        for (let i = 0; i < courseStructure.lessons.length; i++) {
            console.log("createCourseFromText: Generating lesson", i + 1, ":", courseStructure.lessons[i].title);
            const desc = courseStructure.lessons[i];
            const lessonPrompt = createLessonContentPrompt({
                title: desc.title,
                description: desc.description,
                originalText: text,
                courseOutline: courseStructure.lessons,
                previousLesson: i > 0 ? { content: lessons[i-1].content, cards: lessons[i-1].cardsToUnlock.map(c => ({ title: c.title, details: c.details || [] })) } : undefined
            });
            console.log("createCourseFromText: Lesson prompt generated, length:", lessonPrompt.length);

            const lessonRequestBody = {
                contents: [{ role: "user", parts: [{ text: lessonPrompt }] }],
                systemInstruction: { role: "system", parts: createLessonFromDescriptionSystemInstruction.parts },
                generationConfig: {
                    ...limitedGeneralConfig,
                    responseMimeType: "application/json",
                    responseSchema: lessonContentSchema,
                },
            };

            console.log("createCourseFromText: Calling Gemini for lesson", i + 1, "content");
            let lessonJsonString: string;
            try {
                console.log("createCourseFromText: Trying non-streaming for lesson");
                const result = await llmModel.generateContent(lessonRequestBody);
                lessonJsonString = result?.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
                console.log("createCourseFromText: Lesson response received, length:", lessonJsonString.length);
            } catch (err) {
                const error = err as { status?: number };
                console.log("createCourseFromText: Non-streaming failed for lesson, status:", error.status);
                if (error.status === 503) {
                    console.log("createCourseFromText: Falling back to streaming for lesson");
                    const streamingResp = await llmModel.generateContentStream(lessonRequestBody);
                    let accumulated = "";
                    for await (const chunk of streamingResp.stream) {
                        const partText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        accumulated += partText;
                    }
                    lessonJsonString = accumulated;
                    console.log("createCourseFromText: Streaming lesson response complete, length:", lessonJsonString.length);
                } else {
                    throw err;
                }
            }
            if (!lessonJsonString || lessonJsonString.trim() === "") {
                console.log("createCourseFromText: Empty response for lesson", i + 1);
                throw new Error("Empty response from Gemini API for lesson content");
            }
            console.log("createCourseFromText: Parsing lesson JSON for lesson", i + 1);
            let lessonData;
            try {
                lessonData = JSON.parse(lessonJsonString) as {
                    content: string;
                    cards: {
                        title: string;
                        details: string[];
                    }[];
                };
                console.log("createCourseFromText: Parsed lesson", i + 1, "content length:", lessonData.content.length, "cards:", lessonData.cards.length);
            } catch (parseErr) {
                console.error("createCourseFromText: Failed to parse lesson content JSON:", parseErr);
                console.error("createCourseFromText: Raw lesson JSON string:", lessonJsonString);
                throw new Error("Invalid JSON response from Gemini for lesson content");
            }

            const cards: NewCard[] = lessonData.cards.map((card) => ({
                title: card.title,
                details: card.details,
            }));

            const lesson: NewLesson = {
                index: i,
                title: desc.title,
                description: desc.description,
                content: lessonData.content,
                cardsToUnlock: cards,
                quizIds: []
            };

            lessons.push(lesson);
            enqueue?.(JSON.stringify({ type: "lesson_complete", lessonNumber: i + 1, lesson }));
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
    console.log("createLessonFromText: Starting with text length:", text.length);
    const prompt = createLessonFromTextPrompt(text);
    console.log("createLessonFromText: Generated prompt, length:", prompt.length);

    try {
        const requestBody = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            systemInstruction: { role: "system", parts: createLessonFromTextSystemInstruction.parts },
            generationConfig: {
                ...limitedGeneralConfig,
                responseMimeType: "application/json",
                responseSchema: fullLessonSchema,
            },
        };

        console.log("createLessonFromText: Calling Gemini for lesson");
        let jsonString: string;
        try {
            console.log("createLessonFromText: Trying non-streaming request");
            const result = await llmModel.generateContent(requestBody);
            jsonString = result?.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
            console.log("createLessonFromText: Response received, length:", jsonString.length);
        } catch (err) {
            const error = err as { status?: number };
            console.log("createLessonFromText: Non-streaming failed with status:", error.status, "error:", err);
            if (error.status === 503) {
                console.log("createLessonFromText: Falling back to streaming");
                const streamingResp = await llmModel.generateContentStream(requestBody);
                let accumulated = "";
                for await (const chunk of streamingResp.stream) {
                    const partText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    accumulated += partText;
                }
                jsonString = accumulated;
                console.log("createLessonFromText: Streaming response complete, length:", jsonString.length);
            } else {
                throw err;
            }
        }
        if (!jsonString || jsonString.trim() === "") {
            console.log("createLessonFromText: Empty response from Gemini");
            throw new Error("Empty response from Gemini API for lesson content");
        }
        console.log("createLessonFromText: Parsing lesson JSON");
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
            console.log("createLessonFromText: Parsed lesson, title:", lessonData.title, "content length:", lessonData.content.length, "cards:", lessonData.cards.length);
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
