// next.config.js
/** @type {import('next').NextConfig} */
const isIsolatedBuild = process.env.ISOLATED_BUILD === 'true';

const nextConfig = {
    // Only redirect output to another folder if we're doing an isolated build
    distDir: isIsolatedBuild ? '.next-build' : '.next',
};

module.exports = nextConfig;
