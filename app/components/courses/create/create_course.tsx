"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
    FiLoader, 
    FiSave, 
    FiX, 
    FiInfo, 
    FiBook, 
    FiCpu, 
    FiList, 
    FiCheckSquare, 
    FiSettings as FiSettingsIcon,
    FiExternalLink,
    FiAlertCircle,
    FiTrash2
} from "react-icons/fi";
import Button from "../../button";
import Loading from "../../loading";
import FastCreatePopup from "./fast_create_popup";
import QuizSettingsComponent from "./quiz_settings";
import LessonComponent from "./edit_lesson";
import { Card, NewCard } from "@/lib/types/cards";
import {
    Course,
    NewCourse,
    CourseCategory,
    NewLesson,
    CourseResource,
    CourseQuizReportPolicyEntry,
    CourseBrandingHeader,
} from "@/lib/types/course";
import { QuizSettings } from "@/lib/types/quiz";
import { normalizeCourseBrandingFooter } from "@/lib/courseBranding";
import {
    createCourse,
    getCourse,
    updateCourse,
    streamGenerateCourse,
    type CourseUpdatePayload,
} from "@/app/views/courses";
import { getQuiz } from "@/app/views/quiz";
import { createQuiz } from "@/app/views/quiz";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";
import TutorConfigEditor from "./tutor_config_editor";
import ResourceEditor from "./resource_editor";

type CourseLessonForm = Omit<NewLesson, "index"> & { id?: string; };

export default function CreateCourse() {
    const [initialQuery] = useState(() => {
        if (typeof window === "undefined") {
            return { tab: null as string | null, lesson: null as string | null, edit: null as string | null };
        }

        const params = new URLSearchParams(window.location.search);
        return {
            tab: params.get("tab"),
            lesson: params.get("lesson"),
            edit: params.get("edit"),
        };
    });
    
    const [activeSection, setActiveSection] = useState<"general" | "tutor" | "resources" | "lessons" | "quizzes" | "settings">("general");
    const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const allowNavigationRef = useRef(false);

    // Initial load and URL sync
    useEffect(() => {
        const tab = initialQuery.tab as typeof activeSection;
        if (tab && ["general", "tutor", "resources", "lessons", "quizzes", "settings"].includes(tab)) {
            setActiveSection(tab);
        }
        const lesson = initialQuery.lesson;
        if (lesson) {
            setSelectedLessonIndex(parseInt(lesson));
        }
    }, [initialQuery]); 

    const handleTabChange = (section: typeof activeSection) => {
        setActiveSection(section);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", section);
        window.history.replaceState(null, "", url.toString());
    };

    const handleLessonChange = (index: number) => {
        setSelectedLessonIndex(index);
        const url = new URL(window.location.href);
        url.searchParams.set("lesson", index.toString());
        window.history.replaceState(null, "", url.toString());
    };

    // Unsaved changes warning
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges && !allowNavigationRef.current) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const markChanged = useCallback(() => {
        if (!hasUnsavedChanges) setHasUnsavedChanges(true);
    }, [hasUnsavedChanges]);

    const [courseTitle, setCourseTitle] = useState("");
    const [courseDescription, setCourseDescription] = useState("");
    const [lessons, setLessons] = useState<CourseLessonForm[]>([{ title: "", description: "", content: "", guide: undefined, tutorConfig: undefined, resources: [], baseProjectTemplate: undefined, cardsToUnlock: [], quizIds: [], optional: false }]);
    const [collapsedCards, setCollapsedCards] = useState<{ [lessonIndex: number]: boolean[] }>({});
    const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);
    const [isCreatingCourse, setIsCreatingCourse] = useState(false);
    const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
    const [isPublic, setIsPublic] = useState(false);
    const [isFastCreatePopupOpen, setIsFastCreatePopupOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editCourseId, setEditCourseId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [courseQuizIds, setCourseQuizIds] = useState<string[]>([]);
    const [courseQuizzes, setCourseQuizzes] = useState<{id?: string, status: 'creating' | 'created', title?: string}[]>([]);
    const [showCourseQuizSettings, setShowCourseQuizSettings] = useState(false);
    const [courseQuizSettings, setCourseQuizSettings] = useState<QuizSettings>({includeMCQ: true, includeFRQ: false, quizStyle: "mixed", length: "normal"});
    const [selectedCards, setSelectedCards] = useState<boolean[]>([]);
    const [courseQuizError, setCourseQuizError] = useState<string | null>(null);
    const [courseCategory, setCourseCategory] = useState<CourseCategory | "">("");
    const [courseTutorDefaults, setCourseTutorDefaults] = useState<Course["tutorDefaults"]>(undefined);
    const [courseResources, setCourseResources] = useState<Course["resources"]>([]);
    const [sharedWithIds, setSharedWithIds] = useState<string[]>([]);
    const [staffIds, setStaffIds] = useState<string[]>([]);
    const [quizReportPolicy, setQuizReportPolicy] = useState<Record<string, CourseQuizReportPolicyEntry>>({});
    const [quizPolicyTitles, setQuizPolicyTitles] = useState<Record<string, string>>({});
    const [coverImageUrl, setCoverImageUrl] = useState("");
    const [headerMode, setHeaderMode] = useState<"none" | "image" | "embed">("none");
    const [headerImageUrl, setHeaderImageUrl] = useState("");
    const [headerImageAlt, setHeaderImageAlt] = useState("");
    const [headerEmbedHtml, setHeaderEmbedHtml] = useState("");
    const [footerOutreachEmail, setFooterOutreachEmail] = useState("");
    const [footerLogoUrl, setFooterLogoUrl] = useState("");
    const [footerLogoAlt, setFooterLogoAlt] = useState("");
    const [footerPrimaryLabel, setFooterPrimaryLabel] = useState("");
    const [footerPrimaryUrl, setFooterPrimaryUrl] = useState("");
    const [footerSecondaryLabel, setFooterSecondaryLabel] = useState("");
    const [footerSecondaryUrl, setFooterSecondaryUrl] = useState("");
    const [footerCustomLine, setFooterCustomLine] = useState("");

    const allQuizIdsForPolicy = useMemo(() => {
        const s = new Set<string>();
        courseQuizIds.forEach((id) => s.add(id));
        lessons.forEach((l) => (l.quizIds || []).forEach((id) => s.add(id)));
        return [...s].sort();
    }, [courseQuizIds, lessons]);

    const quizPolicyKey = useMemo(() => allQuizIdsForPolicy.join(","), [allQuizIdsForPolicy]);

    // eslint-disable-next-line react-hooks/exhaustive-deps -- quizPolicyKey fingerprints allQuizIdsForPolicy
    useEffect(() => {
        if (allQuizIdsForPolicy.length === 0) {
            setQuizPolicyTitles({});
            return;
        }
        let cancelled = false;
        Promise.all(
            allQuizIdsForPolicy.map(async (id) => {
                try {
                    const q = await getQuiz(id);
                    return [id, q?.title || id] as const;
                } catch {
                    return [id, id] as const;
                }
            }),
        ).then((entries) => {
            if (!cancelled) setQuizPolicyTitles(Object.fromEntries(entries));
        });
        return () => {
            cancelled = true;
        };
    }, [quizPolicyKey]);

    const studentResources = useMemo(() => (courseResources || []).filter(r => r.studentVisible !== false), [courseResources]);
    const referenceResources = useMemo(() => (courseResources || []).filter(r => r.includeInTutorReference === true), [courseResources]);

    const handleReferenceResourcesChange = (nextRefs: CourseResource[]) => {
        const otherResources = (courseResources || []).filter(r => r.includeInTutorReference !== true);
        setCourseResources([...otherResources, ...nextRefs]);
        markChanged();
    };

    const handleStudentResourcesChange = (nextStudent: CourseResource[]) => {
        const otherResources = (courseResources || []).filter(r => r.studentVisible === false);
        setCourseResources([...otherResources, ...nextStudent]);
        markChanged();
    };

    useEffect(() => {
        const totalCards = lessons.reduce((sum, l) => sum + l.cardsToUnlock.length, 0);
        setSelectedCards(new Array(totalCards).fill(true));
    }, [lessons]);

    useEffect(() => {
        const editId = initialQuery.edit;
        if (editId) {
            setIsEdit(true);
            setEditCourseId(editId);
            setLoading(true);
            getCourse(editId).then((result) => {
                if (result) {
                    const { course } = result;
                    setCourseTitle(course.title);
                    setCourseDescription(course.description || "");
                    setIsPublic(course.public || false);
                    setCourseCategory(course.category || "");
                    setCourseTutorDefaults(course.tutorDefaults);
                    setCourseResources(course.resources || []);
                    setCoverImageUrl(course.coverImageUrl || "");
                    const bh = course.courseBrandingHeader;
                    if (!bh) {
                        setHeaderMode("none");
                        setHeaderImageUrl("");
                        setHeaderImageAlt("");
                        setHeaderEmbedHtml("");
                    } else if (bh.kind === "image") {
                        setHeaderMode("image");
                        setHeaderImageUrl(bh.imageUrl);
                        setHeaderImageAlt(bh.alt || "");
                        setHeaderEmbedHtml("");
                    } else {
                        setHeaderMode("embed");
                        setHeaderImageUrl("");
                        setHeaderImageAlt("");
                        setHeaderEmbedHtml(bh.html);
                    }
                    const cf = course.courseBrandingFooter;
                    if (cf) {
                        setFooterOutreachEmail(cf.outreachEmail || "");
                        setFooterLogoUrl(cf.logoUrl || "");
                        setFooterLogoAlt(cf.logoAlt || "");
                        setFooterPrimaryLabel(cf.primaryLinkLabel || "");
                        setFooterPrimaryUrl(cf.primaryLinkUrl || "");
                        setFooterSecondaryLabel(cf.secondaryLinkLabel || "");
                        setFooterSecondaryUrl(cf.secondaryLinkUrl || "");
                        setFooterCustomLine(cf.customLine || "");
                    } else {
                        setFooterOutreachEmail("");
                        setFooterLogoUrl("");
                        setFooterLogoAlt("");
                        setFooterPrimaryLabel("");
                        setFooterPrimaryUrl("");
                        setFooterSecondaryLabel("");
                        setFooterSecondaryUrl("");
                        setFooterCustomLine("");
                    }
                    setSharedWithIds(course.sharedWith || []);
                    setStaffIds(course.staffIds || []);
                    const loadedLessons: CourseLessonForm[] = course.lessons.map((lesson) => ({
                        id: lesson.id,
                        title: lesson.title,
                        description: lesson.description,
                        content: lesson.content || lesson.guide?.body || "",
                        guide: lesson.guide,
                        tutorConfig: lesson.tutorConfig,
                        resources: lesson.resources || [],
                        baseProjectTemplate: lesson.baseProjectTemplate,
                        cardsToUnlock: lesson.cardsToUnlock.map((card) => ({
                            title: card.title,
                            details: card.details || [],
                            unlockInstruction: card.unlockInstruction,
                        })),
                        quizIds: lesson.quizIds || [],
                        optional: lesson.optional === true,
                    }));
                    setQuizReportPolicy(course.quizReportPolicy || {});
                    setLessons(loadedLessons);
                    setSelectedLessonIndex(0);
                    const newCollapsedCards: { [key: number]: boolean[] } = {};
                    loadedLessons.forEach((lesson, i) => {
                        newCollapsedCards[i] = new Array(lesson.cardsToUnlock.length).fill(true);
                    });
                    setCollapsedCards(newCollapsedCards);
                     setCourseQuizIds(course.quizIds || []);
                     // Fetch titles for existing quizzes
                     if (course.quizIds && course.quizIds.length > 0) {
                         Promise.all(course.quizIds.map(id => getQuiz(id))).then(quizzes => {
                             setCourseQuizzes(quizzes.map((quiz, index) => ({
                                 id: course.quizIds![index],
                                 status: 'created' as const,
                                 title: quiz?.title
                             })));
                         }).catch(error => {
                             console.error('Error fetching quiz titles:', error);
                             // Fallback to default titles
                             setCourseQuizzes(course.quizIds!.map((id, index) => ({
                                 id,
                                 status: 'created' as const,
                                 title: `Course Quiz ${index + 1}`
                             })));
                         });
                     } else {
                         setCourseQuizzes([]);
                     }
                }
                setLoading(false);
                setHasUnsavedChanges(false);
            });
        }
    }, [initialQuery]);

    const addLesson = () => {
        setLessons([...lessons, { title: "", description: "", content: "", guide: undefined, tutorConfig: undefined, resources: [], baseProjectTemplate: undefined, cardsToUnlock: [], quizIds: [] }]);
        handleLessonChange(lessons.length);
        handleTabChange("lessons");
        markChanged();
    };

    const setLesson = (index: number, lesson: CourseLessonForm) => {
        setLessons((prev) => {
            const next = [...prev];
            next[index] = lesson;
            return next;
        });
        markChanged();
    };

    const addQuizIdToLesson = (lessonIndex: number, quizId: string) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].quizIds!.push(quizId);
        setLessons(newLessons);
        markChanged();
    };

    const removeLesson = (index: number) => {
        if (!window.confirm("Are you sure you want to remove this lesson?")) return;
        setLessons(lessons.filter((_, i) => i !== index));
        const newCollapsedCards = { ...collapsedCards };
        delete newCollapsedCards[index];
        const shifted: { [key: number]: boolean[] } = {};
        Object.keys(newCollapsedCards).forEach(key => {
            const k = parseInt(key);
            if (k > index) {
                shifted[k - 1] = newCollapsedCards[k];
            } else if (k < index) {
                shifted[k] = newCollapsedCards[k];
            }
        });
        setCollapsedCards(shifted);
        setSelectedLessonIndex((current) => {
            if (lessons.length <= 1) return 0;
            if (current > index) return current - 1;
            return Math.min(current, lessons.length - 2);
        });
        markChanged();
    };

    const updateLesson = (index: number, field: "title" | "description" | "content", value: string) => {
        const newLessons = [...lessons];
        newLessons[index][field] = value;
        setLessons(newLessons);
        markChanged();
    };

    const addCard = (lessonIndex: number) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cardsToUnlock.push({
            title: "",
            details: [""],
        });
        setLessons(newLessons);
        const newCollapsed = { ...collapsedCards };
        if (!newCollapsed[lessonIndex]) {
            newCollapsed[lessonIndex] = [];
        }
        newCollapsed[lessonIndex].push(true);
        setCollapsedCards(newCollapsed);
        markChanged();
    };

    const removeCardFromLesson = (lessonIndex: number, cardIndex: number) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cardsToUnlock.splice(cardIndex, 1);
        setLessons(newLessons);
        markChanged();
    };

    const updateCard = (lessonIndex: number, cardIndex: number, field: "title", value: string) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cardsToUnlock[cardIndex][field] = value;
        setLessons(newLessons);
        markChanged();
    };

    const addDetailToCard = (lessonIndex: number, cardIndex: number) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cardsToUnlock[cardIndex].details!.push("");
        setLessons(newLessons);
        markChanged();
    };

    const removeDetailFromCard = (lessonIndex: number, cardIndex: number, detailIndex: number) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cardsToUnlock[cardIndex].details!.splice(detailIndex, 1);
        setLessons(newLessons);
        markChanged();
    };

    const updateCardDetail = (lessonIndex: number, cardIndex: number, detailIndex: number, value: string) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cardsToUnlock[cardIndex].details![detailIndex] = value;
        setLessons(newLessons);
        markChanged();
    };

    const buildCourseBrandingPayload = (): CourseBrandingHeader | null => {
        if (headerMode === "none") return null;
        if (headerMode === "image") {
            const u = headerImageUrl.trim();
            if (!u) return null;
            const alt = headerImageAlt.trim();
            return { kind: "image", imageUrl: u, ...(alt ? { alt } : {}) };
        }
        const html = headerEmbedHtml;
        if (!html.trim()) return null;
        return { kind: "embed", html };
    };

    const buildCourseBrandingFooterPayload = () =>
        normalizeCourseBrandingFooter({
            outreachEmail: footerOutreachEmail,
            logoUrl: footerLogoUrl,
            logoAlt: footerLogoAlt,
            primaryLinkLabel: footerPrimaryLabel,
            primaryLinkUrl: footerPrimaryUrl,
            secondaryLinkLabel: footerSecondaryLabel,
            secondaryLinkUrl: footerSecondaryUrl,
            customLine: footerCustomLine,
        });

    const handleSubmit = async () => {
        setIsCreatingCourse(true);
        try {
            const mergedQuizPolicy: Record<string, CourseQuizReportPolicyEntry> = { ...quizReportPolicy };
            for (const id of allQuizIdsForPolicy) {
                if (!mergedQuizPolicy[id]) mergedQuizPolicy[id] = { optional: true };
            }

            if (isEdit && editCourseId) {
                const courseData: CourseUpdatePayload = {
                    title: courseTitle,
                    description: courseDescription,
                    tutorDefaults: courseTutorDefaults,
                    resources: courseResources,
                    lessons: lessons.map((lesson, index) => ({
                            id: lesson.id,
                            courseId: editCourseId,
                            index,
                            title: lesson.title,
                            description: lesson.description,
                            content: lesson.content,
                            guide: lesson.guide,
                            tutorConfig: lesson.tutorConfig,
                            resources: lesson.resources || [],
                            baseProjectTemplate: lesson.baseProjectTemplate,
                            cardsToUnlock: lesson.cardsToUnlock as Card[],
                            quizIds: lesson.quizIds || [],
                            optional: lesson.optional === true,
                        })),
                    quizIds: courseQuizIds,
                    quizReportPolicy: mergedQuizPolicy,
                    public: isPublic,
                    category: courseCategory === "" ? undefined : courseCategory,
                    sharedWith: sharedWithIds,
                    staffIds,
                    coverImageUrl: coverImageUrl.trim(),
                    courseBrandingHeader: buildCourseBrandingPayload() ?? null,
                    courseBrandingFooter: buildCourseBrandingFooterPayload() ?? null,
                };
                const success = await updateCourse(editCourseId, courseData);
                if (success) {
                    allowNavigationRef.current = true;
                    setHasUnsavedChanges(false);
                    window.location.href = `/courses/${editCourseId}`;
                }
            } else {
                const newBranding = buildCourseBrandingPayload();
                const newFooter = buildCourseBrandingFooterPayload();
                const courseData: NewCourse & { quizIds?: string[] } = {
                    title: courseTitle,
                    description: courseDescription,
                    tutorDefaults: courseTutorDefaults,
                    resources: courseResources,
                    lessons: lessons.map((lesson, index) => ({
                        index,
                        title: lesson.title,
                        description: lesson.description,
                        content: lesson.content,
                        guide: lesson.guide,
                        tutorConfig: lesson.tutorConfig,
                        resources: lesson.resources || [],
                        baseProjectTemplate: lesson.baseProjectTemplate,
                        cardsToUnlock: lesson.cardsToUnlock,
                        quizIds: lesson.quizIds || [],
                        optional: lesson.optional === true,
                    })),
                    quizIds: courseQuizIds,
                    quizReportPolicy: mergedQuizPolicy,
                    public: isPublic,
                    category: courseCategory === "" ? undefined : courseCategory,
                    sharedWith: sharedWithIds,
                    staffIds,
                    ...(coverImageUrl.trim() ? { coverImageUrl: coverImageUrl.trim() } : {}),
                    ...(newBranding ? { courseBrandingHeader: newBranding } : {}),
                    ...(newFooter ? { courseBrandingFooter: newFooter } : {}),
                };
                const data = await createCourse(courseData);
                if (data) {
                    allowNavigationRef.current = true;
                    setHasUnsavedChanges(false);
                    window.location.href = `/courses/${data.id}`;
                }
            }
        } catch (error) {
            console.error('Error submitting course:', error);
        } finally {
            setIsCreatingCourse(false);
        }
    };

    const isLoading = isGeneratingCourse || isCreatingCourse || isGeneratingLesson || loading;

    if (loading) {
        return <Loading small={true} loadingText="Loading Course" />;
    }

    const navItems: { id: typeof activeSection; label: string; icon: React.ElementType }[] = [
        { id: "general", label: "General", icon: FiInfo },
        { id: "tutor", label: "AI Tutor", icon: FiCpu },
        { id: "resources", label: "Resources", icon: FiBook },
        { id: "lessons", label: "Lessons", icon: FiList },
        { id: "quizzes", label: "Assessments", icon: FiCheckSquare },
        { id: "settings", label: "Settings", icon: FiSettingsIcon },
    ];

    const selectedLesson = lessons[selectedLessonIndex];

    const handleClose = () => {
        if (hasUnsavedChanges && !window.confirm("You have unsaved changes. Are you sure you want to leave?")) return;
        allowNavigationRef.current = true;
        window.location.href = isEdit ? `/courses/${editCourseId}` : '/courses';
    };

    return (
        <div className="flex flex-col min-h-screen bg-[var(--neutral-100)] text-[var(--foreground)]">
            {/* Header */}
            <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-[var(--neutral-100)] border-b border-[var(--neutral-300)] shadow-sm">
                <div className="flex items-center gap-4 min-w-0">
                    <button 
                        onClick={handleClose}
                        className="p-2 hover:bg-[var(--neutral-200)] rounded-full transition-colors flex-shrink-0"
                        title="Close editor"
                    >
                        <FiX size={20} />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-lg font-bold truncate">
                            {isEdit ? "Edit Course" : "New Course"}: {courseTitle || "Untitled"}
                        </h1>
                        {hasUnsavedChanges && (
                            <div className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                                <FiAlertCircle size={12} />
                                <span>Unsaved changes</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-[var(--neutral-600)]">
                            <FiLoader className="animate-spin" />
                            <span>Processing...</span>
                        </div>
                    ) : (
                        <>
                            <button 
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-[var(--neutral-700)] hover:bg-[var(--neutral-200)] rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                            <Button 
                                color="var(--accent-500)" 
                                onClick={handleSubmit}
                                className="flex items-center gap-2 shadow-sm"
                            >
                                <FiSave size={18} />
                                <span>{isEdit ? "Save Changes" : "Create Course"}</span>
                            </Button>
                        </>
                    )}
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="bg-[var(--neutral-100)] border-b border-[var(--neutral-300)] sticky top-[69px] z-20 overflow-x-auto scrollbar-hide shadow-sm">
                <div className="max-w-7xl mx-auto px-6 flex items-center">
                    {navItems.map((item) => {
                        const isActive = activeSection === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleTabChange(item.id)}
                                className={`px-6 py-5 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${
                                    isActive 
                                    ? "text-[var(--accent-500)]" 
                                    : "text-[var(--neutral-500)] hover:text-[var(--foreground)]"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <item.icon size={14} className={isActive ? "text-[var(--accent-500)]" : "text-[var(--neutral-400)]"} />
                                    <span>{item.label}</span>
                                </div>
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--accent-500)]" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-8 pb-24 bg-[var(--neutral-100)]">
                {activeSection === "general" && (
                    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-[var(--neutral-200)] border border-[var(--neutral-300)] rounded-xl p-8 shadow-sm">
                            <h2 className="text-xl font-bold mb-8 flex items-center gap-2 uppercase text-xs tracking-widest text-[var(--neutral-500)]">
                                <FiInfo size={16} />
                                Course Metadata
                            </h2>
                            <div className="space-y-8">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--neutral-600)] mb-3 uppercase tracking-wider">Course Title</label>
                                    <input
                                        type="text"
                                        value={courseTitle}
                                        onChange={(e) => { setCourseTitle(e.target.value); markChanged(); }}
                                        className="w-full p-4 border border-[var(--neutral-300)] rounded-lg bg-[var(--neutral-100)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] transition-all text-2xl font-bold"
                                        placeholder="e.g. Mantis Foundations"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--neutral-600)] mb-3 uppercase tracking-wider">Course Description</label>
                                    <textarea
                                        value={courseDescription}
                                        onChange={(e) => { setCourseDescription(e.target.value); markChanged(); }}
                                        className="w-full p-4 border border-[var(--neutral-300)] rounded-lg bg-[var(--neutral-100)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] h-48 transition-all resize-none text-lg leading-relaxed"
                                        placeholder="What will students learn in this course?"
                                    />
                                </div>
                                <div className="border-t border-[var(--neutral-300)] pt-8">
                                    <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-[var(--neutral-600)]">
                                        Branding
                                    </h3>
                                    <p className="mb-6 text-sm text-[var(--neutral-600)]">
                                        List cards can show a cover image. The course and lesson pages can use a banner image or a custom HTML block at the top (sandboxed frame; scripts are allowed), and an optional footer at the bottom with links and contact info.
                                    </p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--neutral-600)]">
                                                Cover image URL (course list)
                                            </label>
                                            <input
                                                type="url"
                                                value={coverImageUrl}
                                                onChange={(e) => {
                                                    setCoverImageUrl(e.target.value);
                                                    markChanged();
                                                }}
                                                className="w-full rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-3 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)]"
                                                placeholder="https://…"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--neutral-600)]">
                                                Course page header
                                            </label>
                                            <select
                                                value={headerMode}
                                                onChange={(e) => {
                                                    setHeaderMode(e.target.value as typeof headerMode);
                                                    markChanged();
                                                }}
                                                className="w-full rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-3 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)]"
                                            >
                                                <option value="none">None</option>
                                                <option value="image">Image banner</option>
                                                <option value="embed">HTML embed</option>
                                            </select>
                                        </div>
                                        {headerMode === "image" && (
                                            <div className="space-y-4 rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-4">
                                                <div>
                                                    <label className="mb-2 block text-xs font-bold text-[var(--neutral-600)]">Image URL</label>
                                                    <input
                                                        type="url"
                                                        value={headerImageUrl}
                                                        onChange={(e) => {
                                                            setHeaderImageUrl(e.target.value);
                                                            markChanged();
                                                        }}
                                                        className="w-full rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-200)] p-3 text-[var(--foreground)]"
                                                        placeholder="https://…"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-2 block text-xs font-bold text-[var(--neutral-600)]">Alt text (optional)</label>
                                                    <input
                                                        type="text"
                                                        value={headerImageAlt}
                                                        onChange={(e) => {
                                                            setHeaderImageAlt(e.target.value);
                                                            markChanged();
                                                        }}
                                                        className="w-full rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-200)] p-3 text-[var(--foreground)]"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {headerMode === "embed" && (
                                            <div>
                                                <label className="mb-2 block text-xs font-bold text-[var(--neutral-600)]">
                                                    HTML (full document or body fragment)
                                                </label>
                                                <textarea
                                                    value={headerEmbedHtml}
                                                    onChange={(e) => {
                                                        setHeaderEmbedHtml(e.target.value);
                                                        markChanged();
                                                    }}
                                                    className="h-56 w-full resize-y rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-4 font-mono text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)]"
                                                    spellCheck={false}
                                                />
                                            </div>
                                        )}
                                        <div className="border-t border-[var(--neutral-300)] pt-8 mt-8">
                                            <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-[var(--neutral-600)]">
                                                Course page footer
                                            </h4>
                                            <p className="mb-4 text-sm text-[var(--neutral-600)]">
                                                Shown at the bottom of the course overview and every lesson. Leave fields blank to hide the footer. Link rows need both a label and a valid https URL.
                                            </p>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="mb-2 block text-xs font-bold text-[var(--neutral-600)]">
                                                        Outreach email
                                                    </label>
                                                    <input
                                                        type="email"
                                                        value={footerOutreachEmail}
                                                        onChange={(e) => {
                                                            setFooterOutreachEmail(e.target.value);
                                                            markChanged();
                                                        }}
                                                        className="w-full rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-3 text-[var(--foreground)]"
                                                        placeholder="you@school.edu"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div>
                                                        <label className="mb-2 block text-xs font-bold text-[var(--neutral-600)]">
                                                            Logo image URL
                                                        </label>
                                                        <input
                                                            type="url"
                                                            value={footerLogoUrl}
                                                            onChange={(e) => {
                                                                setFooterLogoUrl(e.target.value);
                                                                markChanged();
                                                            }}
                                                            className="w-full rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-3 text-[var(--foreground)]"
                                                            placeholder="https://…"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-2 block text-xs font-bold text-[var(--neutral-600)]">
                                                            Logo alt text (optional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={footerLogoAlt}
                                                            onChange={(e) => {
                                                                setFooterLogoAlt(e.target.value);
                                                                markChanged();
                                                            }}
                                                            className="w-full rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-3 text-[var(--foreground)]"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div>
                                                        <label className="mb-2 block text-xs font-bold text-[var(--neutral-600)]">
                                                            Primary button — label
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={footerPrimaryLabel}
                                                            onChange={(e) => {
                                                                setFooterPrimaryLabel(e.target.value);
                                                                markChanged();
                                                            }}
                                                            className="w-full rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-3 text-[var(--foreground)]"
                                                            placeholder="e.g. Meet Manolis"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-2 block text-xs font-bold text-[var(--neutral-600)]">
                                                            Primary button — URL
                                                        </label>
                                                        <input
                                                            type="url"
                                                            value={footerPrimaryUrl}
                                                            onChange={(e) => {
                                                                setFooterPrimaryUrl(e.target.value);
                                                                markChanged();
                                                            }}
                                                            className="w-full rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-3 text-[var(--foreground)]"
                                                            placeholder="https://…"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div>
                                                        <label className="mb-2 block text-xs font-bold text-[var(--neutral-600)]">
                                                            Secondary link — label
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={footerSecondaryLabel}
                                                            onChange={(e) => {
                                                                setFooterSecondaryLabel(e.target.value);
                                                                markChanged();
                                                            }}
                                                            className="w-full rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-3 text-[var(--foreground)]"
                                                            placeholder="e.g. Product docs"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-2 block text-xs font-bold text-[var(--neutral-600)]">
                                                            Secondary link — URL
                                                        </label>
                                                        <input
                                                            type="url"
                                                            value={footerSecondaryUrl}
                                                            onChange={(e) => {
                                                                setFooterSecondaryUrl(e.target.value);
                                                                markChanged();
                                                            }}
                                                            className="w-full rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-3 text-[var(--foreground)]"
                                                            placeholder="https://…"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="mb-2 block text-xs font-bold text-[var(--neutral-600)]">
                                                        Custom note (plain text, optional)
                                                    </label>
                                                    <textarea
                                                        value={footerCustomLine}
                                                        onChange={(e) => {
                                                            setFooterCustomLine(e.target.value);
                                                            markChanged();
                                                        }}
                                                        className="h-24 w-full resize-y rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-3 text-sm text-[var(--foreground)]"
                                                        placeholder="Short line for students, e.g. office hours or how to get help."
                                                        maxLength={500}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === "tutor" && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <TutorConfigEditor
                            label="Global AI Tutor Configuration"
                            helperText="Control how the AI assistant teaches across the entire course. Define its personality and domain expertise."
                            value={courseTutorDefaults}
                            onChange={(val) => { setCourseTutorDefaults(val); markChanged(); }}
                            referenceResources={referenceResources}
                            onReferenceResourcesChange={handleReferenceResourcesChange}
                        />
                    </div>
                )}

                {activeSection === "resources" && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <ResourceEditor
                            label="Student Reference Materials"
                            helperText="Add files, screenshots, or links that will be visible to all students throughout the course."
                            resources={studentResources}
                            onChange={handleStudentResourcesChange}
                            defaultStudentVisible={true}
                            defaultIncludeInTutorReference={false}
                        />
                    </div>
                )}

                {activeSection === "lessons" && (
                    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-[var(--neutral-200)] border border-[var(--neutral-300)] rounded-xl p-4 h-fit sticky top-[150px] shadow-sm">
                            <div className="flex items-center justify-between mb-4 px-2">
                                <h3 className="font-bold text-[var(--foreground)] uppercase text-xs tracking-widest">Curriculum</h3>
                                <button 
                                    onClick={addLesson} 
                                    className="text-[var(--accent-500)] hover:text-[var(--accent-600)] text-xs font-bold px-2 py-1 hover:bg-[var(--accent-100)] rounded transition-colors border border-[var(--accent-500)]"
                                >
                                    + ADD
                                </button>
                            </div>
                            <div className="space-y-1 overflow-y-auto max-h-[60vh] pr-1">
                                {lessons.map((lesson, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handleLessonChange(index)}
                                        className={`w-full text-left rounded-lg p-3 transition-all relative ${
                                            selectedLessonIndex === index 
                                            ? "bg-[var(--accent-500)] text-white shadow-md" 
                                            : "text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]"
                                        }`}
                                    >
                                        <div className="text-sm font-bold truncate">
                                            {index + 1}. {lesson.title || "Untitled Lesson"}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="min-w-0">
                            {selectedLesson ? (
                                <div className="bg-[var(--neutral-200)] border border-[var(--neutral-300)] rounded-xl p-8 shadow-sm">
                                    <div className="flex items-center justify-between mb-8 border-b border-[var(--neutral-300)] pb-6">
                                        <div className="min-w-0">
                                            <div className="text-[var(--accent-500)] font-bold text-[10px] uppercase tracking-widest mb-1">Editing Lesson {selectedLessonIndex + 1}</div>
                                            <h3 className="text-2xl font-bold text-[var(--foreground)] truncate">
                                                {selectedLesson.title || "Untitled Lesson"}
                                            </h3>
                                        </div>
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => window.open(`/courses/${editCourseId}/${selectedLessonIndex}`, '_blank')}
                                                className="p-2 text-[var(--neutral-500)] hover:text-[var(--foreground)] hover:bg-[var(--neutral-100)] rounded-md transition-colors"
                                                title="Preview"
                                            >
                                                <FiExternalLink size={18} />
                                            </button>
                                            <button 
                                                onClick={() => removeLesson(selectedLessonIndex)} 
                                                className="p-2 text-red-500 hover:bg-red-100 rounded-md transition-colors"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                <LessonComponent
                                    lesson={selectedLesson}
                                    index={selectedLessonIndex}
                                    onUpdate={updateLesson}
                                    onSetLesson={setLesson}
                                    onAddCard={addCard}
                                    onRemoveCard={removeCardFromLesson}
                                    onUpdateCard={updateCard}
                                    onAddDetail={addDetailToCard}
                                    onRemoveDetail={removeDetailFromCard}
                                    onUpdateDetail={updateCardDetail}
                                    onAddQuizId={(quizId) => addQuizIdToLesson(selectedLessonIndex, quizId)}
                                    onGenerateLesson={async (text) => {
                                        setIsGeneratingLesson(true);
                                        try {
                                            const response = await fetch('/api/courses/create', {
                                                method: 'PATCH',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${await getIdToken(auth.currentUser!)}`,
                                                },
                                                body: JSON.stringify({ text, quizSettings: courseQuizSettings }),
                                            });
                                            if (!response.ok) throw new Error('Failed to generate lesson');
                                            const data = await response.json();
                                            if (data) {
                                                setLesson(selectedLessonIndex, {
                                                    ...lessons[selectedLessonIndex],
                                                    title: data.title,
                                                    description: data.description,
                                                    content: data.content,
                                                    guide: data.guide || (data.content ? { body: data.content } : undefined),
                                                    tutorConfig: data.tutorConfig,
                                                    resources: data.resources || [],
                                                    baseProjectTemplate: data.baseProjectTemplate,
                                                    cardsToUnlock: data.cardsToUnlock || [],
                                                    quizIds: data.quizIds || lessons[selectedLessonIndex].quizIds || [],
                                                });
                                            }
                                        } catch (error) {
                                            console.error('Error generating lesson:', error);
                                        } finally {
                                            setIsGeneratingLesson(false);
                                        }
                                    }}
                                />
                                </div>
                            ) : (
                                <div className="bg-[var(--neutral-200)] border-2 border-dashed border-[var(--neutral-300)] rounded-xl p-20 text-center">
                                    <p className="text-[var(--neutral-500)]">Select a lesson to begin editing.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeSection === "quizzes" && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <section className="bg-[var(--neutral-200)] border border-[var(--neutral-300)] rounded-xl p-8 shadow-sm">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <FiCheckSquare className="text-[var(--accent-500)]" />
                                    Course Assessments
                                </h2>
                                <button
                                    onClick={() => setShowCourseQuizSettings(!showCourseQuizSettings)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all shadow-sm ${
                                        showCourseQuizSettings 
                                        ? "bg-[var(--neutral-100)] text-[var(--foreground)] border border-[var(--neutral-300)]" 
                                        : "bg-[var(--accent-500)] text-white hover:bg-[var(--accent-600)]"
                                    }`}
                                >
                                    {showCourseQuizSettings ? "Cancel" : "+ Generate Course Quiz"}
                                </button>
                            </div>
                            
                            {showCourseQuizSettings && (
                                <div className="mb-10 border border-[var(--neutral-300)] rounded-xl bg-[var(--neutral-100)] p-8 shadow-inner">
                                    <QuizSettingsComponent
                                        cards={lessons.flatMap(l => l.cardsToUnlock)}
                                        selectedCards={selectedCards}
                                        setSelectedCards={setSelectedCards}
                                            quizSettings={courseQuizSettings}
                                            setQuizSettings={setCourseQuizSettings}
                                            quizError={courseQuizError}
                                        setQuizError={setCourseQuizError}
                                        onCreate={async () => {
                                            if (courseQuizzes.some(q => q.status === 'creating')) {
                                                setCourseQuizError("A quiz is already being created for this course.");
                                                return;
                                            }
                                            const cardsToUse = lessons.flatMap((lesson, lessonIndex) =>
                                                lesson.cardsToUnlock.map((card, cardIndex) => {
                                                    const globalIndex = lessons.slice(0, lessonIndex).reduce((sum, l) => sum + l.cardsToUnlock.length, 0) + cardIndex;
                                                    return selectedCards[globalIndex] ? card : null;
                                                }).filter((c): c is NewCard => c !== null)
                                            );
                                            const newQuiz = { status: 'creating' as const };
                                            setCourseQuizzes([...courseQuizzes, newQuiz]);
                                            setShowCourseQuizSettings(false);
                                            try {
                                                const quizId = await createQuiz(cardsToUse, courseQuizSettings);
                                                const quiz = await getQuiz(quizId);
                                                setCourseQuizzes(prev => {
                                                    const updated = [...prev];
                                                    updated[updated.length - 1] = { id: quizId, status: 'created' as const, title: quiz?.title };
                                                    return updated;
                                                });
                                                setCourseQuizIds([...courseQuizIds, quizId]);
                                                markChanged();
                                            } catch (error) {
                                                console.error("Error creating course quiz:", error);
                                                setCourseQuizError("Failed to create quiz");
                                                setCourseQuizzes(prev => prev.slice(0, -1));
                                                setShowCourseQuizSettings(true);
                                            }
                                        }}
                                        isCreating={false}
                                    />
                                </div>
                            )}

                            <div className="space-y-4">
                                {courseQuizzes.map((quiz, index) => (
                                    <div key={index} className="flex justify-between items-center p-5 bg-[var(--neutral-100)] border border-[var(--neutral-300)] rounded-xl group">
                                        <div className="font-bold text-[var(--foreground)]">
                                            {quiz.title || `Course Quiz ${index + 1}`}
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => window.open(`/quiz/${quiz.id}`, '_blank')}
                                                className="px-4 py-2 text-xs font-bold bg-[var(--neutral-200)] hover:bg-white rounded-lg transition-colors border border-[var(--neutral-300)]"
                                            >
                                                Preview
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm("Remove this quiz from the course?")) {
                                                        setCourseQuizzes(prev => prev.filter((_, i) => i !== index));
                                                        setCourseQuizIds(prev => prev.filter((_, i) => i !== index));
                                                        markChanged();
                                                    }
                                                }}
                                                className="p-2 text-red-400 hover:text-red-600 transition-colors"
                                            >
                                                <FiX size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {activeSection === "settings" && (
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <section className="bg-[var(--neutral-200)] border border-[var(--neutral-300)] rounded-xl p-8 shadow-sm">
                            <h2 className="text-xl font-bold mb-8 flex items-center gap-2 uppercase text-xs tracking-widest text-[var(--neutral-500)]">
                                <FiSettingsIcon size={16} />
                                Course Management
                            </h2>
                            <div className="space-y-10">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--neutral-700)] mb-4 uppercase tracking-widest text-[10px]">Privacy & Visibility</label>
                                    <div 
                                        onClick={() => { setIsPublic(!isPublic); markChanged(); }}
                                        className={`flex items-center gap-6 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                                            isPublic 
                                            ? "border-[var(--accent-500)] bg-[var(--accent-100)]" 
                                            : "border-[var(--neutral-300)] bg-[var(--neutral-100)] hover:border-[var(--neutral-400)] shadow-sm"
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${isPublic ? "bg-[var(--accent-500)] text-white" : "bg-[var(--neutral-300)] text-[var(--neutral-600)]"}`}>
                                            <FiExternalLink size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-bold text-lg ${isPublic ? "text-[var(--accent-700)]" : "text-[var(--foreground)]"}`}>Publicly Visible</p>
                                            <p className="text-sm text-[var(--neutral-600)] font-medium mt-1">Allow anyone with the link to see and take this course.</p>
                                        </div>
                                        <div className="ml-4">
                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${isPublic ? "border-[var(--accent-500)]" : "border-[var(--neutral-400)]"}`}>
                                                {isPublic && <div className="w-4 h-4 rounded-full bg-[var(--accent-500)] animate-in zoom-in-50" />}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[var(--neutral-700)] mb-3 uppercase tracking-widest text-[10px]">Discovery Category</label>
                                    <select
                                        value={courseCategory}
                                        onChange={(e) => { setCourseCategory(e.target.value as CourseCategory); markChanged(); }}
                                        className="w-full p-4 border border-[var(--neutral-300)] rounded-lg bg-[var(--neutral-100)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] transition-all font-bold shadow-sm"
                                    >
                                        <option value="">Select a category</option>
                                        <option value="math">Math</option>
                                        <option value="science">Science</option>
                                        <option value="history">History</option>
                                        <option value="health">Health</option>
                                        <option value="business">Business</option>
                                        <option value="life skills">Life Skills</option>
                                        <option value="social studies">Social Studies</option>
                                        <option value="computer science">Computer Science</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[var(--neutral-700)] mb-3 uppercase tracking-widest text-[10px]">Portfolio report — quiz requirements</label>
                                    <p className="text-sm text-[var(--neutral-600)] mb-4">
                                        By default, quizzes do not block the generated portfolio report. Uncheck &quot;Optional for report&quot; to require a minimum score before the report unlocks.
                                    </p>
                                    {allQuizIdsForPolicy.length === 0 ? (
                                        <p className="text-sm text-[var(--neutral-500)]">No quizzes attached to this course yet.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {allQuizIdsForPolicy.map((qid) => {
                                                const entry = quizReportPolicy[qid] || { optional: true };
                                                const isOptional = entry.optional !== false;
                                                return (
                                                    <div key={qid} className="p-4 rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] space-y-3">
                                                        <div className="font-semibold text-[var(--foreground)]">{quizPolicyTitles[qid] || qid}</div>
                                                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={isOptional}
                                                                onChange={() => {
                                                                    setQuizReportPolicy((prev) => {
                                                                        const cur = prev[qid] || { optional: true };
                                                                        if (cur.optional !== false) {
                                                                            return { ...prev, [qid]: { optional: false, minPercent: cur.minPercent ?? 70 } };
                                                                        }
                                                                        return { ...prev, [qid]: { optional: true } };
                                                                    });
                                                                    markChanged();
                                                                }}
                                                                className="rounded border-[var(--neutral-300)]"
                                                            />
                                                            <span>Optional for report (does not block unlock)</span>
                                                        </label>
                                                        {!isOptional && (
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <span className="text-[var(--neutral-600)]">Minimum score (%)</span>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={100}
                                                                    value={entry.minPercent ?? 70}
                                                                    onChange={(e) => {
                                                                        const v = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                                                                        setQuizReportPolicy((prev) => ({
                                                                            ...prev,
                                                                            [qid]: { optional: false, minPercent: v },
                                                                        }));
                                                                        markChanged();
                                                                    }}
                                                                    className="w-20 p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-200)]"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </main>

            {/* Fast Create Popup */}
            <FastCreatePopup
                isOpen={isFastCreatePopupOpen}
                onClose={() => setIsFastCreatePopupOpen(false)}
                title="Fast Create Course"
                placeholder="Paste the text content that will be processed into a course with lessons"
                 onGenerate={async (text, options, onUpdate) => {
                     setIsGeneratingCourse(true);
                     try {
                         await streamGenerateCourse(
                             text,
                             onUpdate,
                             setCourseTitle,
                             setCourseDescription,
                             setLessons,
                             setCollapsedCards,
                             setCourseQuizIds,
                             setCourseQuizzes,
                             options?.generateFinalQuiz ? options.finalQuizSettings : undefined,
                             options?.generateLessonQuizzes ? options.lessonQuizSettings : undefined
                         );
                         markChanged();
                     } catch (error) {
                         console.error('Error generating course:', error);
                         onUpdate('Error generating course');
                     } finally {
                         setIsGeneratingCourse(false);
                     }
                 }}
                isGenerating={isGeneratingCourse}
                mode="course"
            />
        </div>
    );
}
