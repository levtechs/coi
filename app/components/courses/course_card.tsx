"use client";

import React from "react";
import { FiLock } from "react-icons/fi";
import { Course } from "@/lib/types";

type CourseCardProps = {
    course: Course;
};

export default function CourseCard({ course }: CourseCardProps) {
    return (
        <div
            className="relative border border-[var(--neutral-300)] rounded-lg p-6 bg-[var(--neutral-200)] shadow hover:shadow-md transition cursor-pointer group"
            onClick={() => window.location.assign(`/courses/${course.id}`)}
        >
            <h3 className="text-[var(--foreground)] font-semibold text-xl">{course.title}</h3>

            {/* Lock Icon for private courses */}
            {!course.public && (
                <div className="absolute top-2 right-2">
                    <FiLock className="text-[var(--neutral-700)]" size={20} />
                </div>
            )}
        </div>
    );
}