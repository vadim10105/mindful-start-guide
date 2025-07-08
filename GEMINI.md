# Gemini Assistant Guidelines

This document provides guidelines for the Gemini assistant when working on this project.

## Core Principles

1.  **Surgical Changes:** When modifying the code, make the smallest, most targeted changes possible. Avoid large-scale refactoring unless it is the explicit goal. The priority is to implement the requested change without introducing side effects.

2.  **Pre-emptive Verification:** Before reporting that a task is complete, you must verify your changes. This includes, but is not limited to:
    *   Running the project's test suite.
    *   Checking for linting and type errors.
    *   Ensuring the application builds and runs successfully.
    Any errors must be fixed before presenting the final result.

3.  **Simplified, Architectural Explanations:** When explaining your work, use simple, non-technical language. Focus on *where* in the project you made changes (e.g., "I updated the main login page," or "I modified a UI button component") and *why* you made them. Avoid code snippets or deep technical jargon. The goal is to help me understand the overall project structure and how its different parts fit together.
