import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getVerifiedUid } from "../../helpers";
import { Course, CourseLesson } from "@/lib/types";
import { collection, addDoc } from "firebase/firestore";
import { createCourseFromText, createLessonFromText } from "./helpers";

interface NewCourse {
    title: string;
    description?: string;
    lessons: Omit<CourseLesson, "id" | "courseId">[];
    public?: boolean;
    sharedWith?: string[];
}



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
                courseId: courseId
            });
            lessons.push({
                ...lesson,
                id: lessonRef.id,
                courseId: courseId
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
 * Returns the NewCourse object without saving to database.
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

        // Generate course structure from text
        const courseData = await createCourseFromText(text);

        return NextResponse.json(courseData);
    } catch (error) {
        console.error("Error generating course from text:", error);
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