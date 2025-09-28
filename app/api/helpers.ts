import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
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
        const uid = decoded.uid;

        // Tally user action
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};
        const now = Date.now();

        // Handle daily actions
        let dailyActions = userData.dailyActions || 0;
        let lastResetDaily = userData.lastResetDaily || 0;
        if (now - lastResetDaily > 24 * 60 * 60 * 1000) {
            dailyActions = 0;
            lastResetDaily = now;
        }
        dailyActions += 1;

        // Handle weekly actions
        let weeklyActions = userData.weeklyActions || 0;
        let lastResetWeekly = userData.lastResetWeekly || 0;
        if (now - lastResetWeekly > 7 * 24 * 60 * 60 * 1000) {
            weeklyActions = 0;
            lastResetWeekly = now;
        }
        weeklyActions += 1;

        const totalActions = (userData.actions || 0) + 1;

        await setDoc(userDocRef, {
            actions: totalActions,
            dailyActions,
            lastResetDaily,
            weeklyActions,
            lastResetWeekly
        }, { merge: true });

        return uid;
    } catch {
        throw new Error("Invalid or expired token");
    }
}

/**
 * Verifies the Firebase ID token and checks if the user is an admin.
 * Throws an error if token is missing/invalid or user is not admin.
 * @param req NextRequest from Next.js
 * @returns Verified admin UID string
 */
export async function getVerifiedAdminUid(req: NextRequest): Promise<string> {
    const uid = await getVerifiedUid(req);
    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists() || !userDoc.data()?.admin) {
        throw new Error("Access denied: Admin privileges required");
    }
    return uid;
}
