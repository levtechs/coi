"use client";

import { useState, useEffect, useMemo } from "react";
import { FiSearch } from "react-icons/fi";
import { useAuth } from "@/lib/AuthContext";
import { getCourses } from "@/app/views/courses";
import { Course, type CourseCategory } from "@/lib/types/course";
import LoadingComponent from "../loading";
import CourseCard from "./course_card";

const CATEGORY_FILTER_VALUES: (CourseCategory | "__uncategorized__")[] = [
    "__uncategorized__",
    "math",
    "science",
    "history",
    "health",
    "business",
    "life skills",
    "social studies",
    "computer science",
    "other",
];

function categoryFilterPillLabel(value: CourseCategory | "__uncategorized__"): string {
    if (value === "__uncategorized__") return "Uncategorized";
    return categoryLabel(value);
}

function categoryLabel(category: Course["category"]): string {
    if (!category) return "Uncategorized";
    return category
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

function matchesCategoryFilter(course: Course, filter: string): boolean {
    if (filter === "") return true;
    if (filter === "__uncategorized__") return !course.category;
    return course.category === filter;
}

function matchesVisibilityFilter(course: Course, filter: "all" | "public" | "private"): boolean {
    if (filter === "all") return true;
    if (filter === "public") return course.public === true;
    return course.public !== true;
}

const filterPillBase =
    "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--neutral-100)]";
const filterPillInactive =
    "border-[var(--neutral-300)] bg-[var(--neutral-200)] text-[var(--foreground)] hover:border-[var(--accent-400)]/40 hover:bg-[var(--neutral-300)]/70";
const filterPillActive = "border-[var(--accent-500)] bg-[var(--accent-500)] text-white shadow-sm";

const CoursesDashboard = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("");
    const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");

    useEffect(() => {
        const fetchCourses = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const fetchedCourses = await getCourses();
                setCourses(fetchedCourses);
            } catch (error) {
                console.error("Failed to fetch courses:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [user]);

    const uniqueCourses = useMemo(() => {
        const byId = new Map<string, Course>();
        for (const c of courses) {
            if (!byId.has(c.id)) byId.set(c.id, c);
        }
        return [...byId.values()];
    }, [courses]);

    const filteredCourses = useMemo(() => {
        let list = uniqueCourses.filter(
            (course) =>
                matchesCategoryFilter(course, categoryFilter) &&
                matchesVisibilityFilter(course, visibilityFilter),
        );
        const q = searchQuery.trim().toLowerCase();
        if (q) {
            list = list.filter((course) => {
                const tag = categoryLabel(course.category).toLowerCase();
                const title = (course.title || "").toLowerCase();
                const desc = (course.description || "").toLowerCase();
                const vis = course.public === true ? "public" : "private";
                return title.includes(q) || desc.includes(q) || tag.includes(q) || vis.includes(q);
            });
        }
        return [...list].sort((a, b) =>
            (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" }),
        );
    }, [uniqueCourses, searchQuery, categoryFilter, visibilityFilter]);

    const hasActiveFilters =
        categoryFilter !== "" || visibilityFilter !== "all" || searchQuery.trim() !== "";

    if (loading) {
        return <LoadingComponent small={true} />;
    }

    return (
        <div className="mx-auto mt-6 max-w-6xl">
            <div className="relative mb-5">
                <FiSearch
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--neutral-500)]"
                    aria-hidden
                />
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, description, category, or public/private…"
                    aria-label="Search courses"
                    className="w-full rounded-xl border border-[var(--neutral-300)] bg-[var(--neutral-200)] py-3.5 pl-12 pr-4 text-[var(--foreground)] shadow-sm placeholder:text-[var(--neutral-500)] focus:border-[var(--accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)]/25"
                />
            </div>

            <div className="mb-8 space-y-6">
                <div>
                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--neutral-600)]">
                        Category
                    </p>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
                        <button
                            type="button"
                            onClick={() => setCategoryFilter("")}
                            className={`${filterPillBase} ${categoryFilter === "" ? filterPillActive : filterPillInactive}`}
                            aria-pressed={categoryFilter === ""}
                        >
                            All
                        </button>
                        {CATEGORY_FILTER_VALUES.map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setCategoryFilter(value)}
                                className={`${filterPillBase} ${categoryFilter === value ? filterPillActive : filterPillInactive}`}
                                aria-pressed={categoryFilter === value}
                            >
                                {categoryFilterPillLabel(value)}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--neutral-600)]">
                        Visibility
                    </p>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by visibility">
                        {(
                            [
                                { value: "all" as const, label: "All" },
                                { value: "public" as const, label: "Public" },
                                { value: "private" as const, label: "Private" },
                            ] as const
                        ).map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setVisibilityFilter(value)}
                                className={`${filterPillBase} ${visibilityFilter === value ? filterPillActive : filterPillInactive}`}
                                aria-pressed={visibilityFilter === value}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {uniqueCourses.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--neutral-300)] bg-[var(--neutral-200)]/80 py-16 text-center text-sm text-[var(--neutral-600)]">
                    No courses yet. Create one to get started.
                </p>
            ) : filteredCourses.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--neutral-300)] bg-[var(--neutral-200)]/80 py-16 text-center text-sm text-[var(--neutral-600)]">
                    {hasActiveFilters
                        ? "No courses match your search or filters. Try adjusting them."
                        : "No courses to show."}
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredCourses.map((course) => (
                        <CourseCard key={course.id} course={course} categoryTag={categoryLabel(course.category)} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CoursesDashboard;
