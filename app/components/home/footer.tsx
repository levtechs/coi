import React from "react";
import { FaXTwitter } from "react-icons/fa6";
import { RxDiscordLogo } from "react-icons/rx";
import { FiGithub } from "react-icons/fi";

const Footer = React.forwardRef<HTMLDivElement>((props, ref) => {
    return (
        <footer ref={ref} className="bg-[var(--neutral-100)] z-10 text-[var(--foreground)] p-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
                <div className="text-left">
                    <p className="text-lg text-[var(--neutral-500)] mb-4">
                        Interested in contributing? Check out the{' '}
                        <a
                            className="text-[var(--accent-500)] hover:underline"
                            href="https://github.com/levtechs/coi"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            GitHub repository
                        </a>
                        . Everything is open-source and contributions are welcome!
                    </p>
                    <p className="text-lg text-[var(--neutral-500)]">
                        Please report bugs or suggest features via the{' '}
                        <a
                            className="text-[var(--accent-500)] hover:underline"
                            href="https://github.com/levtechs/coi/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            GitHub issues page
                        </a>
                        {' '}or by reaching out to me directly on X or Discord!
                    </p>
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-4">
                        Created by Lev Smolsky
                    </h2>
                    <div className="flex justify-center gap-4">
                        <a
                            href="https://x.com/levtechs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--neutral-700)] hover:text-[var(--accent-500)] transition-colors"
                            aria-label="Twitter"
                        >
                            <FaXTwitter size={32} />
                        </a>
                        <a
                            href="https://github.com/levtechs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--neutral-700)] hover:text-[var(--accent-500)] transition-colors"
                            aria-label="GitHub"
                        >
                            <FiGithub size={32} />
                        </a>
                        <a
                            href="https://discordapp.com/users/739263047318634637"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--neutral-700)] hover:text-[var(--accent-500)] transition-colors"
                            aria-label="Discord"
                        >
                            <RxDiscordLogo size={32} />
                        </a>
                    </div>
                </div>
                <div className="text-center md:text-right">
                    <p className="text-lg text-[var(--neutral-500)]">
                        Contact: <a href="mailto:info@coilearn.com" className="text-[var(--accent-500)] hover:underline">info@coilearn.com</a>
                    </p>
                </div>
            </div>
        </footer>
    );
});

Footer.displayName = 'Footer';

export default Footer;