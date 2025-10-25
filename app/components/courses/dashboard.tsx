"use client";

import { useState, useEffect } from "react";
import { FiChevronRight, FiChevronDown } from "react-icons/fi";
import { useAuth } from "@/lib/AuthContext";
import { getCourses } from "@/app/views/courses";
import { Course } from "@/lib/types";
import LoadingComponent from "../loading";
import CourseCard from "./course_card";

const CoursesDashboard = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [mathExpanded, setMathExpanded] = useState(true);
    const [scienceExpanded, setScienceExpanded] = useState(true);
    const [historyExpanded, setHistoryExpanded] = useState(true);

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

    if (loading) {
        return <LoadingComponent small={true} />;
    }

    // Group courses by category
    const grouped: { [key: string]: Course[] } = {
        math: [],
        science: [],
        history: [],
        other: [],
    };

    courses.forEach((course) => {
        const cat = course.category?.toLowerCase();
        if (cat === "math") grouped.math.push(course);
        else if (cat === "science") grouped.science.push(course);
        else if (cat === "history") grouped.history.push(course);
        else grouped.other.push(course);
    });

    const categories = [
        { name: "Math", key: "math", expanded: mathExpanded, setExpanded: setMathExpanded },
        { name: "Science", key: "science", expanded: scienceExpanded, setExpanded: setScienceExpanded },
        { name: "History", key: "history", expanded: historyExpanded, setExpanded: setHistoryExpanded },
    ];

    return (
        <div className="mt-8 space-y-4">
            {categories.map(({ name, key, expanded, setExpanded }) => (
                grouped[key].length > 0 && (
                    <div key={key} className="flex flex-col">
                        <div
                            onClick={() => setExpanded(!expanded)}
                            className="group flex items-center gap-2 cursor-pointer mb-2"
                        >
                            {expanded ? (
                                <FiChevronDown className="text-[var(--neutral-500)]" size={24} />
                            ) : (
                                <FiChevronRight className="text-[var(--neutral-500)]" size={24} />
                            )}
                            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                                {name}
                            </h2>
                        </div>
                        {expanded && (
                            <div className="ml-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {grouped[key].map((course) => (
                                    <CourseCard key={course.id} course={course} />
                                ))}
                            </div>
                        )}
                    </div>
                )
            ))}
            {grouped.other.length > 0 && (
                <div className="flex flex-col">
                    <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                        Other
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {grouped.other.map((course) => (
                            <CourseCard key={course.id} course={course} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoursesDashboard;