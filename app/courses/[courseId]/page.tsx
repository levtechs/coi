"use client";

import { useAuth } from "@/lib/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import LoginPrompt from "../../components/login_prompt";
import LessonCard from "@/app/components/courses/lesson_card" 
import { FiHome, FiLogOut, FiUser, FiCopy, FiPlay, FiSettings, FiShare, FiBarChart } from "react-icons/fi";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getCourse } from "../../views/courses";
import { getCards } from "../../views/cards";
import { getQuiz } from "../../views/quiz";
import { createCourseInvitation } from "../../views/invite";
import { Course, CourseLesson, Project, Quiz } from "@/lib/types";
import LoadingComponent from "../../components/loading";
import Button from "../../components/button";
import Analytics from "../../components/courses/analytics/analytics";

export default function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
    const { user, loading: authLoading } = useAuth();
    const searchParams = useSearchParams();
    const isAnalytics = searchParams.get("analytics") !== null;
    const [course, setCourse] = useState<Course | null>(null);
    const [lessonProjects, setLessonProjects] = useState<{ [lessonId: string]: Project[] }>({});
    const [lessonProgresses, setLessonProgresses] = useState<{ [lessonId: string]: number }>({});
    const [courseQuizzes, setCourseQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [courseId, setCourseId] = useState<string>("");
    const [showInvitePanel, setShowInvitePanel] = useState(false);
    const [showLinkPanel, setShowLinkPanel] = useState(false);
    const [panelTitle, setPanelTitle] = useState("");
    const [panelMessage, setPanelMessage] = useState("");
    const [panelUrl, setPanelUrl] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchParams = async () => {
            const { courseId } = await params;
            setCourseId(courseId);
        };
        fetchParams();
    }, [params]);

    useEffect(() => {
        const fetchCourse = async () => {
            if (!user || !courseId) return;
            setLoading(true);
            try {
                const result = await getCourse(courseId);
                if (result) {
                    setCourse(result.course);
                    setLessonProjects(result.lessonProjects);

                    // Fetch course quizzes
                    if (result.course.quizIds && result.course.quizIds.length > 0) {
                        Promise.all(result.course.quizIds.map(id => getQuiz(id))).then(quizzes => {
                            setCourseQuizzes(quizzes.filter(q => q !== null) as Quiz[]);
                        }).catch(error => {
                            console.error('Error fetching course quizzes:', error);
                        });
                    }

                    // Calculate lesson progresses
                    const progresses: { [lessonId: string]: number } = {};
                    for (const lesson of result.course.lessons) {
                        const projects = result.lessonProjects[lesson.id] || [];
                        if (lesson.cardsToUnlock && lesson.cardsToUnlock.length > 0) {
                            if (projects.length > 0) {
                                const totalCards = lesson.cardsToUnlock.length;
                                const progressesForLesson = await Promise.all(
                                    projects.map(async (project) => {
                                        try {
                                            const cards = await getCards(project.id);
                                            const unlockedCount = cards.filter((card) => card.isUnlocked).length;
                                            return Math.round((unlockedCount / totalCards) * 100);
                                        } catch (error) {
                                            console.error(`Failed to fetch cards for project ${project.id}:`, error);
                                            return 0;
                                        }
                                    })
                                );
                                progresses[lesson.id] = Math.max(...progressesForLesson);
                            } else {
                                progresses[lesson.id] = 0;
                            }
                        } else {
                            progresses[lesson.id] = 0;
                        }
                    }
                    setLessonProgresses(progresses);
                }
            } catch (error) {
                console.error("Failed to fetch course:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourse();
    }, [user, courseId]);

    useEffect(() => {
        if (course) {
            document.title = `${course.title} - coi`;
        }
    }, [course]);

    if (authLoading || loading) {
        return <LoadingComponent small={false} />;
    }

    if (!user) {
        return <LoginPrompt page="courses" />;
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 flex items-center justify-center">
                <p className="text-xl">Course not found</p>
            </div>
        );
    }

    const isOwner = user && course.ownerId === user.uid;

    if (isAnalytics && isOwner) {
        return <Analytics courseId={courseId} />;
    }

    const nextLesson = course.lessons
        .sort((a, b) => a.index - b.index)
        .find(lesson => (lessonProgresses[lesson.id] || 0) < 100);

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
            <div className="max-w-5xl mx-auto bg-[var(--neutral-100)] shadow-lg rounded-lg p-8">
                 <div className="flex justify-between items-center mb-8 gap-4">
                     <div className="flex items-center gap-4">
                         <Link href="/dashboard">
                             <FiHome
                                 size={32}
                                 className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                             />
                         </Link>
                         <Button color="var(--neutral-300)" onClick={() => window.location.href = '/courses'}>
                             Back to Courses
                         </Button>
                     </div>
                      <div className="flex flex-row gap-4 items-center">
                          <Button color="var(--error)" onClick={() => signOut(auth)}>
                              <FiLogOut className="h-[25px] w-[25px]" />
                          </Button>
                          <Button color="var(--accent-400)" onClick={() => window.location.href = "/profile"}>
                              <FiUser className="h-[25px] w-[25px]" />
                          </Button>
                      </div>
                 </div>

                 <hr />

                 <div className="mt-8">
                     <h1 className="text-3xl font-extrabold text-[var(--foreground)] mb-4">
                         {course.title}
                     </h1>
                     {course.description && (
                         <p className="text-[var(--foreground)] text-lg leading-relaxed">{course.description}</p>
                     )}
                 </div>

                 <div className="mt-8">
                     <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">Lessons</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {course.lessons.sort((a, b) => a.index - b.index).map((lesson) => (
                             <LessonCard
                                 key={lesson.id}
                                 lesson={lesson}
                                 courseId={courseId}
                                 projects={lessonProjects[lesson.id] || []}
                             />
                         ))}
                     </div>
                  </div>

                  <div className="mt-8">
                      <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">Course Quizzes</h2>
                      {courseQuizzes.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {courseQuizzes.map((quiz) => (
                                  <div key={quiz.id} className="bg-[var(--neutral-200)] p-4 rounded-lg shadow">
                                      <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">{quiz.title}</h3>
                                      <p className="text-sm text-[var(--neutral-600)] mb-4">{quiz.description}</p>
                                      <Button color="var(--accent-500)" onClick={() => window.open(`/quiz/${quiz.id}`, '_blank')}>
                                          Take Quiz
                                      </Button>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <p className="text-sm text-[var(--neutral-600)]">No quizzes available for this course.</p>
                      )}
                  </div>

                    <div className="mt-8 flex justify-center gap-4">
                       <FiShare
                           size={32}
                           className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                           onClick={() => {
                               if (course?.public) {
                                   setPanelTitle("Share Course");
                                   setPanelMessage("Share this public course:");
                                   setPanelUrl(`${window.location.origin}/courses/${courseId}`);
                                   setShowLinkPanel(true);
                               } else if (isOwner) {
                                   setShowInvitePanel(true);
                               } else {
                                   alert("Only the owner can share this private course.");
                               }
                           }}
                       />
                       {nextLesson && (
                           <FiPlay
                               size={32}
                               className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                               onClick={() => window.location.href = `/courses/${courseId}/${nextLesson.index}`}
                           />
                       )}
                       {isOwner && (
                           <>
                               <FiSettings
                                   size={32}
                                   className="text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer"
                                   onClick={() => window.location.href = `/courses?edit=${course.id}`}
                               />
                               <FiBarChart
                                   size={32}
                                   className="text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer"
                                   onClick={() => window.location.href = `/courses/${courseId}?analytics`}
                               />
                           </>
                       )}
                   </div>
             </div>

             {showInvitePanel && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/50">
                     <div className="bg-[var(--neutral-100)] p-6 rounded-lg shadow-lg w-96 flex flex-col gap-4">
                         <h2 className="text-[var(--foreground)] font-semibold text-xl">Share Course</h2>
                         <p className="text-[var(--foreground)]">Create an invite link for this private course:</p>
                         <Button
                             color="var(--accent-500)"
                             onClick={async () => {
                                 try {
                                     const result = await createCourseInvitation(courseId);
                                     setPanelTitle("Invite Link Created");
                                     setPanelMessage("Share this invite link:");
                                     setPanelUrl(`${window.location.origin}/l?token=${result.token}`);
                                     setShowInvitePanel(false);
                                     setShowLinkPanel(true);
                                 } catch (error) {
                                     console.error("Failed to create invite link:", error);
                                     alert("Failed to create invite link");
                                 }
                             }}
                         >
                             Create Invite Link
                         </Button>
                         <Button
                             color="var(--neutral-300)"
                             onClick={() => setShowInvitePanel(false)}
                         >
                             Cancel
                         </Button>
                     </div>
                 </div>
             )}
             {showLinkPanel && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/50">
                     <div className="bg-[var(--neutral-100)] p-6 rounded-lg shadow-lg w-96 flex flex-col gap-4">
                         <h2 className="text-[var(--foreground)] font-semibold text-xl">{panelTitle}</h2>
                         <p className="text-[var(--foreground)]">{panelMessage}</p>
                         <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-2">
                                 <input
                                     type="text"
                                     value={panelUrl}
                                     readOnly
                                     className="flex-1 border border-[var(--neutral-300)] rounded-md p-2 bg-[var(--neutral-100)] text-[var(--foreground)]"
                                 />
                                 <Button
                                     color="var(--accent-500)"
                                     onClick={() => {
                                         navigator.clipboard.writeText(panelUrl);
                                         setCopied(true);
                                         setTimeout(() => setCopied(false), 2000);
                                     }}
                                 >
                                     <FiCopy className="h-[20px] w-[20px]" />
                                 </Button>
                             </div>
                             {copied && <p className="text-[var(--accent-500)] text-sm">Copied!</p>}
                         </div>
                         <Button
                             color="var(--neutral-300)"
                             onClick={() => setShowLinkPanel(false)}
                         >
                             Close
                         </Button>
                     </div>
                 </div>
             )}
         </div>
     );
 }
