import { adminDb } from "@/lib/firebaseAdmin";
import { User } from "@/lib/types/user";

export async function getUserById(userId: string): Promise<User | null> {
    try {
        const userRef = adminDb.collection("users").doc(userId);
        const snap = await userRef.get();

        if (!snap.exists) {
            return null;
        }

        const data = snap.data()!;
        const user: User = {
            id: userId,
            email: data.email,
            displayName: data.displayName,
            actions: data.actions,
            dailyActions: data.dailyActions,
            weeklyActions: data.weeklyActions,
            projectIds: data.projectIds,
            friendIds: data.friendIds,
            starUser: data.starUser || false,
            signUpResponses: data.signUpResponses,
        };

        return user;
    } catch (err) {
        console.error("Error fetching user:", err);
        return null;
    }
}
