"use client";

import { useState, useEffect, useMemo } from "react";
import { FiChevronRight, FiChevronDown } from "react-icons/fi";
import { useAuth } from "@/lib/AuthContext";
import { getCourses } from "@/app/views/courses";
import { Course } from "@/lib/types/course";
import LoadingComponent from "../loading";
import CourseCard from "./course_card";

const CoursesDashboard = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({
        math: true,
        science: true,
        history: true,
        health: true,
        business: true,
        life_skills: true,
        social_studies: true,
        computer_science: true,
        other: true,
    });

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

    const grouped = useMemo(() => {
        const g: Record<string, Course[]> = {
            math: [],
            science: [],
            history: [],
            health: [],
            business: [],
            life_skills: [],
            social_studies: [],
            computer_science: [],
            other: [],
        };
        for (const course of uniqueCourses) {
            const cat = course.category?.toLowerCase();
            if (cat === "math") g.math.push(course);
            else if (cat === "science") g.science.push(course);
            else if (cat === "history") g.history.push(course);
            else if (cat === "health") g.health.push(course);
            else if (cat === "business") g.business.push(course);
            else if (cat === "life skills") g.life_skills.push(course);
            else if (cat === "social studies") g.social_studies.push(course);
            else if (cat === "computer science") g.computer_science.push(course);
            else g.other.push(course);
        }
        return g;
    }, [uniqueCourses]);

    const categories = [
        { name: "Math", key: "math" },
        { name: "Science", key: "science" },
        { name: "History", key: "history" },
        { name: "Health", key: "health" },
        { name: "Business", key: "business" },
        { name: "Life Skills", key: "life_skills" },
        { name: "Social Studies", key: "social_studies" },
        { name: "Computer Science", key: "computer_science" },
    ];

    if (loading) {
        return <LoadingComponent small={true} />;
    }

    return (
        <div className="mx-auto mt-6 max-w-6xl space-y-10">
            {categories.map(({ name, key }) => (
                grouped[key].length > 0 && (
                    <section key={key} className="space-y-4">
                        <button
                            type="button"
                            onClick={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
                            className="group flex w-full items-center gap-2 text-left"
                        >
                            {expanded[key] ? (
                                <FiChevronDown className="shrink-0 text-[var(--neutral-500)]" size={22} />
                            ) : (
                                <FiChevronRight className="shrink-0 text-[var(--neutral-500)]" size={22} />
                            )}
                            <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)] md:text-2xl">
                                {name}
                            </h2>
                            <span className="rounded-full bg-[var(--neutral-300)] px-2.5 py-0.5 text-xs font-medium text-[var(--neutral-700)]">
                                {grouped[key].length}
                            </span>
                        </button>
                        {expanded[key] && (
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                {grouped[key].map((course) => (
                                    <CourseCard key={course.id} course={course} />
                                ))}
                            </div>
                        )}
                    </section>
                )
            ))}
            {grouped.other.length > 0 && (
                <section className="space-y-4">
                    <button
                        type="button"
                        onClick={() => setExpanded((prev) => ({ ...prev, other: !prev.other }))}
                        className="group flex w-full items-center gap-2 text-left"
                    >
                        {expanded.other ? (
                            <FiChevronDown className="shrink-0 text-[var(--neutral-500)]" size={22} />
                        ) : (
                            <FiChevronRight className="shrink-0 text-[var(--neutral-500)]" size={22} />
                        )}
                        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)] md:text-2xl">
                            Other
                        </h2>
                        <span className="rounded-full bg-[var(--neutral-300)] px-2.5 py-0.5 text-xs font-medium text-[var(--neutral-700)]">
                            {grouped.other.length}
                        </span>
                    </button>
                    {expanded.other && (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                            {grouped.other.map((course) => (
                                <CourseCard key={course.id} course={course} />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

export default CoursesDashboard;
