import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/lib/types";

export async function getUserById(userId: string): Promise<User | null> {
    try {
        const userRef = doc(db, "users", userId);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
            return null;
        }

        const data = snap.data();
        const user: User = {
            id: userId,
            email: data.email,
            displayName: data.displayName,
            actions: data.actions,
            dailyActions: data.dailyActions,
            weeklyActions: data.weeklyActions,
            projectIds: data.projectIds,
        };

        return user;
    } catch (err) {
        console.error("Error fetching user:", err);
        return null;
    }
}