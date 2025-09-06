import { FiLoader } from "react-icons/fi";

const LoadingComponent = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen space-y-4">
            <img src="/bookraw-unscreen.gif" alt="Loading animation" className="w-20 h-20" />
            <p className="text-[var(--foreground)] text-xl">Loading project...</p>
        </div>
    );
}

export default LoadingComponent;
