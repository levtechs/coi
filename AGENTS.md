# Agent Guidelines for COI Project

## Commands
- **Build**: `npm run build` (Next.js with Turbopack)
- **Dev**: `npm run dev` (Next.js dev server with Turbopack)
- **Lint**: `npm run lint` (ESLint with Next.js rules)
- **Start**: `npm run start` (Production server)
- **Test**: No test framework configured

## Code Style
- **Framework**: Next.js 15 with React 19, TypeScript
- **Linting**: ESLint with `next/core-web-vitals` and `next/typescript`
- **TypeScript**: Strict mode enabled
- **Imports**: React first, external libs, then internal with `@/` alias
- **Components**: PascalCase, "use client" directive for client components
- **Types**: Defined in `lib/types.ts`, interfaces preferred over types
- **Naming**: camelCase for vars/functions, PascalCase for components/types
- **Error Handling**: try/catch with console.error logging, return error responses
- **Styling**: Tailwind CSS with CSS variables for theming
- **Async**: Proper async/await patterns, Promise.all for parallel requests