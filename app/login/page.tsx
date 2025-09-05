"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { Suspense } from "react";
import AuthPage from "../components/auth_page";

const AuthPageWrapper = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const param = searchParams.get("signup");
    const forward = searchParams.get("forward") || "/dashboard";
    const signup: boolean = param === "true";

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                router.replace(forward);
            }
        });

        return () => unsubscribe();
    }, [router, forward]);

    return <AuthPage signUpDefault={signup} forward={forward}/>;
};

const LoginPage = () => {
    return (
        <Suspense>
            <AuthPageWrapper />
        </Suspense>
    );
};

export default LoginPage;
