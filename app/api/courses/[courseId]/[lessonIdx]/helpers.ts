import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
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
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
            return { lesson: null, hasAccess: false };
        }

        const courseData = courseSnap.data();

        // Check access: owner, shared, or public
        const hasAccess =
            courseData.ownerId === uid ||
            (courseData.sharedWith && courseData.sharedWith.includes(uid)) ||
            courseData.public === true;

        if (!hasAccess) {
            return { lesson: null, hasAccess: false };
        }

        // Fetch lessons subcollection
        const lessonsRef = collection(db, 'courses', courseId, 'lessons');
        const lessonsSnap = await getDocs(lessonsRef);
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
        const cardsRef = collection(db, 'courses', courseId, 'lessons', lesson.id, 'cardsToUnlock');
        const cardsSnap = await getDocs(cardsRef);
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