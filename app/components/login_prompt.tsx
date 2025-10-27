import { useRouter } from "next/navigation";
import Button from "./button";

interface LoginPromptParams {
    page: string;
}

const LoginPrompt = ({ page }: LoginPromptParams) => {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center h-screen p-6 bg-[var(--background)] text-[var(--foreground)] text-center">
            <p className="text-2xl font-semibold mb-4">You are not logged in.</p>
            <p className="text-lg mb-6">Please log in to access {page}.</p>
            <Button color="var(--accent-500)" onClick={() => router.push(`/login?forward=${encodeURIComponent(window.location.pathname)}`)}>
                Go to Login Page
            </Button>
        </div>
    )
}

export default LoginPrompt;