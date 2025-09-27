import { collection, getDocs, limit, query, startAfter, orderBy, getDoc, doc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project, User } from "@/lib/types";
import { NextRequest } from "next/server";

export function checkAdminPassword(req: NextRequest) {
    const password = req.headers.get('X-Admin-Password');
    if (password !== process.env.ADMIN_PASSWORD) {
        throw new Error("Invalid admin password");
    }
}

/**
 * Get projects from the database with pagination.
 * @param limitNum Number of projects to fetch.
 * @param lastId The ID of the last project from previous fetch, for pagination.
 * @returns An array of projects.
 */
export async function getProjects(limitNum: number, lastId?: string): Promise<Project[]> {
    try {
        let q = query(collection(db, "projects"), orderBy("__name__"), limit(limitNum));
        if (lastId) {
            q = query(collection(db, "projects"), orderBy("__name__"), startAfter(lastId), limit(limitNum));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    } catch (err) {
        console.error("Error fetching projects:", err);
        throw err;
    }
}

/**
 * Get users from the database with pagination.
 * @param limitNum Number of users to fetch.
 * @param lastId The ID of the last user from previous fetch, for pagination.
 * @returns An array of users.
 */
export async function getUsers(limitNum: number, lastId?: string): Promise<User[]> {
    try {
        let q = query(collection(db, "users"), orderBy("__name__"), limit(limitNum));
        if (lastId) {
            q = query(collection(db, "users"), orderBy("__name__"), startAfter(lastId), limit(limitNum));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                email: data.email,
                displayName: data.displayName,
                actions: data.actions,
                dailyActions: data.dailyActions,
                weeklyActions: data.weeklyActions,
            } as User;
        });
    } catch (err) {
        console.error("Error fetching users:", err);
        throw err;
    }
}

/**
 * Get projects for a specific user (as owner or collaborator).
 * @param userId The user ID.
 * @returns An array of projects.
 */
export async function getProjectsForUser(userId: string): Promise<Project[]> {
    try {
        // First, get the user email
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) throw new Error("User not found");
        const userEmail = userDoc.data()?.email;
        if (!userEmail) throw new Error("User email not found");

        // Query projects where ownerId == userId or collaborators includes userEmail
        const q1 = query(collection(db, "projects"), where("ownerId", "==", userId));
        const q2 = query(collection(db, "projects"), where("collaborators", "array-contains", userEmail));

        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

        const projectsMap = new Map<string, Project>();
        snap1.docs.forEach(doc => projectsMap.set(doc.id, { id: doc.id, ...doc.data() } as Project));
        snap2.docs.forEach(doc => projectsMap.set(doc.id, { id: doc.id, ...doc.data() } as Project));

        return Array.from(projectsMap.values());
    } catch (err) {
        console.error("Error fetching projects for user:", err);
        throw err;
    }
}