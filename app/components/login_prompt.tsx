import Button from "./button";

interface LoginPromptParams {
    page: string;
}

const LoginPrompt = ({ page }: LoginPromptParams) => {
    return (
        <div className="flex flex-col items-center justify-center h-screen p-6 bg-[var(--background)] text-[var(--foreground)] text-center">
            <p className="text-2xl font-semibold mb-4">You are not logged in.</p>
            <p className="text-lg mb-6">Please log in to access {page}.</p>
            <Button color="var(--accent-500)" onClick={() => (window.location.href = "/login")}>
                Go to Login Page
            </Button>
        </div>
    )
}

export default LoginPrompt;