# AP-Home Platform — Feature Freeze & Stabilization Policy

**Status:** Adopted  
**Effective date:** 2026-10-03  
**Scope:** Entire AP-Home Platform OS

## Decision

AP-Home Platform enters **Feature Freeze / Stabilize & Improve Mode**.

From this point forward, the default rule is:

> **Do not add new features, modules, workflows, services, or architectural layers. Improve the existing system instead.**

A new feature is permitted only when an existing capability cannot fulfill its already-defined purpose without it, and the change is explicitly approved.

## What is allowed

Changes to existing capabilities are allowed when they improve one or more of:

- correctness or AI accuracy
- reliability and production stability
- security
- performance and latency
- operating cost or token/resource usage
- observability needed to diagnose an existing capability
- usability of an existing workflow
- data quality
- bug fixes
- test coverage and regression protection
- documentation needed to operate or maintain the existing system

Refactoring is allowed when it preserves existing product scope and reduces complexity, risk, duplication, or maintenance burden.

## What is frozen

Do not create by default:

- new product features
- new business modules
- new user-facing capabilities
- new workflows that duplicate or extend scope beyond an existing workflow
- new services or infrastructure layers without a demonstrated need
- new AI agents/brains merely because they may be useful
- speculative automation
- architecture added only for possible future requirements

A technically interesting idea is not sufficient justification for implementation.

## Required decision test before any change

Before implementation, answer these questions in order:

1. **Which existing capability is affected?**
2. **What verified problem exists in that capability?**
3. **Can the problem be solved by changing the existing implementation?**
4. **Does the proposed change preserve current product scope?**
5. **What evidence will show that the change improved the system?**
6. **Does it increase recurring cost, operational complexity, or maintenance burden?**

If the problem can be solved inside the existing capability, that path is preferred.

If the proposal expands product scope, it is blocked by Feature Freeze unless explicitly approved as an exception.

## Development principle

The preferred loop is:

**Use existing system → collect evidence → identify repeated/verified problem → improve existing implementation → test → measure**

Avoid:

**Single incident → add a new mechanism/layer → increase architecture → repeat**

One incorrect AI result is evidence to investigate, not automatic justification for a new subsystem.

## AI / QC specific interpretation

For existing AI capabilities such as Construction QC:

Allowed:
- improve detection accuracy
- calibrate severity
- improve evidence handling
- reduce false positives/false negatives
- use human feedback to evaluate the existing engine
- reduce image/token cost
- improve provider fallback reliability
- fix inconsistent decisions
- maintain regression tests for existing behavior

Frozen:
- additional QC products or modes
- new AI agents around QC
- new architectural layers solely to improve one isolated case
- unrelated QC features not required by the current workflow

The existing production flow remains the product boundary:

**Input → existing workflow → Hub/Brain logic → AI evaluation → stored result → human feedback/measurement**

## Architecture rule

Prefer modification of an existing component over creation of another component.

A new component is justified only if all are true:

1. the existing component cannot reasonably own the responsibility;
2. the need is demonstrated by production evidence;
3. no simpler change can solve it;
4. operating and maintenance cost are understood;
5. the owner explicitly approves the exception.

## Cost rule

Feature Freeze also protects the platform's operating-cost constraint.

Any improvement should avoid increasing recurring infrastructure or AI cost unless the measurable benefit justifies it. Cost reduction that preserves required behavior is explicitly encouraged.

## Definition of improvement

An improvement must have a measurable or verifiable before/after condition where practical, for example:

- error resolved
- accuracy or feedback outcome improved
- fewer failures
- lower latency
- lower token/image usage
- lower recurring cost
- reduced security exposure
- simpler implementation with equivalent behavior

"More capability" by itself is not an improvement under this policy.

## Exception process

If a future need appears to require a new feature:

1. document the unmet business/operational need;
2. show why existing capabilities cannot satisfy it;
3. estimate complexity, recurring cost, and risk;
4. define the smallest possible scope;
5. obtain explicit approval before implementation.

Until approval, the proposal remains **not implemented**.

## Working mode

The platform is therefore considered to be in:

**STABILIZE & IMPROVE MODE**

not:

**FEATURE EXPANSION MODE**

This policy applies across frontend, Backend Hub, Brains, Supabase, n8n workflows, AI providers, integrations, operational tooling, and documentation.
