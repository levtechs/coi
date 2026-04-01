// next.config.js
/** @type {import('next').NextConfig} */
const isIsolatedBuild = process.env.ISOLATED_BUILD === 'true';
const path = require('path');

const nextConfig = {
    distDir: isIsolatedBuild ? '.next-build' : '.next',
    outputFileTracingRoot: path.resolve(process.cwd()),
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
