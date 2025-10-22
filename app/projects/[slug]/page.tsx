"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Project, Card} from "@/lib/types";
import { addCollaborator, setTitle } from "@/app/views/projects";
import { db } from "@/lib/firebase"; // your Firestore instance
import { doc, collection, onSnapshot, QuerySnapshot, CollectionReference, DocumentSnapshot, DocumentReference, FirestoreError} from "firebase/firestore";

import Button from "@/app/components/button";
import Editor from "@/app/components/editor/editor";
import LoadingComponent from "@/app/components/loading";
import Error from "@/app/components/error";

export default function ProjectPage() {
    const { user } = useAuth();
    const params = useParams();
    const slugParam = params?.slug;
    const projectId = Array.isArray(slugParam) ? slugParam[0] : slugParam;

    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setLoading] = useState<boolean | "error">(true);

    useEffect(() => {
        document.title = `${project?.title || 'Project'} - coi`;
    }, [project]);

    useEffect(() => {
        if (!user || !projectId) return;

        setLoading(true);

        const projectRef: DocumentReference<Project> = doc(db, "projects", projectId) as DocumentReference<Project>;
        const cardsRef: CollectionReference<Card> = collection(db, "projects", projectId, "cards") as CollectionReference<Card>;
        
        // Subscribe to project document
        const unsubscribeProject = onSnapshot(
            projectRef,
            (docSnap: DocumentSnapshot<Project>) => {
                if (docSnap.exists()) {
                    const projectData = docSnap.data() as Project;
                    // Include the Firestore document ID
                    const projectWithId: Project = { ...projectData, id: docSnap.id };

                    setProject((prev: Project | null) =>
                        prev ? { ...prev, ...projectWithId } : projectWithId
                    );
                    setLoading(false);
                } else {
                    setLoading("error");
                }
            },
            (err: FirestoreError) => {
                console.error("Error fetching project:", err);
                setLoading("error");
            }
        );


        // Subscribe to cards subcollection
        const unsubscribeCards = onSnapshot(
            cardsRef,
            (querySnap: QuerySnapshot<Card>) => {
                const cards: Card[] = querySnap.docs.map((doc) => ({
                    ...doc.data(),
                    id: doc.id, // always overwrite any 'id' in doc.data()
                }));
                setProject((prev: Project | null) =>
                    prev ? { ...prev, cards } : ({ id: projectId, cards } as Project)
                );
            },
            (err: FirestoreError) => console.error("Error fetching cards:", err)
        );

        return () => {
            unsubscribeProject();
            unsubscribeCards();
        };
    }, [user, projectId]);


    if (!projectId) return null;

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 bg-[var(--background)] text-[var(--foreground)] text-center">
                <p className="text-2xl font-semibold mb-4">You are not logged in.</p>
                <p className="text-lg mb-6">Please log in to access this project.</p>
                <Button color="var(--accent-500)" onClick={() => (window.location.href = "/login")}>
                    Go to Login Page
                </Button>
            </div>
        );
    }

    if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true') {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--background)] text-[var(--foreground)]">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4">Maintenance Mode</h1>
                    <p className="text-lg">The website is currently under maintenance. Please check back later.</p>
                </div>
            </div>
        );
    }

    if (isLoading === "error") {
        return (
            <Error
                h2="Error loading project."
                p="Please check the project ID or try again later."
            />
        );
    }

    if (isLoading || !project) {
        return <LoadingComponent loadingText="Loading project" />;
    }

    return (
        <Editor
            project={project}
            user={user}
            addCollaborator={addCollaborator}
            setTitle={setTitle}
        />
    );
}
