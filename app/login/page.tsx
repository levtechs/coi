"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword, GoogleAuthProvider, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import Button from "@/app/components/button";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [dn, setDN] = useState("");
    const [password, setPassword] = useState("");
    const [isSignup, setIsSignup] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (isSignup) {
                const cred = await createUserWithEmailAndPassword(auth, email, password);

                // Update Firebase Auth profile with display name
                if (dn.trim()) {
                    await updateProfile(cred.user, { displayName: dn.trim() });
                }

                // Create Firestore user document
                await setDoc(doc(db, "users", cred.user.uid), {
                    email,
                    displayName: dn.trim() || "", // same as Google login
                    projectIds: [],
                });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }

            router.push("/");
        } catch (err: any) {
            alert(err.message);
        }
    }

    async function handleGoogleLogin() {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Create Firestore user doc if it doesn't exist
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    email: user.email,
                    displayName: user.displayName,
                    projectIds: [],
                });
            }

            router.push("/");
        } catch (err: any) {
            alert(err.message);
        }
    }

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-[var(--background)] text-[var(--foreground)]">
            <form 
                onSubmit={handleSubmit} 
                className="flex flex-col space-y-3 w-72"
            >
                <input
                    type="email"
                    placeholder="Email"
                    className="border border-[var(--neutral-300)] rounded-md p-2 focus:outline-none focus:border-[var(--accent-500)] bg-[var(--background)] text-[var(--foreground)]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="Display name"
                    placeholder="Display name"
                    className="border border-[var(--neutral-300)] rounded-md p-2 focus:outline-none focus:border-[var(--accent-500)] bg-[var(--background)] text-[var(--foreground)]"
                    value={dn}
                    onChange={(e) => setDN(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    className="border border-[var(--neutral-300)] rounded-md p-2 focus:outline-none focus:border-[var(--accent-500)] bg-[var(--background)] text-[var(--foreground)]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <Button type="submit" color="var(--accent-500)">
                    {isSignup ? "Sign Up" : "Login"}
                </Button>
            </form>

            <button
                onClick={() => setIsSignup(!isSignup)}
                className="text-[var(--accent-500)] hover:text-[var(--accent-600)] underline mt-4 transition"
            >
                {isSignup ? "Already have an account? Log in" : "Need an account? Sign up"}
            </button>

            <Button onClick={handleGoogleLogin} color="var(--error)" className="flex items-center justify-center gap-2 mt-4 text-[var(--background)]">
                <FcGoogle className="text-xl" />
                Sign in with Google
            </Button>
        </div>
    );
}
