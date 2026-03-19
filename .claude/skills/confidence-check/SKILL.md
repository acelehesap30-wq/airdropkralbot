---
name: Confidence Check
description: Pre-implementation confidence assessment (≥90% required). Use before starting any implementation to verify readiness with duplicate check, architecture compliance, official docs verification, OSS references, and root cause identification.
---

# Confidence Check Skill

## Purpose

Prevents wrong-direction execution by assessing confidence **BEFORE** starting implementation.

**Requirement**: ≥90% confidence to proceed with implementation.

## Confidence Assessment Criteria

Calculate confidence score (0.0 - 1.0) based on 5 checks:

### 1. No Duplicate Implementations? (25%)
- Search codebase for existing functionality
- Pass if no duplicates found

### 2. Architecture Compliance? (25%)
- Verify tech stack alignment with CLAUDE.md, PLANNING.md, blueprint
- Confirm existing patterns used
- Avoid reinventing existing solutions

### 3. Official Documentation Verified? (20%)
- Review official docs before implementation
- Verify API compatibility

### 4. Working OSS Implementations Referenced? (15%)
- Find proven implementations
- Search GitHub for examples

### 5. Root Cause Identified? (15%)
- Analyze error messages
- Check logs and stack traces
- Identify underlying issue

## Confidence Score Calculation

```
Total = Check1 (25%) + Check2 (25%) + Check3 (20%) + Check4 (15%) + Check5 (15%)

If Total >= 0.90:  ✅ Proceed with implementation
If Total >= 0.70:  ⚠️  Present alternatives, ask questions
If Total < 0.70:   ❌ STOP - Request more context
```

## Output Format

```
📋 Confidence Checks:
   ✅ No duplicate implementations found
   ✅ Uses existing tech stack
   ✅ Official documentation verified
   ✅ Working OSS implementation found
   ✅ Root cause identified

📊 Confidence: 1.00 (100%)
✅ High confidence - Proceeding to implementation
```

## ROI

**Token Savings**: Spend 100-200 tokens on confidence check to save 5,000-50,000 tokens on wrong-direction work.
