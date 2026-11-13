# @xkid1/multipart: Developer Documentation Summary

This document provides an overview of the comprehensive developer guidance for AI coding assistants and agents working in the `@xkid1/multipart` repository.

## Documentation Structure

### 1. **AGENTS.md** (119 lines)
**Location:** Repository root  
**Purpose:** High-level agent guidelines and architectural patterns

**Sections:**
- Project Overview & Toolchain
- Repository Layout with file purposes
- Language-Specific Instructions (TypeScript/Node focus)
- Shared Commands (build, test, lint, format)
- Conventions (strict typing, imports, buffer safety, encoding)
- Testing Requirements & Coverage Thresholds
- Public API Checklist
- Releasing & Publishing Workflow
- Specialized Guidance & Agent/Skill References
- Definition of Done
- Known Limitations

**Key Takeaway:** Foundation document for understanding project structure and conventions.

---

### 2. **Agents** (`.github/agents/`)
**Location:** `.github/agents/parser.agent.md`  
**Purpose:** Specific directives for the multipart parser specialist agent

**Contents:**
- Role & Mission: Maintain, optimize, extend the multipart parser
- Core Directives: zero dependencies, memory efficiency, encoding heuristics, strict typing
- Quality Assurance: Test coverage, linting, type checking

**Key Takeaway:** Defines agent responsibilities and quality gates for parser work.

---

### 3. **Instructions** (`.github/instructions/`)
**Location:** `.github/instructions/coding-standards.instructions.md` (261 lines)  
**Purpose:** Comprehensive coding standards and development workflow

**Sections:**
1. **Build & Validation Pipeline:** Pre-commit checklist, individual commands, validation workflow
2. **TypeScript & Code Style:** Imports, type safety, formatting, JSDoc requirements
3. **Testing Requirements:** Coverage thresholds (95%/95%/95% statements/functions/lines, 75% branches), test structure, assertions
4. **Buffer & Memory Safety:** Zero-copy operations, boundary detection, memory leak prevention
5. **Encoding Detection:** BOM/multi-byte validation, safety rules, error handling
6. **Error Handling:** When to throw TypeError/RangeError, error message guidelines
7. **Git & Commits:** Conventional commit format, GPG signing with key `C8F0BFFD1938A1D8`
8. **Zero External Dependencies:** Policy and approval process
9. **Architectural Constraints:** Boundary handling (RFC format, limits), header parsing, encoding rules
10. **Public API Checklist:** Step-by-step for adding/modifying APIs
11. **Common Pitfalls:** Quick lookup table with fixes

**Key Takeaway:** Practical guide for writing, testing, and committing code.

---

### 4. **Skills** (`.github/skills/`)

#### 4a. **multipart-parsing/SKILL.md** (198 lines)
**Purpose:** Deep expertise in multipart RFC parsing, boundary detection, header extraction, encoding

**Sections:**
1. Description & Responsibilities (5 areas)
2. Key Logic Areas:
   - Boundary Detection & Location
   - Header Parsing & Extraction (Content-Disposition, Content-Type, extensions)
   - Header/Body Separation
   - Encoding Detection (UTF-8, UTF-16, UTF-32, ASCII, Latin-1, binary)
   - Part Validation & Skipping
3. Architecture & Module Organization (folder structure)
4. Testing Strategy (test areas and patterns)
5. Commands & Validation
6. Common Pitfalls with fixes

**Key Takeaway:** Complete reference for multipart parser implementation details and edge cases.

#### 4b. **ts-library-tooling/SKILL.md** (320 lines)
**Purpose:** End-to-end build, validation, and packaging for TypeScript libraries

**Sections:**
1. Toolchain Overview (Node, Yarn, SWC, tsc, ESLint, Vitest, Prettier)
2. Command Reference (comprehensive vs. individual commands)
3. Toolchain Constraints & Configuration (tsconfig.json, .swcrc, eslint.config.ts, vitest.config.ts)
4. Common Tasks (subsetting tests, coverage checks, auto-fixing, debugging)
5. Troubleshooting (organized by symptom → cause → fix)
6. Git Workflow (pre-commit, merge conflict handling)
7. Performance Optimization (build/test/lint times)
8. CI/CD Integration (GitHub Actions, pre-commit hooks)
9. Dependency Management (adding, updating, upgrading TypeScript)
10. Known Limitations (NodeNext, CommonJS, Corepack, coverage pragmatics)

**Key Takeaway:** Hands-on guide for all build, lint, and packaging tasks.

#### 4c. **vitest-testing/SKILL.md** (370 lines)
**Purpose:** Writing deterministic, high-signal Vitest tests for multipart parser

**Sections:**
1. Overview & Coverage Requirements (8 testing areas: boundaries, headers, encoding, extensions, parts, etc.)
2. Test Structure (Arrange-Act-Assert pattern, happy/boundary/invalid/over-capacity tests)
3. Example Tests (boundary detection, header extraction, encoding, integration)
4. Testing Patterns & Best Practices:
   - Deterministic fixtures (no random/time/network)
   - Exact assertions (precise values, not vague checks)
   - Test isolation (no shared state)
   - Edge case naming
5. Commands (run, watch, filter, coverage)
6. Common Pitfalls with fixes
7. When to Write Tests
8. Code Coverage Thresholds explanation

**Key Takeaway:** Complete testing reference with real code examples.

#### 4d. **github-packages-publish/SKILL.md**
**Purpose:** Publishing packages to GitHub Packages npm registry  
*(Existing file, not modified in this update)*

---

### 5. **Prompts** (`.github/prompts/`)
**Location:** `.github/prompts/refactor.prompt.md` (176 lines)  
**Purpose:** Standard prompt templates for instructing AI agents

**Prompts Included:**
1. **Feature Addition or Optimization** — For new features/performance improvements
2. **Bug Fix or Debugging** — For reporting and fixing bugs
3. **Code Review & Testing** — For reviewing changes against quality criteria
4. **Refactoring & Splitting Utilities** — For code reorganization
5. **Performance & Optimization** — For performance improvements
6. **Encoding Detection Enhancement** — For encoding support improvements
7. **Publishing & Release** — For release workflow
8. **Documentation & Guidelines** — For updating developer docs

**Each Prompt Includes:**
- Clear task description
- Constraints (dependencies, testing, linting, documentation)
- Definition of Done
- Success criteria

**Quick Reference Table:** Maps scenarios to prompts and commands

**Key Takeaway:** Copy-paste templates for common AI agent instructions.

---

## File Statistics

| File                                          | Lines | Purpose                         |
| --------------------------------------------- | -----: | ------------------------------- |
| `AGENTS.md`                                   | 119   | High-level architecture & conventions |
| `.github/agents/parser.agent.md`              | TBD   | Parser specialist directives    |
| `.github/instructions/coding-standards.instructions.md` | 261   | Detailed coding standards & workflow |
| `.github/skills/multipart-parsing/SKILL.md`  | 198   | Multipart RFC parsing expertise |
| `.github/skills/ts-library-tooling/SKILL.md` | 320   | Build & toolchain reference     |
| `.github/skills/vitest-testing/SKILL.md`     | 370   | Testing & Vitest reference      |
| `.github/prompts/refactor.prompt.md`          | 176   | Prompt templates for agents     |
| **TOTAL**                                     | **1,444** | **Comprehensive developer guidance** |

---

## How to Use This Documentation

### For AI Agents / Coding Assistants
1. **Start with** `AGENTS.md` to understand project structure and conventions.
2. **Reference** `.github/instructions/coding-standards.instructions.md` when writing/reviewing code.
3. **Use skill docs** (`.github/skills/`) for deep dives into specific areas:
   - Multipart parsing → `multipart-parsing/SKILL.md`
   - Build/toolchain issues → `ts-library-tooling/SKILL.md`
   - Testing & coverage → `vitest-testing/SKILL.md`
4. **Copy prompts** from `.github/prompts/refactor.prompt.md` when instructing AI workers.

### For Repository Contributors
1. Read `AGENTS.md` first to understand the project.
2. Follow `.github/instructions/coding-standards.instructions.md` for code style and git workflow.
3. Reference `.github/skills/vitest-testing/SKILL.md` when writing tests.
4. Check `.github/skills/ts-library-tooling/SKILL.md` when debugging build/lint issues.

### For Project Reviewers
1. Use **Code Review & Testing** prompt from `.github/prompts/refactor.prompt.md` as a checklist.
2. Verify against **Definition of Done** section in `AGENTS.md`.
3. Check coverage thresholds in `.github/skills/vitest-testing/SKILL.md`.

---

## Key Principles (Across All Docs)

### Zero-Dependency Policy
- Runtime: No external npm packages.
- Dev only: SWC, TypeScript, ESLint, Vitest, Prettier.
- Rationale: Security, performance, minimal bundle size.

### Strict TypeScript
- `strict: true`, `noUncheckedIndexedAccess: true`.
- No `any` types; use precise generics.
- All exported functions have JSDoc.

### Testing Excellence
- Coverage: 95%/95%/95% statements/functions/lines, 75% branches.
- Deterministic: No `Math.random()`, time, network.
- Pattern: Happy path, boundary, invalid input, over-capacity.

### Code Quality Pipeline
- `yarn check` = format → lint → typecheck → coverage → build.
- Pre-commit: Format, lint, test.
- Commit: GPG-signed conventional messages.

### RFC Compliance
- Multipart boundaries: `\r\n--<boundary>` and `\r\n--<boundary>--\r\n`.
- Encoding detection: BOM, UTF-8/16/32, ASCII/Latin-1, binary fallback.
- Header parsing: Content-Disposition, Content-Type extraction.

---

## Quick Links by Task

| Task                                | Reference                                              |
| ----------------------------------- | ------------------------------------------------------ |
| Add a new feature                   | Prompts: Feature Addition                              |
| Fix a bug                           | Prompts: Bug Fix or Debugging                          |
| Write unit tests                    | Skills: vitest-testing                                 |
| Debug build/lint/test issues        | Skills: ts-library-tooling (Troubleshooting section)  |
| Parse multipart RFC correctly       | Skills: multipart-parsing                              |
| Prepare a release                   | Prompts: Publishing & Release                          |
| Understand code standards           | Instructions: coding-standards.instructions.md         |
| Review someone's changes            | Prompts: Code Review & Testing                         |
| Refactor and split code             | Prompts: Refactoring & Splitting Utilities             |
| Improve encoding support            | Prompts: Encoding Detection Enhancement                |

---

## Update History

**Last Updated:** 2025-11-13  
**Scope:** Complete overhaul of developer documentation to match project's refactored architecture.

**Changes Made:**
1. ✅ Updated `AGENTS.md` with comprehensive structure and references.
2. ✅ Enhanced `coding-standards.instructions.md` with 261 lines of practical guidance.
3. ✅ Expanded `multipart-parsing/SKILL.md` with detailed RFC, encoding, and testing info.
4. ✅ Expanded `ts-library-tooling/SKILL.md` with troubleshooting and workflow details.
5. ✅ Expanded `vitest-testing/SKILL.md` with real test examples and patterns.
6. ✅ Enhanced `refactor.prompt.md` with 8 reusable prompt templates.

**Total Lines Added:** 1,444+ lines of structured, searchable developer guidance.

---

## Next Steps

- [ ] Review and validate all documentation for accuracy.
- [ ] Test prompt templates by using them with AI agents.
- [ ] Gather feedback from team and iterate.
- [ ] Consider automated enforcement (pre-commit hooks, CI checks).
- [ ] Keep documentation in sync with actual code changes.
