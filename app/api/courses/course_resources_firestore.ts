import { randomUUID } from "crypto";
import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

import { adminDb } from "@/lib/firebaseAdmin";
import type { CourseResource } from "@/lib/types/course";
import { normalizeResources } from "@/app/api/courses/helpers";

/** Subcollection under each course document (keeps large referenceText off the course root). */
export const COURSE_RESOURCES_SUBCOLLECTION = "courseResources";

/** Stay under Firestore ~1 MiB document size; single string field + overhead. */
export const MAX_RESOURCE_REFERENCE_TEXT_CHARS = 800_000;

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
  /** Omit large referenceText (e.g. course list). */
  omitReferenceText?: boolean;
};

/**
 * Course-level resources stored in courses/{courseId}/courseResources/{resourceId}, ordered by `order`.
 */
export async function loadCourseResources(
  courseId: string,
  options?: LoadCourseResourcesOptions,
): Promise<CourseResource[]> {
  const base = adminDb
    .collection("courses")
    .doc(courseId)
    .collection(COURSE_RESOURCES_SUBCOLLECTION)
    .orderBy("order");

  const snap = options?.omitReferenceText
    ? await base
        .select(
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
        )
        .get()
    : await base.get();

  return snap.docs.map((doc) => docToCourseResource(doc));
}

function assertReferenceTextSize(resource: CourseResource, resourceLabel: string): void {
  const t = resource.referenceText;
  if (typeof t === "string" && t.length > MAX_RESOURCE_REFERENCE_TEXT_CHARS) {
    throw new Error(
      `Resource "${resourceLabel}" reference text exceeds ${MAX_RESOURCE_REFERENCE_TEXT_CHARS} characters (Firestore document limit).`,
    );
  }
}

/**
 * Replaces the entire courseResources subcollection to match `resources` (by id). Assigns `order` from array index.
 */
export async function syncCourseResources(courseId: string, resources: CourseResource[] | undefined): Promise<void> {
  const normalized = normalizeResources(resources || []);
  const col = adminDb.collection("courses").doc(courseId).collection(COURSE_RESOURCES_SUBCOLLECTION);

  const existingSnap = await col.get();
  const nextIds = new Set(
    normalized.map((r) => {
      const id = r.id?.trim() || randomUUID();
      return id;
    }),
  );

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

  for (let i = 0; i < normalized.length; i += 1) {
    const r = normalized[i];
    const id = r.id?.trim() || randomUUID();
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
