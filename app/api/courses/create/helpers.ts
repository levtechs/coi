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

export const createLessonFromText = async (text: string): Promise<NewLesson> => {
    const prompt = createLessonFromTextPrompt(text);

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

        const response = await llmModel.generateContent(requestBody);
        const data = JSON.parse(response.response.text()) as {
            title: string;
            description: string;
            content: string;
            cards: {
                title: string;
                details: string[];
            }[];
        };

        const cards: NewCard[] = data.cards.map((card) => ({
            title: card.title,
            details: card.details,
        }));

        return {
            index: 0,
            title: data.title,
            description: data.description,
            content: data.content,
            cardsToUnlock: cards,
            quizIds: []
        };
    } catch (error) {
        console.error("Error creating lesson from text:", error);
        // Fallback
        const cards: NewCard[] = [
            {
                title: "Key Concept",
                details: ["Important point from the text", "Another detail"],
            }
        ];

        return {
            index: 0,
            title: "Lesson from Text",
            description: text.length > 100 ? text.substring(0, 100) + "..." : text,
            content: text,
            cardsToUnlock: cards,
            quizIds: []
        };
    }
};

export const createCourseFromText = async (text: string, enqueue?: (data: string) => void): Promise<NewCourse> => {
    enqueue?.(JSON.stringify({ type: "status", message: "Starting course creation..." }));

    try {
        // Step 1: Get course structure with title, description, and lesson descriptions
        const structurePrompt = createCourseStructurePrompt(text);
        enqueue?.(JSON.stringify({ type: "status", message: "Generating course outline..." }));

        const structureSchema: ObjectSchema = {
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

        const structureRequest = {
            contents: [{ role: "user", parts: [{ text: structurePrompt }] }],
            systemInstruction: { role: "system", parts: createLessonDescriptionsFromTextSystemInstruction.parts },
            generationConfig: {
                ...limitedGeneralConfig,
                responseMimeType: "application/json",
                responseSchema: structureSchema,
            },
        };

        const structureResponse = await llmModel.generateContent(structureRequest);
        const courseStructure = JSON.parse(structureResponse.response.text()) as {
            courseTitle: string;
            courseDescription: string;
            lessons: {
                title: string;
                description: string;
            }[];
        };
        enqueue?.(JSON.stringify({ type: "outline", courseStructure }));

        // Step 2: Create full lessons from descriptions
        const lessons: NewLesson[] = [];
        for (let i = 0; i < courseStructure.lessons.length; i++) {
            const desc = courseStructure.lessons[i];
            enqueue?.(JSON.stringify({ type: "lesson_start", lessonNumber: i + 1, lessonTitle: desc.title }));

            const previousLesson = i > 0 ? lessons[i - 1] : undefined;
            const lessonPrompt = createLessonContentPrompt({
                title: desc.title,
                description: desc.description,
                originalText: text,
                courseOutline: courseStructure.lessons,
                 previousLesson: previousLesson ? {
                     content: previousLesson.content || '',
                     cards: previousLesson.cardsToUnlock.map(card => ({
                         title: card.title,
                         details: card.details || []
                     }))
                 } : undefined
            });

            const lessonRequest = {
                contents: [{ role: "user", parts: [{ text: lessonPrompt }] }],
                systemInstruction: { role: "system", parts: createLessonFromDescriptionSystemInstruction.parts },
                generationConfig: {
                    ...limitedGeneralConfig,
                    responseMimeType: "application/json",
                    responseSchema: lessonContentSchema,
                },
            };

            const lessonResponse = await llmModel.generateContent(lessonRequest);
            const lessonData = JSON.parse(lessonResponse.response.text()) as {
                content: string;
                cards: {
                    title: string;
                    details: string[];
                }[];
            };

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
        // Fallback to simple implementation
        const lesson = await createLessonFromText(text);
        return {
            title: "Course from Text",
            description: text.length > 200 ? text.substring(0, 200) + "..." : text,
            lessons: [{ ...lesson, index: 0 }],
            public: false,
            sharedWith: []
        };
    }
};
