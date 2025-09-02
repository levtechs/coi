import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin"; // your admin SDK instance

// Utility function to fetch userRef by email
export async function getUserRefByEmail(email: string) {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q);

    if (snap.empty) {
        return null; // user not found
    }

    // Assume email is unique → return first match
    return snap.docs[0].ref;
}

/**
 * Verifies the Firebase ID token in the request Authorization header.
 * Throws an error if token is missing or invalid.
 * @param req NextRequest from Next.js
 * @returns Verified UID string
 */
export async function getVerifiedUid(req: NextRequest): Promise<string> {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Missing or invalid Authorization header");
    }

    const idToken = authHeader.split("Bearer ")[1];
    if (!idToken) throw new Error("No token provided");

    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        return decoded.uid;
    } catch (err) {
        throw new Error("Invalid or expired token");
    }
}