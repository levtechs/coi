import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { adminDb } from "@/lib/firebaseAdmin";
import { Filter } from "firebase-admin/firestore";
import { getVerifiedUid, getVerifiedCourseAccess } from "../../helpers";
import { Course } from "@/lib/types/course";
import { Project } from "@/lib/types/project";
import {
  courseBrandingEmbedHtmlTooLong,
  isCourseStaff,
  normalizeCardsToUnlock,
  normalizeCourse,
  normalizeCourseBrandingHeader,
  normalizeCourseLesson,
  normalizeCoverImageUrl,
} from "@/app/api/courses/helpers";
import { updateQuizMetadata } from "@/app/api/quiz/helpers";

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
            const cardsRef = p.ref.collection('cardsToUnlock');
            const cardsSnap = await cardsRef.get();
            let cardsToUnlock = normalizeCardsToUnlock(cardsSnap.docs.map(cardDoc => ({
                id: cardDoc.id,
                ...cardDoc.data()
            })));
            if (cardsToUnlock.length === 0 && Array.isArray(lessonData.cardsToUnlock)) {
                cardsToUnlock = normalizeCardsToUnlock(lessonData.cardsToUnlock);
            }
            return normalizeCourseLesson(courseId, p.id, lessonData, cardsToUnlock);
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

        const course: Course = normalizeCourse(courseSnap.id, courseData, lessons);

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

        if (!existingData || !isCourseStaff(existingData, uid)) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const brandingPatch: Record<string, unknown> = {};
        if (Object.prototype.hasOwnProperty.call(courseData, "coverImageUrl")) {
            const cover = normalizeCoverImageUrl(courseData.coverImageUrl);
            brandingPatch.coverImageUrl = cover ?? admin.firestore.FieldValue.delete();
        }
        if (Object.prototype.hasOwnProperty.call(courseData, "courseBrandingHeader")) {
            if (courseBrandingEmbedHtmlTooLong(courseData.courseBrandingHeader)) {
                return NextResponse.json(
                    { error: "Branding embed HTML exceeds maximum length" },
                    { status: 400 },
                );
            }
            const header = normalizeCourseBrandingHeader(courseData.courseBrandingHeader);
            brandingPatch.courseBrandingHeader = header ?? admin.firestore.FieldValue.delete();
        }

        // Update the course document
        await courseRef.update({
            title: courseData.title,
            description: courseData.description || "",
            public: courseData.public || false,
            sharedWith: courseData.sharedWith || [],
            staffIds: courseData.staffIds || [],
            quizIds: courseData.quizIds || [],
            category: courseData.category || "",
            tutorDefaults: courseData.tutorDefaults || null,
            resources: courseData.resources || [],
            quizReportPolicy: courseData.quizReportPolicy || {},
            ...brandingPatch,
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
                content: lesson.content || lesson.guide?.body || "",
                guide: lesson.guide || null,
                tutorConfig: lesson.tutorConfig || null,
                resources: lesson.resources || [],
                baseProjectTemplate: lesson.baseProjectTemplate || null,
                quizIds: lesson.quizIds || [],
                optional: lesson.optional === true,
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
                    await cardsRef.doc(card.id).update({ title: card.title, details: card.details, unlockInstruction: card.unlockInstruction || null });
                } else {
                    // Create new
                    await cardsRef.add({ title: card.title, details: card.details, unlockInstruction: card.unlockInstruction || null });
                }
            });
            await Promise.all(cardPromises);

            // Delete cards not in the new list
            const newCardIds = new Set(lesson.cardsToUnlock.map(c => c.id).filter(Boolean));
            const toDeleteCards = existingCardsSnap.docs.filter(d => !newCardIds.has(d.id));
            const deleteCardPromises = toDeleteCards.map(d => d.ref.delete());
            await Promise.all(deleteCardPromises);

            return { lessonDocId, quizIds: lesson.quizIds || [] };
        });
        const resolvedLessons = await Promise.all(lessonPromises);

        await Promise.all([
            ...(courseData.quizIds || []).map((quizId) => updateQuizMetadata(quizId, {
                sourceType: "course",
                courseId,
                gradedOnly: true,
                createdBy: existingData.ownerId,
            })),
            ...resolvedLessons.flatMap((lesson) => lesson.quizIds.map((quizId) => updateQuizMetadata(quizId, {
                sourceType: "lesson",
                courseId,
                lessonId: lesson.lessonDocId,
                gradedOnly: true,
                createdBy: existingData.ownerId,
            }))),
        ]);

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
