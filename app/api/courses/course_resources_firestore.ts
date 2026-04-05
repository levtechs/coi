import { randomUUID } from "crypto";
import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

import { adminDb } from "@/lib/firebaseAdmin";
import { MAX_COURSE_RESOURCE_REFERENCE_UTF8_BYTES } from "@/lib/courseResourceLimits";
import type { CourseResource } from "@/lib/types/course";
import { normalizeResources } from "@/app/api/courses/helpers";

/** Subcollection under each course document (keeps large referenceText off the course root). */
export const COURSE_RESOURCES_SUBCOLLECTION = "courseResources";

/** @deprecated Use MAX_COURSE_RESOURCE_REFERENCE_UTF8_BYTES; limit is UTF-8 bytes, not code units. */
export const MAX_RESOURCE_REFERENCE_TEXT_CHARS = MAX_COURSE_RESOURCE_REFERENCE_UTF8_BYTES;

function docToCourseResource(doc: QueryDocumentSnapshot<DocumentData>): CourseResource {
  const d = doc.data();
  return {
    id: doc.id,
    title: typeof d.title === "string" ? d.title : "",
    url: typeof d.url === "string" ? d.url : "",
    kind: d.kind as CourseResource["kind"],
    caption: typeof d.caption === "string" ? d.caption : undefined,
    mimeType: typeof d.mimeType === "string" ? d.mimeType : undefined,
    sourceFileName: typeof d.sourceFileName === "string" ? d.sourceFileName : undefined,
    size: typeof d.size === "number" ? d.size : undefined,
    storagePath: typeof d.storagePath === "string" ? d.storagePath : undefined,
    referenceText: typeof d.referenceText === "string" ? d.referenceText : undefined,
    includeInTutorReference: d.includeInTutorReference === true,
    studentVisible: d.studentVisible !== false,
  };
}

export type LoadCourseResourcesOptions = {
  /** Omit large referenceText (e.g. course list, lesson pills). */
  omitReferenceText?: boolean;
  /** Only return resources marked for tutor grounding (filtered in memory after read). */
  onlyTutorReference?: boolean;
};

function sortResourceDocsByOrder(docs: QueryDocumentSnapshot<DocumentData>[]): QueryDocumentSnapshot<DocumentData>[] {
  return [...docs].sort((a, b) => {
    const ao = typeof a.data().order === "number" ? a.data().order : 0;
    const bo = typeof b.data().order === "number" ? b.data().order : 0;
    return ao - bo;
  });
}

/**
 * Course-level resources stored in courses/{courseId}/courseResources/{resourceId}, ordered by `order`.
 * Uses collection scans + in-memory sort so no composite Firestore indexes are required (works on localhost).
 */
export async function loadCourseResources(
  courseId: string,
  options?: LoadCourseResourcesOptions,
): Promise<CourseResource[]> {
  const col = adminDb.collection("courses").doc(courseId).collection(COURSE_RESOURCES_SUBCOLLECTION);

  const selectFields = [
    "title",
    "url",
    "kind",
    "caption",
    "mimeType",
    "sourceFileName",
    "size",
    "storagePath",
    "includeInTutorReference",
    "studentVisible",
    "order",
  ] as const;

  const snap = options?.omitReferenceText
    ? await col.select(...selectFields).get()
    : await col.get();

  const docs = sortResourceDocsByOrder(snap.docs);
  let resources = docs.map((doc) => docToCourseResource(doc));
  if (options?.onlyTutorReference) {
    resources = resources.filter((r) => r.includeInTutorReference === true);
  }
  return resources;
}

/** Tutor grounding: full resource bodies for items flagged `includeInTutorReference`. */
export async function loadCourseResourcesForTutorGrounding(courseId: string): Promise<CourseResource[]> {
  const all = await loadCourseResources(courseId);
  return all.filter((r) => r.includeInTutorReference === true);
}

function assertReferenceTextSize(resource: CourseResource, resourceLabel: string): void {
  const t = resource.referenceText;
  if (typeof t !== "string") return;
  const bytes = Buffer.byteLength(t, "utf8");
  if (bytes > MAX_COURSE_RESOURCE_REFERENCE_UTF8_BYTES) {
    throw new Error(
      `Resource "${resourceLabel}" reference text exceeds ${MAX_COURSE_RESOURCE_REFERENCE_UTF8_BYTES} UTF-8 bytes (Firestore document limit).`,
    );
  }
}

/** Validate resource sizes before creating a course or syncing (no Firestore writes). */
export function assertCourseResourcesWithinLimits(resources: CourseResource[] | undefined): void {
  const normalized = normalizeResources(resources || []);
  for (let i = 0; i < normalized.length; i++) {
    const r = normalized[i];
    assertReferenceTextSize(r, r.title || r.id?.trim() || `resource-${i}`);
  }
}

type ResourceRow = { id: string; resource: CourseResource };

function buildResourceRows(resources: CourseResource[] | undefined): ResourceRow[] {
  const normalized = normalizeResources(resources || []);
  return normalized.map((r) => {
    const id = r.id?.trim() || randomUUID();
    return { id, resource: { ...r, id } };
  });
}

/**
 * Replaces the entire courseResources subcollection to match `resources` (by id). Assigns `order` from array index.
 */
export async function syncCourseResources(courseId: string, resources: CourseResource[] | undefined): Promise<void> {
  const rows = buildResourceRows(resources);
  const col = adminDb.collection("courses").doc(courseId).collection(COURSE_RESOURCES_SUBCOLLECTION);

  const existingSnap = await col.get();
  const nextIds = new Set(rows.map((row) => row.id));

  let batch = adminDb.batch();
  let ops = 0;

  const commitIfNeeded = async () => {
    if (ops >= 450) {
      await batch.commit();
      batch = adminDb.batch();
      ops = 0;
    }
  };

  for (const doc of existingSnap.docs) {
    if (!nextIds.has(doc.id)) {
      batch.delete(doc.ref);
      ops += 1;
      await commitIfNeeded();
    }
  }

  for (let i = 0; i < rows.length; i += 1) {
    const { id, resource: r } = rows[i];
    assertReferenceTextSize(r, r.title || id);

    const ref = col.doc(id);
    batch.set(ref, {
      title: r.title,
      url: r.url,
      kind: r.kind,
      caption: r.caption ?? "",
      mimeType: r.mimeType ?? null,
      sourceFileName: r.sourceFileName ?? null,
      size: typeof r.size === "number" ? r.size : null,
      storagePath: r.storagePath ?? null,
      referenceText: typeof r.referenceText === "string" ? r.referenceText : null,
      includeInTutorReference: r.includeInTutorReference === true,
      studentVisible: r.studentVisible !== false,
      order: i,
    });
    ops += 1;
    await commitIfNeeded();
  }

  if (ops > 0) {
    await batch.commit();
  }

  await adminDb
    .collection("courses")
    .doc(courseId)
    .update({ resources: admin.firestore.FieldValue.delete() })
    .catch(() => {
      /* ignore if document missing or field absent */
    });
}
