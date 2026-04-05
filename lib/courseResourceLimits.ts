/**
 * Course resource `referenceText` must stay within Firestore’s per-document size budget.
 * Validate with UTF-8 byte length (not JS string length) so non-ASCII text is measured correctly.
 */
export const MAX_COURSE_RESOURCE_REFERENCE_UTF8_BYTES = 750_000;
