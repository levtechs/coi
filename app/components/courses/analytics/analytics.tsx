"use client";

import { useState, useEffect } from "react";
import { FiArrowLeft, FiSettings, FiCopy, FiTrash } from "react-icons/fi";
import { getCourse, fetchAnalytics } from "../../../views/courses";
import { createCourseInvitation, deleteInvitation } from "../../../views/invite";
import { Course } from "../../../../lib/types";
import Button from "../../button";

interface AnalyticsProps {
    courseId: string;
}

const Analytics = ({ courseId }: AnalyticsProps) => {
    const [course, setCourse] = useState<Course | null>(null);
    const [analyticsData, setAnalyticsData] = useState({
        totalUsers: 0,
        invitations: [] as { token: string; createdAt: string; createdBy?: string; acceptedBy: { id: string; email: string; displayName: string; actions?: number; dailyActions?: number; weeklyActions?: number; projectIds?: string[]; }[]; }[],
        users: [] as { id: string; email: string; progress: { [lessonId: string]: number } }[],
    });
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [showInvitePanel, setShowInvitePanel] = useState(false);
    const [showLinkPanel, setShowLinkPanel] = useState(false);
    const [panelTitle, setPanelTitle] = useState("");
    const [panelMessage, setPanelMessage] = useState("");
    const [panelUrl, setPanelUrl] = useState("");
    const [copied, setCopied] = useState(false);

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
                              <div className="flex justify-between items-center mb-4">
                                  <h3 className="text-xl font-semibold text-[var(--foreground)]">Invitations</h3>
                                  <span
                                      className="underline cursor-pointer text-[var(--accent-500)] hover:text-[var(--accent-600)]"
                                      onClick={() => setShowInvitePanel(true)}
                                  >
                                      Create Invitation
                                  </span>
                              </div>
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
                                                  <div className="flex gap-2">
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
                                                      <button
                                                          onClick={async () => {
                                                              if (confirm('Are you sure you want to delete this invitation?')) {
                                                                  try {
                                                                      await deleteInvitation(invitation.token);
                                                                      // Refetch analytics
                                                                      const data = await fetchAnalytics(courseId);
                                                                      if (data) {
                                                                          setAnalyticsData(data);
                                                                      }
                                                                  } catch (error) {
                                                                      console.error("Failed to delete invitation:", error);
                                                                      alert("Failed to delete invitation");
                                                                  }
                                                              }
                                                          }}
                                                          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                                                      >
                                                          <FiTrash size={16} />
                                                      </button>
                                                  </div>
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

                          <div className="bg-[var(--neutral-200)] p-6 rounded-lg shadow mt-8">
                              <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">Users</h3>
                              {analyticsData.users.length === 0 ? (
                                  <p className="text-[var(--neutral-600)]">No users have joined this course yet.</p>
                              ) : (
                                  <div className="overflow-x-auto">
                                      <table className="min-w-full table-auto">
                                          <thead>
                                              <tr className="bg-[var(--neutral-300)]">
                                                  <th className="px-4 py-2 text-left text-[var(--foreground)]">User ID</th>
                                                  <th className="px-4 py-2 text-left text-[var(--foreground)]">Email</th>
                                                  {course?.lessons.map((lesson) => (
                                                      <th key={lesson.id} className="px-4 py-2 text-left text-[var(--foreground)]">{lesson.title}</th>
                                                  ))}
                                              </tr>
                                          </thead>
                                          <tbody>
                                              {analyticsData.users.map((user) => (
                                                  <tr key={user.id} className="border-t border-[var(--neutral-300)]">
                                                      <td className="px-4 py-2 text-[var(--foreground)]">{user.id}</td>
                                                      <td className="px-4 py-2 text-[var(--foreground)]">{user.email}</td>
                                                      {course?.lessons.map((lesson) => (
                                                          <td key={lesson.id} className="px-4 py-2 text-[var(--foreground)]">
                                                              {user.progress[lesson.id] || 0}%
                                                          </td>
                                                      ))}
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                              )}
                          </div>
                       </>
                   )}

                  {showInvitePanel && (
                     <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/50">
                         <div className="bg-[var(--neutral-100)] p-6 rounded-lg shadow-lg w-96 flex flex-col gap-4">
                             <h2 className="text-[var(--foreground)] font-semibold text-xl">Create Invitation</h2>
                             <p className="text-[var(--foreground)]">Create an invite link for this private course:</p>
                             <Button
                                 color="var(--accent-500)"
                                 onClick={async () => {
                                     try {
                                         const result = await createCourseInvitation(courseId);
                                         setPanelTitle("Invite Link Created");
                                         setPanelMessage("Share this invite link:");
                                         setPanelUrl(`${window.location.origin}/i?token=${result.token}`);
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
         </div>
     );
 };

export default Analytics;