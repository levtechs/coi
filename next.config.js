// next.config.js
/** @type {import('next').NextConfig} */
const isIsolatedBuild = process.env.ISOLATED_BUILD === 'true';

const nextConfig = {
    distDir: isIsolatedBuild ? '.next-build' : '.next',
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'sat.coilearn.com',
            },
            {
                protocol: 'https',
                hostname: 'thryftstore.com',
            },
        ],
    },
};

module.exports = nextConfig;
