import { adminDb } from "@/lib/firebaseAdmin";
import { CourseLesson, Card } from "@/lib/types";

/**
 * Fetches a specific lesson from a course and checks user access permissions.
 *
 * @param courseId - The ID of the course containing the lesson
 * @param lessonIdx - The index of the lesson to fetch (0-based)
 * @param uid - The user ID to check access permissions for
 * @returns An object containing the lesson (if found) and whether the user has access
 */
export async function getLessonFromCourse(courseId: string, lessonIdx: number, uid: string): Promise<{ lesson: CourseLesson | null; hasAccess: boolean }> {
    try {
        const courseRef = adminDb.collection('courses').doc(courseId);
        const courseSnap = await courseRef.get();

        if (!courseSnap.exists) {
            return { lesson: null, hasAccess: false };
        }

        const courseData = courseSnap.data()!;

        // Check access: owner, shared, or public
        const hasAccess =
            courseData.ownerId === uid ||
            (courseData.sharedWith && courseData.sharedWith.includes(uid)) ||
            courseData.public === true;

        if (!hasAccess) {
            return { lesson: null, hasAccess: false };
        }

        // Fetch lessons subcollection
        const lessonsRef = courseRef.collection('lessons');
        const lessonsSnap = await lessonsRef.get();
        const lessons = lessonsSnap.docs.map((p) => ({
            id: p.id,
            courseId: courseId,
            ...p.data(),
        })) as CourseLesson[];

        // Find the lesson by index
        const lesson = lessons.find((l) => l.index === lessonIdx);

        if (!lesson) {
            return { lesson: null, hasAccess: false };
        }

        // Fetch cardsToUnlock subcollection
        const cardsRef = lessonsRef.doc(lesson.id).collection('cardsToUnlock');
        const cardsSnap = await cardsRef.get();
        const cardsToUnlock = cardsSnap.docs.map((c) => ({
            id: c.id,
            ...c.data(),
        })) as Card[];

        lesson.cardsToUnlock = cardsToUnlock;

        return { lesson, hasAccess: true };
    } catch (error) {
        console.error("Error fetching lesson:", error);
        return { lesson: null, hasAccess: false };
    }
}
