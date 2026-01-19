"use client";

import LoadingComponent from "../components/loading";
import { Suspense } from "react";

const LoadingPage = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <LoadingComponent />
        </div>
    );
};

const LoadingPageWrapper = () => {
    return (
        <Suspense fallback={<LoadingComponent />}>
            <LoadingPage />
        </Suspense>
    );
};

export default LoadingPageWrapper;
