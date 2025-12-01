import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

import { CourseLesson, Project } from "@/lib/types"
import { getVerifiedUid } from "@/app/api/helpers";
import { getUserById } from "@/app/api/users/helpers";
import { fetchCardsFromProject } from "@/app/api/cards/helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 401 });

    const { courseId } = await params;

    try {
        // Fetch the course to check ownership and get sharedWith
        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);
        if (!courseSnap.exists()) return NextResponse.json({ error: "Course not found" }, { status: 404 });

        const courseData = courseSnap.data();
        const user = await getUserById(uid);
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });
        const isAdmin = courseData?.admins?.includes(user.email) || false;
        if (courseData?.ownerId !== uid && !isAdmin) {
            return NextResponse.json({ error: "Only the owner or admins can view analytics" }, { status: 403 });
        }

        const sharedWith = courseData?.sharedWith || [];
        const totalUsers = sharedWith.length;

        // Fetch invitations for this course
        const invitationsQuery = query(collection(db, "invitations"), where("courseId", "==", courseId));
        const invitationSnaps = await getDocs(invitationsQuery);

        const invitations = await Promise.all(invitationSnaps.docs.map(async (doc) => {
            const data = doc.data();
            const acceptedByUids = data.acceptedBy || [];

            // Fetch user details for acceptedBy
            const acceptedByUsers = await Promise.all(acceptedByUids.map(async (uid: string) => {
                return await getUserById(uid);
            }));

            return {
                token: data.token,
                createdAt: data.createdAt,
                createdBy: data.createdBy,
                acceptedBy: acceptedByUsers.filter((user) => user !== null),
            };
        }));

        // Fetch all projects for the course
        const projectsQuery = query(collection(db, "projects"), where("courseId", "==", courseId));
        const projectsSnap = await getDocs(projectsQuery);
        const allProjects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project & { id: string }));

        // Collect lessons from projects' courseLesson
        const lessonMap = new Map<string, CourseLesson>();
        allProjects.forEach((p: Project & { id: string }) => {
            if (p.courseLesson) {
                lessonMap.set(p.courseLesson.id, p.courseLesson);
            }
        });
        const lessons = Array.from(lessonMap.values()).sort((a: CourseLesson, b: CourseLesson) => a.index - b.index);

        // Fetch users and their progress
        const users = await Promise.all(sharedWith.map(async (uid: string) => {
            const user = await getUserById(uid);
            if (!user) return null;

            // Filter projects accessible by this user
            const userProjects = allProjects.filter((p: Project & { id: string }) => p.ownerId === uid || p.sharedWith?.includes(uid));

            // Group by lesson
            const lessonProjects: { [lessonId: string]: { id: string }[] } = {};
            userProjects.forEach((p: Project & { id: string }) => {
                if (p.courseLesson?.id) {
                    if (!lessonProjects[p.courseLesson.id]) {
                        lessonProjects[p.courseLesson.id] = [];
                    }
                    lessonProjects[p.courseLesson.id].push({ id: p.id });
                }
            });

            // Calculate progress
            const progress: { [lessonId: string]: number } = {};
            await Promise.all(lessons.map(async (lesson) => {
                const projs = lessonProjects[lesson.id] || [];
                if (projs.length === 0) {
                    progress[lesson.id] = 0;
                } else {
                    const progresses: number[] = [];
                    for (const proj of projs) {
                        try {
                            const cards = await fetchCardsFromProject(proj.id);
                            const lessonCardIds = new Set(lesson.cardsToUnlock.map(c => c.id));
                            const unlockedCount = cards.filter(card => lessonCardIds.has(card.id)).length;
                            const totalCards = lesson.cardsToUnlock.length;
                            if (totalCards === 0) {
                                progresses.push(100);
                            } else {
                                progresses.push(Math.round((unlockedCount / totalCards) * 100));
                            }
                        } catch (error) {
                            progresses.push(0);
                        }
                    }
                    progress[lesson.id] = Math.max(...progresses);
                }
            }));

            return {
                id: user.id,
                email: user.email,
                progress,
            };
        }));

        return NextResponse.json({
            totalUsers,
            invitations,
            users: users.filter(user => user !== null),
        });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
