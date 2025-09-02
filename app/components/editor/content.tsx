import React from "react"
import ReactMarkdown from "react-markdown"
import { Project } from "@/lib/types"
import { ModalContents } from "./types"
import { FiEdit2 } from "react-icons/fi"

// Defines a structured content node which can be nested
interface StructuredContent {
    title?: string
    details: (string | StructuredContent)[]
}

interface StructuredContentProps {
    data: StructuredContent
    level?: number
}

const renderStructuredContent = ({ data, level = 2 }: StructuredContentProps) => {
    // Correctly handles a non-existent or null data object
    if (!data) {
        return <p className="text-[var(--neutral-500)]">(No content)</p>
    }

    return (
        <div>
            {data.title && React.createElement(
                `h${level}`,
                {
                    className: `text-[var(--foreground)] text-${2 + (5 - level)}xl font-semibold mb-2 mt-4`
                },
                data.title
            )}
            {Array.isArray(data.details) && data.details.map((item: string | StructuredContent, index: number) => {
                if (typeof item === "string") {
                    return (
                        <div key={index} className="mb-2 prose prose-sm max-w-none">
                            <ReactMarkdown>{item}</ReactMarkdown>
                        </div>
                    )
                }
                if (typeof item === "object" && item !== null) {
                    return (
                        <div key={index} className="ml-4">
                            {renderStructuredContent({ data: item, level: level < 5 ? level + 1 : 5 })}
                        </div>
                    )
                }
                return null
            })}
        </div>
    )
}

interface ContentPanelProps {
    project: Project
    user: { uid: string } | null
    setProject: (updater: (prev: Project | null) => Project | null) => void
    setContent: (projectId: string, newContent: string) => Promise<void>
    setModalContents: (newContent: ModalContents) => void
}

const ContentPanel = ({ project, user, setProject, setContent, setModalContents }: ContentPanelProps) => {
    const content = project.content as unknown as StructuredContent;
    
    return (
        <div className="flex-1 min-h-[75vh]">
            <div className="relative group p-3 rounded-md text-[var(--foreground)] whitespace-pre-wrap h-full">
                {/* Edit Icon */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                    <FiEdit2
                        onClick={() => setModalContents({
                            isOpen: true,
                            title: "New content",
                            initialValue: "",
                            placeholder: "Enter new content",
                            onSubmit: async (input) => {
                                if (!user) return

                                await setContent(project.id, input)
                                setProject(prev =>
                                    prev ? { ...prev, content: input } : prev
                                )
                            }
                        })}
                        className="text-[var(--accent-500)] cursor-pointer hover:text-[var(--accent-600)] text-xl"
                    />
                </div>

                {/* Render content */}
                {renderStructuredContent({ data: content })}
            </div>
        </div>
    )
}

export default ContentPanel
