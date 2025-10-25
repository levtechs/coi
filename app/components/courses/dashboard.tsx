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
    const [expanded, setExpanded] = useState<Record<string, boolean>>({
        math: true,
        science: true,
        history: true,
        health: true,
        business: true,
        life_skills: true,
        social_studies: true,
        computer_science: true,
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

    if (loading) {
        return <LoadingComponent small={true} />;
    }

    // Group courses by category
    const grouped: { [key: string]: Course[] } = {
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

    courses.forEach((course) => {
        const cat = course.category?.toLowerCase();
        if (cat === "math") grouped.math.push(course);
        else if (cat === "science") grouped.science.push(course);
        else if (cat === "history") grouped.history.push(course);
        else if (cat === "health") grouped.health.push(course);
        else if (cat === "business") grouped.business.push(course);
        else if (cat === "life skills") grouped.life_skills.push(course);
        else if (cat === "social studies") grouped.social_studies.push(course);
        else if (cat === "computer science") grouped.computer_science.push(course);
        else grouped.other.push(course);
    });

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

    return (
        <div className="mt-8 space-y-4">
            {categories.map(({ name, key }) => (
                grouped[key].length > 0 && (
                    <div key={key} className="flex flex-col">
                        <div
                            onClick={() => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))}
                            className="group flex items-center gap-2 cursor-pointer mb-2"
                        >
                            {expanded[key] ? (
                                <FiChevronDown className="text-[var(--neutral-500)]" size={24} />
                            ) : (
                                <FiChevronRight className="text-[var(--neutral-500)]" size={24} />
                            )}
                            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                                {name}
                            </h2>
                        </div>
                        {expanded[key] && (
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