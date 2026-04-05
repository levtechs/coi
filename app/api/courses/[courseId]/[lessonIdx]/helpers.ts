import { adminDb } from "@/lib/firebaseAdmin";
import { CourseBrandingFooter, CourseLesson, CourseResource } from "@/lib/types/course";
import { loadCourseResources } from "@/app/api/courses/course_resources_firestore";
import { normalizeCourseBrandingFooter } from "@/lib/courseBranding";
import { canAccessCourse, normalizeCardsToUnlock, normalizeCourseLesson } from "@/app/api/courses/helpers";

/**
 * Fetches a specific lesson from a course and checks user access permissions.
 *
 * @param courseId - The ID of the course containing the lesson
 * @param lessonIdx - The index of the lesson to fetch (0-based)
 * @param uid - The user ID to check access permissions for
 * @returns An object containing the lesson (if found) and whether the user has access
 */
export async function getLessonFromCourse(
  courseId: string,
  lessonIdx: number,
  uid: string,
): Promise<{
  lesson: CourseLesson | null;
  hasAccess: boolean;
  courseResources?: CourseResource[];
  lessonCount?: number;
  courseBrandingFooter?: CourseBrandingFooter;
  courseTitle?: string;
}> {
    try {
        const courseRef = adminDb.collection('courses').doc(courseId);
        const courseSnap = await courseRef.get();

        if (!courseSnap.exists) {
            return { lesson: null, hasAccess: false, lessonCount: 0 };
        }

        const courseData = courseSnap.data()!;

        const hasAccess = canAccessCourse(courseData, uid, true);

        if (!hasAccess) {
            return { lesson: null, hasAccess: false, lessonCount: 0 };
        }

        // Fetch lessons subcollection
        const lessonsRef = courseRef.collection('lessons');
        const lessonsSnap = await lessonsRef.get();
        const lessonCount = lessonsSnap.size;

        // Find the lesson by index
        const lessonDoc = lessonsSnap.docs.find((doc) => doc.data().index === lessonIdx);

        if (!lessonDoc) {
            return { lesson: null, hasAccess: false, lessonCount };
        }

        // Fetch cardsToUnlock subcollection
        const cardsRef = lessonDoc.ref.collection('cardsToUnlock');
        const cardsSnap = await cardsRef.get();
        const cardsToUnlock = normalizeCardsToUnlock(cardsSnap.docs.map((c) => ({
            id: c.id,
            ...c.data(),
        })));

        const lesson = normalizeCourseLesson(courseId, lessonDoc.id, lessonDoc.data(), cardsToUnlock);
        const courseResources = await loadCourseResources(courseId);
        const courseBrandingFooter = normalizeCourseBrandingFooter(courseData.courseBrandingFooter);
        const courseTitle = typeof courseData.title === "string" && courseData.title.trim()
          ? courseData.title.trim()
          : "Course";

        return {
          lesson,
          hasAccess: true,
          courseResources,
          lessonCount,
          courseTitle,
          ...(courseBrandingFooter ? { courseBrandingFooter } : {}),
        };
    } catch (error) {
        console.error("Error fetching lesson:", error);
        return { lesson: null, hasAccess: false, lessonCount: 0 };
    }
}
