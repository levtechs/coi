"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import LoadingComponent from "../components/loading";
import { Suspense } from "react";

function LoadingPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        // Redirect old /l?token= invite links to /i?token=
        const token = searchParams.get("token");
        if (token) {
            router.replace(`/i?token=${token}`);
            return;
        }
    }, [searchParams, router]);

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <LoadingComponent />
        </div>
    );
}

export default function LoadingPageWrapper() {
    return (
        <Suspense fallback={<LoadingComponent />}>
            <LoadingPageContent />
        </Suspense>
    );
}
