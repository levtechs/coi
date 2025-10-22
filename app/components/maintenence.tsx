import Image from 'next/image';

const MaintenencePage = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-[var(--foreground)] bg-[var(--background)]">
            <Image src="/error.png" alt="Not Found" width={200} height={200} className="mb-8" />
            <h1 className="text-3xl font-bold mb-4">Maintenance Mode</h1>
            <p className="text-lg">The website is currently under maintenance. Please check back later.</p>
        </div>
    )
}

export default MaintenencePage
