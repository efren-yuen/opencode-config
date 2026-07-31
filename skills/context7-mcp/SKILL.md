---
name: context7
description: Fetch up-to-date library documentation and code examples using Context7
triggers:
  - "use context7"
  - "context7"
  - "get docs"
  - "library docs"
  - "API documentation"
  - "how to use"
  - "how do I"
---

# Context7 — Up-to-date Library Documentation

Use the Context7 MCP tools (`resolve-library-id` and `query-docs`) to fetch current, version-specific documentation and code examples whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service.

## When to Use

Use Context7 for questions about:
- Library APIs, methods, and syntax (React, Next.js, Prisma, Express, Tailwind, etc.)
- Configuration and setup instructions for frameworks and tools
- Version migration guides
- Library-specific debugging or error messages
- CLI tool usage and flags
- Cloud service SDKs and APIs (AWS, Cloudflare, Vercel, etc.)

Do NOT use Context7 for:
- Refactoring or code review
- Writing scripts from scratch (without library dependencies)
- Debugging business logic (unrelated to a library)
- General programming concepts or design patterns

## Steps

1. **Resolve the library**: Call `resolve-library-id` with the library name and the user's question. Example: `resolve-library-id({ libraryName: "react", query: "useEffect cleanup" })`
2. **Pick the best match**: Choose by exact name match → description relevance → code snippet count → source reputation (High/Medium preferred) → benchmark score (higher is better). If results don't look right, try alternate names (e.g., "next.js" not "nextjs").
3. **Query the docs**: Call `query-docs` with the selected library ID (format: `/org/project`) and the user's full question. Example: `query-docs({ libraryId: "/facebook/react", query: "how to clean up side effects in useEffect" })`
4. **Answer using the docs**: Use the fetched documentation to provide accurate, up-to-date code examples and explanations.
