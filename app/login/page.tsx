"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { Suspense } from "react";
import AuthPage from "../components/auth_page";
import { FlickeringGrid } from "@/app/components/flickering-grid";

const AuthPageWrapper = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const param = searchParams.get("signup");
    const forward = searchParams.get("forward") || "/dashboard";
    const signup: boolean = param === "true";

    useEffect(() => {
        document.title = "Login - coi";
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                router.replace(forward);
            }
        });

        return () => unsubscribe();
    }, [router, forward]);

    return (
        <div className="min-h-screen text-[var(--foreground)]">
            <div className="fixed inset-0 bg-[var(--neutral-100)] pointer-events-none"></div>
            <FlickeringGrid className="fixed inset-0 z-0 pointer-events-none" />
            <div className="relative z-5">
                <AuthPage signUpDefault={signup} forward={forward}/>
            </div>
        </div>
    );
};

const LoginPage = () => {
    return (
        <Suspense>
            <AuthPageWrapper />
        </Suspense>
    );
};

export default LoginPage;
