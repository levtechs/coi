"use client";

import LoadingComponent from "../components/loading";
import { useEffect } from "react";

const LoadingPage = () => {
    useEffect(() => {
        document.title = "Loading - coi";
    }, []);

    return (
        <LoadingComponent />
    );
}

export default LoadingPage;