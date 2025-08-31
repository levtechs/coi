"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import Button from "@/app/components/button";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignup, setIsSignup] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (isSignup) {
                await createUserWithEmailAndPassword(auth, email, password);
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
            await signInWithPopup(auth, provider);
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
