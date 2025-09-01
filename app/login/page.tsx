"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import AuthPage from "../components/auth_page";

const LoginPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const param = searchParams.get("signup");
    const signup: boolean = param === "true";

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                // User is already logged in → redirect
                router.replace("/dashboard");
            }
        });

        return () => unsubscribe();
    }, [router]);

    // Only render AuthPage if user is not logged in
    return <AuthPage signUpDefault={signup} />;
};

export default LoginPage;
