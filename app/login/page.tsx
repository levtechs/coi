"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { Suspense } from "react";
import AuthPage from "../components/auth_page";

const AuthPageWrapper = () => {
    const searchParams = useSearchParams();
    const param = searchParams.get("signup");
    const signup: boolean = param === "true";
    return <AuthPage signUpDefault={signup} />;
};

const LoginPage = () => {
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                router.replace("/dashboard");
            }
        });

        return () => unsubscribe();
    }, [router]);

    return (
        <Suspense>
            <AuthPageWrapper />
        </Suspense>
    );
};

export default LoginPage;
