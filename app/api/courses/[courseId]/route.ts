import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getVerifiedUid } from "../../helpers";
import { doc, getDoc, collection, getDocs, updateDoc, deleteDoc, setDoc, addDoc, query, where, or, and } from "firebase/firestore";
import { Course, CourseLesson, Project } from "@/lib/types";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;

    try {
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const courseData = courseSnap.data();

        // Check access: owner, shared, or public
        const hasAccess =
            courseData.ownerId === uid ||
            (courseData.sharedWith && courseData.sharedWith.includes(uid)) ||
            courseData.public === true;

        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Fetch lessons subcollection
        const lessonsRef = collection(db, 'courses', courseId, 'lessons');
        const lessonsSnap = await getDocs(lessonsRef);
        const lessons = lessonsSnap.docs.map((p) => ({
            id: p.id,
            courseId: courseId,
            ...p.data(),
                })) as CourseLesson[];

        // Fetch projects for each lesson
        const lessonProjects: { [lessonId: string]: Project[] } = {};
        await Promise.all(
            lessons.map(async (lesson) => {
                try {
                    const projectsRef = collection(db, 'projects');
                    const q = query(
                        projectsRef,
                        and(
                            where('courseLesson.id', '==', lesson.id),
                            or(
                                where('ownerId', '==', uid),
                                where('sharedWith', 'array-contains', uid),
                                where('public', '==', true)
                            )
                        )
                    );
                    const projectsSnap = await getDocs(q);
                    const projects = projectsSnap.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Project[];
                    lessonProjects[lesson.id] = projects;
                } catch (error) {
                    console.error(`Failed to fetch projects for lesson ${lesson.id}:`, error);
                    lessonProjects[lesson.id] = [];
                }
            })
        );

        const course: Course = {
            id: courseSnap.id,
            title: courseData.title,
            description: courseData.description,
            lessons,
            public: courseData.public,
            sharedWith: courseData.sharedWith || [],
            category: courseData.category,
            ownerId: courseData.ownerId,
        };

        return NextResponse.json({ course, lessonProjects });
    } catch (error) {
        console.error("Error fetching course:", error);
        return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;

    try {
        const courseData: Course = await req.json();

        // Validate required fields
        if (!courseData.title) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const existingData = courseSnap.data();

        // Check if user is the owner
        if (existingData.ownerId !== uid) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Update the course document
        await updateDoc(courseRef, {
            title: courseData.title,
            description: courseData.description || "",
            public: courseData.public || false,
            sharedWith: courseData.sharedWith || [],
        });

        // Handle lessons: update existing, create new, delete removed
        const lessonsRef = collection(db, 'courses', courseId, 'lessons');
        const existingLessonsSnap = await getDocs(lessonsRef);
        const existingIds = new Set(existingLessonsSnap.docs.map(d => d.id));

        // Update or create lessons
        const lessonPromises = courseData.lessons.map(async (lesson, index) => {
            const lessonData = {
                courseId: courseId,
                index: index,
                title: lesson.title,
                description: lesson.description,
                cardsToUnlock: lesson.cardsToUnlock,
                quizIds: lesson.quizIds || []
            };

            if (lesson.id && existingIds.has(lesson.id)) {
                // Update existing
                await updateDoc(doc(lessonsRef, lesson.id), lessonData);
            } else {
                // Create new
                const newRef = lesson.id ? doc(lessonsRef, lesson.id) : doc(lessonsRef);
                await setDoc(newRef, lessonData);
            }
        });
        await Promise.all(lessonPromises);

        // Delete lessons not in the new list
        const newIds = new Set(courseData.lessons.map(l => l.id).filter(Boolean));
        const toDelete = existingLessonsSnap.docs.filter(d => !newIds.has(d.id));
        const deletePromises = toDelete.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating course:", error);
        return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;

    try {
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const courseData = courseSnap.data();

        // Check if user is the owner
        if (courseData.ownerId !== uid) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Delete all lessons in the subcollection
        const lessonsRef = collection(db, 'courses', courseId, 'lessons');
        const lessonsSnap = await getDocs(lessonsRef);
        const deleteLessonPromises = lessonsSnap.docs.map((lessonDoc) => deleteDoc(lessonDoc.ref));
        await Promise.all(deleteLessonPromises);

        // Delete the course document
        await deleteDoc(courseRef);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting course:", error);
        return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
    }
}