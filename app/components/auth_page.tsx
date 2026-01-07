"use client";

import { useState } from "react";
import Image from "next/image";
import { 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    createUserWithEmailAndPassword, 
    GoogleAuthProvider, 
    updateProfile 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { Eye, EyeOff } from "lucide-react"; // Common icons for show/hide


interface AuthPageParams {
    signUpDefault: boolean;
    forward?: string;
}

export default function AuthPage({ signUpDefault, forward }: AuthPageParams) {
    const [email, setEmail] = useState("");
    const [dn, setDN] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSignup, setIsSignup] = useState(signUpDefault);
    const [errorMessage, setErrorMessage] = useState("");
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErrorMessage("");

        try {
            if (isSignup) {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                if (dn.trim()) {
                    await updateProfile(cred.user, { displayName: dn.trim() });
                }
                await setDoc(doc(db, "users", cred.user.uid), {
                    email,
                    displayName: dn.trim() || "",
                    projectIds: [],
                });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            router.replace(window.location.origin + "/" + (forward ? forward : "dashboard"));
        } catch (err: unknown) {
            const error = err as { code?: string; message?: string };
            if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                setErrorMessage("Incorrect credentials. Please try again.");
            } else {
                setErrorMessage(error.message || "An error occurred.");
            }
        }
    }

    async function handleGoogleLogin() {
        setErrorMessage("");
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    email: user.email,
                    displayName: user.displayName,
                    projectIds: [],
                });
            }
            router.replace(window.location.origin + "/" + (forward ? forward : "dashboard"));
        } catch {
            setErrorMessage("Failed to sign in with Google.");
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-md bg-[var(--neutral-50)] rounded-[2rem] shadow-xl p-8 flex flex-col items-center">
                
                {/* Logo */}
                <div className="mb-6">
                    <Image 
                        src="/logo.png" 
                        alt="Logo" 
                        width={60} 
                        height={60} 
                        className="rounded-xl shadow-sm"
                    />
                </div>

                <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-1">
                    {isSignup ? "Create an account" : "Welcome back"}
                </h1>
                <p className="text-[var(--neutral-600)] text-sm mb-8">
                    Please enter your details to {isSignup ? "sign up" : "login"}.
                </p>

                <form onSubmit={handleSubmit} className="w-full space-y-5">
                    {/* Email Field */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-[var(--neutral-700)] ml-1">Email</label>
                        <input
                            type="email"
                            required
                            placeholder="Enter your email"
                            className="w-full px-4 py-3 bg-[var(--neutral-200)] border-none rounded-xl focus:ring-2 focus:ring-[var(--accent-500)] outline-none transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {/* Display Name (Signup Only) */}
                    {isSignup && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-[var(--neutral-700)] ml-1">Display Name</label>
                            <input
                                type="text"
                                required
                                placeholder="How should we call you?"
                                className="w-full px-4 py-3 bg-[var(--neutral-200)] border-none rounded-xl focus:ring-2 focus:ring-[var(--accent-500)] outline-none transition-all"
                                value={dn}
                                onChange={(e) => setDN(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Password Field */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-[var(--neutral-700)] ml-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="Enter your password"
                                className="w-full px-4 py-3 bg-[var(--neutral-200)] border-none rounded-xl focus:ring-2 focus:ring-[var(--accent-500)] outline-none transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--neutral-500)] hover:text-[var(--neutral-700)]"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {errorMessage && (
                        <p className="text-red-500 text-xs text-center">{errorMessage}</p>
                    )}

                    <button 
                        type="submit" 
                        className="w-full py-3.5 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white font-medium rounded-xl transition-colors shadow-md mt-2"
                    >
                        {isSignup ? "Sign Up" : "Login"}
                    </button>
                </form>

                {/* Divider */}
                <div className="w-full flex items-center my-8">
                    <div className="flex-grow border-t border-[var(--neutral-300)]"></div>
                    <span className="px-4 text-xs text-[var(--neutral-500)] uppercase tracking-widest font-medium">OR</span>
                    <div className="flex-grow border-t border-[var(--neutral-300)]"></div>
                </div>

                {/* Social Login */}
                <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-[var(--neutral-300)] rounded-xl hover:bg-[var(--neutral-100)] transition-colors text-sm font-medium text-[var(--neutral-700)]"
                >
                    <FcGoogle size={22} />
                    With Google
                </button>

                {/* Toggle Signup/Login */}
                <p className="mt-8 text-sm text-[var(--neutral-600)]">
                    {isSignup ? "Already have an account? " : "Don't have an account? "}
                    <button
                        onClick={() => setIsSignup(!isSignup)}
                        className="text-[var(--foreground)] font-semibold hover:underline"
                    >
                        {isSignup ? "Login" : "Register now"}
                    </button>
                </p>
            </div>
        </div>
    );
}
