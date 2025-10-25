import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getVerifiedUid } from "../../helpers";
import { doc, getDoc, collection, getDocs, updateDoc, deleteDoc, setDoc, addDoc, query, where, or, and, orderBy } from "firebase/firestore";
import { Course, CourseLesson, Project, Card } from "@/lib/types";

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
        const lessonsSnap = await getDocs(query(lessonsRef, orderBy('index')));
        const lessons = await Promise.all(lessonsSnap.docs.map(async (p) => {
            const lessonData = p.data();
            // Fetch cardsToUnlock subcollection
            const cardsRef = collection(db, 'courses', courseId, 'lessons', p.id, 'cardsToUnlock');
            const cardsSnap = await getDocs(cardsRef);
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
            quizIds: courseData.quizIds || [],
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
                content: lesson.content,
                quizIds: lesson.quizIds || []
            };

            let lessonDocId: string;
            if (lesson.id && existingIds.has(lesson.id)) {
                // Update existing
                lessonDocId = lesson.id;
                await updateDoc(doc(lessonsRef, lesson.id), lessonData);
            } else {
                // Create new
                const newRef = await addDoc(lessonsRef, lessonData);
                lessonDocId = newRef.id;
            }

            // Handle cardsToUnlock subcollection
            const cardsRef = collection(db, 'courses', courseId, 'lessons', lessonDocId, 'cardsToUnlock');
            const existingCardsSnap = await getDocs(cardsRef);
            const existingCardIds = new Set(existingCardsSnap.docs.map(d => d.id));

            // Update or create cards
            const cardPromises = lesson.cardsToUnlock.map(async (card) => {
                if (card.id && existingCardIds.has(card.id)) {
                    // Update existing
                    await updateDoc(doc(cardsRef, card.id), { title: card.title, details: card.details });
                } else {
                    // Create new
                    await addDoc(cardsRef, { title: card.title, details: card.details });
                }
            });
            await Promise.all(cardPromises);

            // Delete cards not in the new list
            const newCardIds = new Set(lesson.cardsToUnlock.map(c => c.id).filter(Boolean));
            const toDeleteCards = existingCardsSnap.docs.filter(d => !newCardIds.has(d.id));
            const deleteCardPromises = toDeleteCards.map(d => deleteDoc(d.ref));
            await Promise.all(deleteCardPromises);
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