import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getVerifiedUid } from "../../helpers";
import { Course, CourseLesson, Card, NewCourse } from "@/lib/types";
import { collection, addDoc } from "firebase/firestore";
import { createCourseFromText, createLessonFromText } from "./helpers";

/**
 * POST /api/courses/create
 * Creates a new course from the provided course data.
 * Expects JSON body with NewCourse structure.
 */
export async function POST(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const courseData: NewCourse = await req.json();

        // Validate required fields
        if (!courseData.title || !courseData.lessons) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Create the course document
        const courseRef = await addDoc(collection(db, 'courses'), {
            title: courseData.title,
            description: courseData.description || "",
            public: courseData.public || false,
            sharedWith: courseData.sharedWith || [],
            ownerId: uid
        });

        const courseId = courseRef.id;

        // Create lessons subcollection
        const lessons: CourseLesson[] = [];
        for (const lesson of courseData.lessons) {
            const lessonRef = await addDoc(collection(db, 'courses', courseId, 'lessons'), {
                ...lesson,
                courseId: courseId,
                cardsToUnlock: [] // Will populate below
            });

            // Create cardsToUnlock subcollection
            const cardsToUnlock: Card[] = [];
            for (const card of lesson.cardsToUnlock) {
                const cardRef = await addDoc(collection(db, 'courses', courseId, 'lessons', lessonRef.id, 'cardsToUnlock'), card);
                cardsToUnlock.push({
                    ...card,
                    id: cardRef.id
                });
            }

            lessons.push({
                ...lesson,
                id: lessonRef.id,
                courseId: courseId,
                cardsToUnlock
            });
        }

        // Return the full course object
        const fullCourse: Course = {
            id: courseId,
            title: courseData.title,
            description: courseData.description,
            lessons,
            public: courseData.public,
            sharedWith: courseData.sharedWith
        };

        return NextResponse.json(fullCourse);
    } catch (error) {
        console.error("Error creating course:", error);
        return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
    }
}

/**
 * PUT /api/courses/create
 * Generates a new course structure from the provided text using AI processing.
 * Returns a streaming response with updates during generation.
 * Expects JSON body with { text: string }
 */
export async function PUT(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { text }: { text: string } = await req.json();

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        // Create a streaming response
        const stream = new ReadableStream({
            async start(controller) {
                const enqueue = (data: string) => {
                    controller.enqueue(new TextEncoder().encode(data + '\n'));
                };

                try {
                    // Generate course structure from text with streaming updates
                    const courseData = await createCourseFromText(text, enqueue);
                    enqueue(JSON.stringify({ type: "final", course: courseData }));
                } catch (error) {
                    console.error("Error generating course from text:", error);
                    enqueue(JSON.stringify({ type: "error", message: "Failed to generate course from text" }));
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });
    } catch (error) {
        console.error("Error in PUT route:", error);
        return NextResponse.json({ error: "Failed to generate course from text" }, { status: 500 });
    }
}

/**
 * PATCH /api/courses/create
 * Generates a new lesson structure from the provided text using AI processing.
 * Returns the NewLesson object without saving to database.
 * Expects JSON body with { text: string }
 */
export async function PATCH(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { text }: { text: string } = await req.json();

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        // Generate lesson structure from text
        const lessonData = await createLessonFromText(text);

        return NextResponse.json(lessonData);
    } catch (error) {
        console.error("Error generating lesson from text:", error);
        return NextResponse.json({ error: "Failed to generate lesson from text" }, { status: 500 });
    }
}
