import { useRouter } from "next/navigation";
import Button from "../button";

const Buttons = () => {
    const router = useRouter();
    return (
        <div className="w-full md:w-64 z-40 flex gap-4 mt-4">
            <Button color="var(--neutral-500)" onClick={() => router.push("/dashboard")} className="flex-1 md:flex-none px-0 py-3 md:px-6 md:py-3 md:text-lg">
                Go to Dashboard
            </Button>
            <Button color="var(--accent-500)" onClick={() => router.push("/login?signup=true")} className="flex-1 md:flex-none px-0 py-3 md:px-6 md:py-3 md:text-lg">
                Get Started
            </Button>
        </div>
    )
};

export default Buttons;