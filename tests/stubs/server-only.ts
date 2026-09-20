// No-op stand-in for the `server-only` package under Vitest, which — unlike
// Next's webpack/turbopack build — doesn't special-case that import to be a
// harmless marker. Production builds still use the real package.
export {};
