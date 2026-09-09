---
name: organized-file-creation
description: 'Create or refactor TraceFlow TypeScript files with feature-based folders, explicit suffixes, compact formatting, and strict single-responsibility rules. Use when adding files or reorganizing the traceflow runtime.'
---

# Organized TypeScript File Creation

Use this skill when creating or refactoring files in `packages/traceflow`. Keep the
runtime framework-agnostic and preserve the public API unless the task explicitly
requests a breaking change.

## Choose the folder first

Place code under `packages/traceflow/src/modules`:

- `settings/`: configuration, OpenTelemetry initialization, lifecycle and settings
  contracts.
- `traces/normal/`: the `@Trace()` decorator and behavior specific to decorated
  methods.
- `traces/manual/`: behavior specific to manual integrations such as PostgreSQL instrumentation.
- `traces/shared/`: code used by both normal and manual tracing. Do not place code
  here just because it is convenient; move it here only when there is real reuse.
- `src/index.ts`: main public facade.
- `src/protocol.ts`: public protocol facade for the `traceflow/protocol` subpath.

Mirror the source feature path in `packages/traceflow/test` for tests. Do not add
empty folders such as `enums/` or `functions/`; create them only when they contain
real code.

## File suffixes are contracts

Use the suffix that describes the file's responsibility:

- `.constant.ts`: runtime constants and immutable lookup collections.
- `.type.ts`: type aliases only; no runtime values.
- `.interface.ts`: object contracts only; no runtime values.
- `.function.ts`: functions only, plus imports and type imports.
- `.decorator.ts`: decorators and their decorator-specific helpers.
- `.exporter.ts`: exporter classes or exporter-specific helpers.
- `.runtime.ts`: module-level runtime state or singleton instances.
- `index.ts`: barrel exports only; no business logic.

The hard rule for `.function.ts` is: never declare a top-level `const`, `let`,
`var`, class, enum, object instance, regular expression, `Set`, `Map`, tracer, or
mutable state. Put reusable values in the correct `.constant.ts`, put lifecycle
state in `.runtime.ts`, or create the value inside the function. Local variables
inside a function are expected and allowed.

Keep types in the `types/` or `interfaces/` folder. If a type is reused by more
than one feature, place it in `traces/shared`; if it belongs to one feature, keep
it in that feature. A union is a `.type.ts`, while an object shape is an
`.interface.ts`.

## Formatting and exports

Prefer compact, readable horizontal code: keep short imports, signatures and
objects on one line when they remain easy to scan. Do not create artificial blank
lines or very tall formatting. Prettier is the final authority, so run the project
formatter after editing.

Barrel files should only re-export symbols. Keep implementation imports pointed at
the owning feature; use a barrel when it improves the public surface, not to hide
cycles. Update `packages/traceflow/package.json` exports when adding a public
subpath, and keep `protocol.ts` as the facade behind `traceflow/protocol`.

## Creation checklist

1. Inspect neighboring files and decide whether the code belongs to `settings`,
   `normal`, `manual`, or `shared`.
2. Select the suffix before writing code and keep the file's responsibility narrow.
3. Check every `.function.ts` for forbidden top-level declarations.
4. Add or update the nearest `index.ts` barrel only with exports.
5. Add a focused test under the mirrored feature path when behavior changes.
6. Run `npm run verify` from the workspace root. For public package changes also
   run `npm run pack:check` and a small import smoke test for the affected subpath.
