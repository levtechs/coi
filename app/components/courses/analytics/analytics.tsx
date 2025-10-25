"use client";

import { useState, useEffect } from "react";
import { FiArrowLeft, FiSettings } from "react-icons/fi";
import { getCourse, fetchAnalytics } from "../../../views/courses";
import { Course } from "../../../../lib/types";

interface AnalyticsProps {
    courseId: string;
}

const Analytics = ({ courseId }: AnalyticsProps) => {
    const [course, setCourse] = useState<Course | null>(null);
    const [analyticsData, setAnalyticsData] = useState({
        totalUsers: 0,
        invitations: [] as { token: string; createdAt: string; createdBy?: string; acceptedBy: { id: string; email: string; displayName: string; actions?: number; dailyActions?: number; weeklyActions?: number; projectIds?: string[]; }[]; }[],
    });
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const result = await getCourse(courseId);
                if (result) {
                    setCourse(result.course);
                }
            } catch (error) {
                console.error("Failed to fetch course:", error);
            }
        };
        fetchCourse();
    }, [courseId]);

    useEffect(() => {
        const fetchAnalyticsData = async () => {
            try {
                const data = await fetchAnalytics(courseId);
                if (data) {
                    setAnalyticsData(data);
                } else {
                    console.error("Failed to fetch analytics");
                    // Keep placeholder data
                }
            } catch (error) {
                console.error("Error fetching analytics:", error);
                // Keep placeholder data
            }
        };

        if (courseId) {
            fetchAnalyticsData();
        }
    }, [courseId]);

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
            <div className="max-w-5xl mx-auto bg-[var(--neutral-100)] shadow-lg rounded-lg p-8">
                <div className="flex items-center justify-between mb-8">
                    <FiArrowLeft
                        size={32}
                        className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                        onClick={() => window.location.href = `/courses/${courseId}`}
                    />
                    <div className="text-center">
                        <h1 className="text-3xl font-extrabold text-[var(--foreground)]">
                            Course Analytics
                        </h1>
                        {course && (
                            <div className="mt-2">
                                <p className="text-lg text-[var(--foreground)]">{course.title}</p>
                                <p className="text-sm text-[var(--neutral-600)]">{course.lessons.length} lessons</p>
                            </div>
                        )}
                    </div>
                    <FiSettings
                        size={32}
                        className="text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer"
                        onClick={() => window.location.href = `/courses?edit=${course?.id}`}
                    />
                </div>

                 {course?.public ? (
                     <div className="bg-[var(--neutral-200)] p-6 rounded-lg shadow text-center">
                         <p className="text-[var(--neutral-600)]">Analytics are not yet available for public courses.</p>
                     </div>
                 ) : (
                     <>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                             <div className="bg-[var(--neutral-200)] p-6 rounded-lg shadow">
                                 <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Total Users</h3>
                                 <p className="text-3xl font-bold text-[var(--accent-500)]">{analyticsData.totalUsers}</p>
                                 <p className="text-sm text-[var(--neutral-600)]">Users with access to this course</p>
                             </div>
                         </div>

                         <div className="bg-[var(--neutral-200)] p-6 rounded-lg shadow">
                             <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">Invitations</h3>
                             {analyticsData.invitations.length === 0 ? (
                                 <p className="text-[var(--neutral-600)]">No invitations created yet.</p>
                             ) : (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     {analyticsData.invitations.map((invitation, index) => (
                                         <div key={index} className="border border-[var(--neutral-300)] rounded-lg p-4">
                                             <div className="flex justify-between items-start mb-2">
                                                 <div>
                                                     <p className="text-[var(--foreground)] font-medium">Token: {invitation.token}</p>
                                                     <p className="text-sm text-[var(--neutral-600)]">Created: {new Date(invitation.createdAt).toLocaleDateString()}</p>
                                                 </div>
                                                 <button
                                                     onClick={() => {
                                                         navigator.clipboard.writeText(`${window.location.origin}/i?token=${invitation.token}`);
                                                         setCopiedToken(invitation.token);
                                                         setTimeout(() => setCopiedToken(null), 2000);
                                                     }}
                                                     className="bg-[var(--accent-500)] text-white px-3 py-1 rounded hover:bg-[var(--accent-600)]"
                                                 >
                                                     {copiedToken === invitation.token ? 'Copied' : 'Copy Link'}
                                                 </button>
                                             </div>
                                             <div>
                                                 <p className="text-sm text-[var(--foreground)] mb-1">Accepted by ({invitation.acceptedBy.length}):</p>
                                                 {invitation.acceptedBy.length === 0 ? (
                                                     <p className="text-sm text-[var(--neutral-600)]">None</p>
                                                 ) : (
                                                     <ul className="text-sm text-[var(--neutral-600)]">
                                                         {invitation.acceptedBy.map((user, idx) => (
                                                             <li key={idx}>{user.email}</li>
                                                         ))}
                                                     </ul>
                                                 )}
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                     </>
                 )}
            </div>
        </div>
    );
};

export default Analytics;