import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getVerifiedUid } from "../../helpers";
import { getUserById } from "../../users/helpers";
import { Course, CourseLesson, Card, NewCourse, QuizSettings } from "@/lib/types";
import { collection, addDoc, writeBatch, doc } from "firebase/firestore";
import { createCourseFromText, createLessonFromText } from "./helpers";
import { createQuizFromCards, writeQuizToDb } from "../../quiz/helpers";

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

    const user = await getUserById(uid);
    if (!user || !user.starUser) {
        return NextResponse.json({ error: "Star user required" }, { status: 403 });
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
            quizIds: courseData.quizIds || [],
            category: courseData.category || "",
            ownerId: uid
        });

        const courseId = courseRef.id;

        // Create lessons subcollection
        const batch = writeBatch(db);
        const lessons: CourseLesson[] = [];
        for (const lesson of courseData.lessons) {
            const lessonRef = doc(collection(db, 'courses', courseId, 'lessons'));

            const cardsToUnlock: Card[] = [];
            const cardsColRef = collection(lessonRef, 'cardsToUnlock');
            for (const card of lesson.cardsToUnlock) {
                const cardRef = doc(cardsColRef);
                batch.set(cardRef, card);
                cardsToUnlock.push({ ...card, id: cardRef.id });
            }

            batch.set(lessonRef, {
                ...lesson,
                courseId: courseId,
                cardsToUnlock: [] // Stored in subcollection
            });

            lessons.push({
                ...lesson,
                id: lessonRef.id,
                courseId: courseId,
                cardsToUnlock
            });
        }
        await batch.commit();

        // Return the full course object
        const fullCourse: Course = {
            id: courseId,
            title: courseData.title,
            description: courseData.description,
            lessons,
            quizIds: courseData.quizIds || [],
            public: courseData.public,
            sharedWith: courseData.sharedWith,
            category: courseData.category
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
    console.log("PUT /api/courses/create: Starting fast course creation");
    const uid = await getVerifiedUid(req);
    if (!uid) {
        console.log("PUT /api/courses/create: Unauthorized - no uid");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserById(uid);
    if (!user || !user.starUser) {
        return NextResponse.json({ error: "Star user required" }, { status: 403 });
    }

    try {
        const { text, finalQuizSettings, lessonQuizSettings }: { text: string; finalQuizSettings?: QuizSettings; lessonQuizSettings?: QuizSettings } = await req.json();
        console.log("PUT /api/courses/create: Received text, length:", text.length);

        if (!text || typeof text !== 'string') {
            console.log("PUT /api/courses/create: Invalid text input");
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        // Create a streaming response
        console.log("PUT /api/courses/create: Creating streaming response");
        const stream = new ReadableStream({
            async start(controller) {
                const enqueue = (data: string) => {
                    console.log("PUT /api/courses/create: Enqueuing update:", data.substring(0, 100) + "...");
                    controller.enqueue(new TextEncoder().encode(data + '\n'));
                };

                try {
                    console.log("PUT /api/courses/create: Calling createCourseFromText");
                    // Generate course structure from text with streaming updates
                    const courseData = await createCourseFromText(text, enqueue, lessonQuizSettings);
                    console.log("PUT /api/courses/create: createCourseFromText completed");

                    const courseQuizzes: object[] = [];
                    // Generate course quiz if finalQuizSettings provided
                    if (finalQuizSettings) {
                        enqueue(JSON.stringify({ type: "status", message: "Generating course quiz..." }));
                        console.log("PUT /api/courses/create: Generating course quiz");
                        const allCards = courseData.lessons.flatMap(lesson => lesson.cardsToUnlock);
                        const quizJson = await createQuizFromCards(allCards, finalQuizSettings);
                        if (quizJson) {
                            const quizId = await writeQuizToDb(quizJson);
                            courseData.quizIds = [quizId];
                            // Add quiz to response without re-fetching to avoid an extra DB read.
                            courseQuizzes.push({ id: quizId, ...(quizJson as object) });
                            console.log("PUT /api/courses/create: Course quiz generated with ID:", quizId);
                        } else {
                            console.warn("PUT /api/courses/create: Failed to generate course quiz");
                        }
                    }

                    enqueue(JSON.stringify({ type: "final", course: courseData, quizzes: courseQuizzes }));
                } catch (error) {
                    console.error("PUT /api/courses/create: Error generating course from text:", error);
                    enqueue(JSON.stringify({ type: "error", message: "Failed to generate course from text" }));
                } finally {
                    console.log("PUT /api/courses/create: Closing stream");
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
    console.log("PATCH /api/courses/create: Starting lesson creation");
    const uid = await getVerifiedUid(req);
    if (!uid) {
        console.log("PATCH /api/courses/create: Unauthorized - no uid");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserById(uid);
    if (!user || !user.starUser) {
        return NextResponse.json({ error: "Star user required" }, { status: 403 });
    }

    try {
        const { text, quizSettings }: { text: string; quizSettings?: QuizSettings } = await req.json();
        console.log("PATCH /api/courses/create: Received text, length:", text.length);

        if (!text || typeof text !== 'string') {
            console.log("PATCH /api/courses/create: Invalid text input");
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        console.log("PATCH /api/courses/create: Calling createLessonFromText");
        // Generate lesson structure from text
        const lessonData = await createLessonFromText(text);
        console.log("PATCH /api/courses/create: createLessonFromText completed, returning data");

        // Generate quiz if quizSettings provided
        if (quizSettings) {
            console.log("PATCH /api/courses/create: Generating quiz for lesson");
            const quizJson = await createQuizFromCards(lessonData.cardsToUnlock, quizSettings);
            if (quizJson) {
                const quizId = await writeQuizToDb(quizJson);
                lessonData.quizIds = [quizId];
                console.log("PATCH /api/courses/create: Quiz generated with ID:", quizId);
            } else {
                console.warn("PATCH /api/courses/create: Failed to generate quiz");
            }
        }

        return NextResponse.json(lessonData);
    } catch (error) {
        console.error("PATCH /api/courses/create: Error generating lesson from text:", error);
        return NextResponse.json({ error: "Failed to generate lesson from text" }, { status: 500 });
    }
}
