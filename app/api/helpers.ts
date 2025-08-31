import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

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