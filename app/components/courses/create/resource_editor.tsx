"use client";

import { useMemo, useRef, useState } from "react";
import { FiEye, FiFileText, FiLink, FiUpload } from "react-icons/fi";
import { CourseResource, CourseResourceKind } from "@/lib/types/course";
import { uploadCourseResourceFile } from "@/app/views/uploads";

interface ResourceEditorProps {
  label: string;
  resources: CourseResource[];
  onChange: (resources: CourseResource[]) => void;
  helperText?: string;
  defaultIncludeInTutorReference?: boolean;
  defaultStudentVisible?: boolean;
  allowedExtensions?: string;
}

const resourceKinds: CourseResourceKind[] = ["image", "pdf", "video", "link", "markdown"];

export default function ResourceEditor({ 
  label, 
  resources, 
  onChange, 
  helperText,
  defaultIncludeInTutorReference,
  defaultStudentVisible = true,
  allowedExtensions = "image/*,application/pdf,text/plain,text/markdown,.md"
}: ResourceEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleResources = useMemo(() => resources, [resources]);

  const updateResource = (index: number, updates: Partial<CourseResource>) => {
    const next = [...resources];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const addManualResource = () => {
    onChange([
      ...resources,
      {
        id: crypto.randomUUID(),
        title: "",
        url: "",
        kind: "link",
        caption: "",
        includeInTutorReference: !!defaultIncludeInTutorReference,
        studentVisible: defaultStudentVisible,
      },
    ]);
  };

  const removeResource = (index: number) => {
    onChange(resources.filter((_, resourceIndex) => resourceIndex !== index));
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploaded = await Promise.all(files.map((file) => uploadCourseResourceFile(file, 'course-resources', {
        includeInTutorReference: defaultIncludeInTutorReference ?? (inferCourseResourceKind(file) === 'markdown'),
        studentVisible: defaultStudentVisible,
      })));
      onChange([...resources, ...uploaded]);
    } catch (error) {
      console.error("Failed to upload course resources:", error);
      alert("Failed to upload one or more resources.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  function inferCourseResourceKind(file: File): CourseResource['kind'] {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.name.toLowerCase().endsWith('.md') || file.type === 'text/markdown') return 'markdown';
    return 'link';
  }

  return (
    <div className="mb-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">{label}</label>
          {helperText && (
            <p className="text-xs text-[var(--neutral-600)] max-w-2xl">{helperText}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            multiple
            accept={allowedExtensions}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--accent-500)] px-3 py-2 text-sm text-white hover:bg-[var(--accent-600)] transition-colors disabled:opacity-60"
          >
            <FiUpload className="w-4 h-4" />
            {isUploading ? "Uploading..." : "Upload Files"}
          </button>
          <button
            type="button"
            onClick={addManualResource}
            className="rounded-md border border-[var(--neutral-300)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--neutral-200)] transition-colors"
          >
            Add Link
          </button>
        </div>
      </div>

      {visibleResources.length === 0 && (
        <p className="text-sm text-[var(--neutral-600)]">No resources added yet.</p>
      )}

      <div className="space-y-4">
        {visibleResources.map((resource, index) => (
          <div key={resource.id || `${resource.title}-${index}`} className="border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-200)] p-3">
            <div className="flex justify-between items-center mb-3 gap-4">
              <div>
                <p className="font-medium text-[var(--foreground)]">{resource.title || `Resource ${index + 1}`}</p>
                <p className="text-xs text-[var(--neutral-600)] mt-1">
                  {resource.kind}
                  {resource.sourceFileName ? ` • ${resource.sourceFileName}` : ""}
                  {resource.includeInTutorReference ? " • tutor reference" : ""}
                  {resource.studentVisible === false ? " • tutor-only" : " • visible to students"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {resource.url && (
                  <button type="button" onClick={() => window.open(resource.url, "_blank")} className="p-2 rounded-md border border-[var(--neutral-300)] text-[var(--foreground)] hover:bg-[var(--neutral-100)] transition-colors" title="Open resource">
                    {resource.kind === "markdown" ? <FiFileText className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                )}
                <button type="button" onClick={() => removeResource(index)} className="text-sm text-red-500 hover:text-red-700">
                  Remove
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                value={resource.title}
                onChange={(e) => updateResource(index, { title: e.target.value })}
                className="w-full p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] text-[var(--foreground)]"
                placeholder="Resource title"
              />
              <select
                value={resource.kind}
                onChange={(e) => updateResource(index, { kind: e.target.value as CourseResourceKind })}
                className="w-full p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] text-[var(--foreground)]"
              >
                {resourceKinds.map((kind) => (
                  <option key={kind} value={kind}>{kind}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 mb-3">
              <FiLink className="w-4 h-4 text-[var(--neutral-500)] mt-3 flex-shrink-0" />
              <input
                type="text"
                value={resource.url}
                onChange={(e) => updateResource(index, { url: e.target.value })}
                className="w-full p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] text-[var(--foreground)]"
                placeholder="https://..."
              />
            </div>

            <textarea
              value={resource.caption || ""}
              onChange={(e) => updateResource(index, { caption: e.target.value })}
              className="w-full p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] text-[var(--foreground)] h-20 mb-3"
              placeholder="Optional caption or note about how the tutor/student should use this resource"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={resource.studentVisible !== false}
                  onChange={(e) => updateResource(index, { studentVisible: e.target.checked })}
                />
                Visible to students on the lesson page
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={resource.includeInTutorReference === true}
                  onChange={(e) => updateResource(index, { includeInTutorReference: e.target.checked })}
                />
                Include in tutor reference grounding
              </label>
            </div>

            {resource.includeInTutorReference && (
              <textarea
                value={resource.referenceText || ""}
                onChange={(e) => updateResource(index, { referenceText: e.target.value })}
                className="w-full p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] text-[var(--foreground)] h-32"
                placeholder="Reference text used to ground the tutor. Markdown files will auto-fill this, but you can edit it here."
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
