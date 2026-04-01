import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { Filter } from "firebase-admin/firestore";
import { getVerifiedUid, getVerifiedCourseAccess } from "../../helpers";
import { Card } from "@/lib/types/cards";
import { Course, CourseLesson } from "@/lib/types/course";
import { Project } from "@/lib/types/project";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    const { courseId } = await params;

    try {
        const uid = await getVerifiedCourseAccess(req, courseId, true);
        const courseRef = adminDb.collection('courses').doc(courseId);
        const courseSnap = await courseRef.get();
        const courseData = courseSnap.data();
        if (!courseData) return NextResponse.json({ error: "Course data is empty" }, { status: 404 });

        // Fetch lessons subcollection
        const lessonsRef = courseRef.collection('lessons');
        const lessonsSnap = await lessonsRef.orderBy('index').get();
        const lessons = await Promise.all(lessonsSnap.docs.map(async (p) => {
            const lessonData = p.data();
            // Fetch cardsToUnlock subcollection
            const cardsRef = p.ref.collection('cardsToUnlock');
            const cardsSnap = await cardsRef.get();
            let cardsToUnlock = cardsSnap.docs.map(cardDoc => ({
                id: cardDoc.id,
                ...cardDoc.data()
            })) as Card[];
            // Backward compatibility: if subcollection is empty, use array from document
            if (cardsToUnlock.length === 0 && lessonData.cardsToUnlock) {
                cardsToUnlock = lessonData.cardsToUnlock;
            }
            return {
                id: p.id,
                courseId: courseId,
                ...lessonData,
                cardsToUnlock
            } as CourseLesson;
        }));

        // Fetch projects for each lesson
        const lessonProjects: { [lessonId: string]: Project[] } = {};
        await Promise.all(
            lessons.map(async (lesson) => {
                try {
                    const projectsRef = adminDb.collection('projects');
                    const q = projectsRef
                        .where('courseLesson.id', '==', lesson.id)
                        .where(
                            Filter.or(
                                Filter.where('ownerId', '==', uid),
                                Filter.where('sharedWith', 'array-contains', uid),
                                Filter.where('public', '==', true)
                            )
                        );
                    
                    const projectsSnap = await q.get();
                    const filteredProjects = projectsSnap.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Project[];
                    
                    lessonProjects[lesson.id] = filteredProjects;
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
            quizIds: courseData.quizIds || [],
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
    const { courseId } = await params;

    try {
        const uid = await getVerifiedCourseAccess(req, courseId);
        const courseData: Course = await req.json();

        // Validate required fields
        if (!courseData.title) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const courseRef = adminDb.collection('courses').doc(courseId);
        const courseSnap = await courseRef.get();

        if (!courseSnap.exists) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const existingData = courseSnap.data();

        // Check if user is the owner
        if (existingData?.ownerId !== uid) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Update the course document
        await courseRef.update({
            title: courseData.title,
            description: courseData.description || "",
            public: courseData.public || false,
            sharedWith: courseData.sharedWith || [],
            quizIds: courseData.quizIds || [],
            category: courseData.category || "",
        });

        // Handle lessons: update existing, create new, delete removed
        const lessonsRef = courseRef.collection('lessons');
        const existingLessonsSnap = await lessonsRef.get();
        const existingIds = new Set(existingLessonsSnap.docs.map(d => d.id));

        // Update or create lessons
        const lessonPromises = courseData.lessons.map(async (lesson, index) => {
            const lessonData = {
                courseId: courseId,
                index: index,
                title: lesson.title,
                description: lesson.description,
                content: lesson.content,
                quizIds: lesson.quizIds || []
            };

            let lessonDocId: string;
            if (lesson.id && existingIds.has(lesson.id)) {
                // Update existing
                lessonDocId = lesson.id;
                await lessonsRef.doc(lesson.id).update(lessonData);
            } else {
                // Create new
                const newRef = await lessonsRef.add(lessonData);
                lessonDocId = newRef.id;
            }

            // Handle cardsToUnlock subcollection
            const cardsRef = lessonsRef.doc(lessonDocId).collection('cardsToUnlock');
            const existingCardsSnap = await cardsRef.get();
            const existingCardIds = new Set(existingCardsSnap.docs.map(d => d.id));

            // Update or create cards
            const cardPromises = lesson.cardsToUnlock.map(async (card) => {
                if (card.id && existingCardIds.has(card.id)) {
                    // Update existing
                    await cardsRef.doc(card.id).update({ title: card.title, details: card.details });
                } else {
                    // Create new
                    await cardsRef.add({ title: card.title, details: card.details });
                }
            });
            await Promise.all(cardPromises);

            // Delete cards not in the new list
            const newCardIds = new Set(lesson.cardsToUnlock.map(c => c.id).filter(Boolean));
            const toDeleteCards = existingCardsSnap.docs.filter(d => !newCardIds.has(d.id));
            const deleteCardPromises = toDeleteCards.map(d => d.ref.delete());
            await Promise.all(deleteCardPromises);
        });
        await Promise.all(lessonPromises);

        // Delete lessons not in the new list
        const newIds = new Set(courseData.lessons.map(l => l.id).filter(Boolean));
        const toDelete = existingLessonsSnap.docs.filter(d => !newIds.has(d.id));
        const deletePromises = toDelete.map(d => d.ref.delete());
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
    const { courseId } = await params;

    try {
        const uid = await getVerifiedUid(req);
        const courseRef = adminDb.collection('courses').doc(courseId);
        const courseSnap = await courseRef.get();

        if (!courseSnap.exists) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const courseData = courseSnap.data();

        // Check if user is the owner
        if (courseData?.ownerId !== uid) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Delete all lessons in the subcollection
        const lessonsRef = courseRef.collection('lessons');
        const lessonsSnap = await lessonsRef.get();
        const deleteLessonPromises = lessonsSnap.docs.map((lessonDoc) => lessonDoc.ref.delete());
        await Promise.all(deleteLessonPromises);

        // Delete the course document
        await courseRef.delete();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting course:", error);
        return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
    }
}