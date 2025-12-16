# Claude Code Agents: Comprehensive Guide for Soteria Health Mobile

This guide explains how to leverage Claude Code's agents feature to accelerate your app development workflow.

---

## Table of Contents

1. [What Are Agents?](#1-what-are-agents)
2. [Built-in Agent Types](#2-built-in-agent-types)
3. [When to Use Agents vs Direct Commands](#3-when-to-use-agents-vs-direct-commands)
4. [Creating Custom Agents](#4-creating-custom-agents)
5. [Best Practices](#5-best-practices)
6. [Recommended Agents for This Project](#6-recommended-agents-for-this-project)
7. [Action Plan](#7-action-plan)

---

## 1. What Are Agents?

**Agents** (officially called "subagents") are specialized AI assistants that Claude Code can delegate tasks to. Each agent:

- Operates with its own **dedicated context window** (separate from main conversation)
- Has a **custom system prompt** defining its expertise and behavior
- Maintains **independent tool access** (you control which tools each agent can use)
- Provides **focused expertise** for domain-specific tasks

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Context Isolation** | Agents don't pollute your main conversation context |
| **Parallel Work** | Multiple agents can work on different tasks simultaneously |
| **Specialized Expertise** | Domain-specific knowledge encoded in system prompts |
| **Reusability** | Same agent can be used across sessions and shared with team |

### How Invocation Works

**Automatic Delegation** - Claude analyzes your request and routes to appropriate agent:
```
> analyze the Harmony system for potential bugs
# Claude automatically delegates to harmony-specialist if available
```

**Explicit Invocation** - You request a specific agent:
```
> use the code-reviewer agent to check the auth module
> have the explore agent find all health team permission checks
```

---

## 2. Built-in Agent Types

Claude Code includes three built-in agents optimized for different workflows:

### Explore Agent (Fast, Read-Only)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Fast codebase analysis and searching |
| **Tool Access** | Glob, Grep, Read only (no modifications) |
| **Model** | Claude Haiku (optimized for speed) |
| **Best For** | Understanding structure, finding code, analyzing patterns |

**Example Use Cases:**
```
> use the explore agent to find all files that import AuthContext
> have the explore agent map out the routine builder's dependencies
> use explore to search for places where we handle RLS policies
```

### Plan Agent (Strategy & Architecture)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Deep analysis before implementation |
| **Tool Access** | Glob, Grep, Read only |
| **Special Mode** | Generates detailed strategy before showing results |
| **Best For** | Planning refactors, understanding architecture, requirements analysis |

**Example Use Cases:**
```
> use the plan agent to create a strategy for adding video exercises
> have the plan agent analyze what needs to change for offline support
> use plan to design the notification system architecture
```

### General-Purpose Agent (Full Capability)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Complex, multi-step tasks requiring exploration AND modification |
| **Tool Access** | All tools (Glob, Grep, Read, Write, Bash, etc.) |
| **Model** | Claude Sonnet (full capability) |
| **Best For** | Complete features, refactors, bug fixes with multiple steps |

**Example Use Cases:**
```
> implement the new onboarding flow for recovery users
> refactor the routine builder to support templates
> debug and fix why dashboard preloading fails on slow connections
```

---

## 3. When to Use Agents vs Direct Commands

### Use Agents When:

✅ **Complex, multi-step tasks**
```
> have the general-purpose agent implement the health team dashboard
```

✅ **Open-ended exploration**
```
> use the explore agent to understand how pain check-ins work
```

✅ **Architecture planning**
```
> use the plan agent to design the social features refactor
```

✅ **Domain-specific expertise needed**
```
> have the harmony-specialist debug the streak calculation
```

✅ **You want context isolation** (keep main conversation clean)

### Use Direct Commands When:

✅ **Simple, single-step tasks**
```
> read app/(tabs)/index.tsx
> search for "isHealthTeam" in the codebase
```

✅ **Quick lookups or status checks**
```
/context
/todos
```

✅ **You need to reference earlier conversation context**

✅ **Immediate inline results needed**

---

## 4. Creating Custom Agents

### Directory Structure

```
.claude/agents/           # Project-level (shared via git)
├── code-reviewer.md
├── harmony-specialist.md
└── health-team-expert.md

~/.claude/agents/         # Personal (only available to you)
├── my-templates.md
└── experimental.md
```

### Agent File Format

Agents are Markdown files with YAML frontmatter:

```markdown
---
name: agent-name
description: >
  Clear description of what this agent does and when Claude should use it.
  Include specific examples of tasks this agent handles.
allowed-tools: Glob, Grep, Read, Bash
---

You are a [role description]. You understand:
- [Domain knowledge point 1]
- [Domain knowledge point 2]
- [Domain knowledge point 3]

## When Analyzing Code

1. [Step 1 of your process]
2. [Step 2 of your process]
3. [Step 3 of your process]

## Key Patterns to Look For

- [Pattern 1]
- [Pattern 2]
```

### Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Lowercase with hyphens, max 64 chars (e.g., `harmony-specialist`) |
| `description` | Yes | When/how Claude should use this agent, max 1024 chars |
| `allowed-tools` | No | Tools the agent can access (security boundary) |
| System prompt | Yes | Everything after frontmatter |

### Tool Access Levels

```yaml
# Read-only (safest - analysis and planning)
allowed-tools: Glob, Grep, Read

# Read + terminal (can run commands but not edit files)
allowed-tools: Glob, Grep, Read, Bash

# Full access (trusted automations only)
allowed-tools: Glob, Grep, Read, Write, Bash
```

---

## 5. Best Practices

### Single Responsibility Principle

**Good:**
```yaml
name: harmony-specialist
description: >
  Analyzes and implements changes exclusively to Harmony system.
  Use when working on harmony status, streak tracking, or related features.
```

**Avoid:**
```yaml
name: general-everything-agent
description: >
  Handles any task related to routines, health teams, or dashboards.
  # TOO BROAD - Claude won't know when to use it
```

### Write Clear Descriptions

The `description` field determines when Claude automatically delegates:

**Good** (specific activation criteria):
```yaml
description: >
  Specializes in the Harmony system including streak tracking, daily balance,
  and Harmony-gated advanced routines. Use for any Harmony-related implementation
  or debugging. Examples: streak not updating, balance calculation wrong,
  advanced routine access issues.
```

**Bad** (too vague):
```yaml
description: >
  Handles harmony stuff.
```

### Limit Tool Access

Start with minimal access, expand only if needed:

```yaml
# Start here for new agents
allowed-tools: Glob, Grep, Read

# Add Bash if agent needs to run commands
allowed-tools: Glob, Grep, Read, Bash

# Only add Write for trusted, well-tested agents
allowed-tools: Glob, Grep, Read, Write, Bash
```

### Version Control Your Agents

Store project agents in `.claude/agents/` so your team gets them automatically:

```bash
git add .claude/agents/
git commit -m "Add custom Claude agents for project"
```

---

## 6. Recommended Agents for This Project

Based on the Soteria Health Mobile codebase, here are recommended custom agents:

### Harmony Specialist

```markdown
---
name: harmony-specialist
description: >
  Expert on the Harmony system including streak tracking, daily balance calculations,
  and Harmony-gated advanced routines. Use for any Harmony-related implementation,
  debugging, or analysis. Examples: streak not updating, balance calculation issues,
  advanced routine access, HarmonyProgressCard or HarmonyModal changes.
allowed-tools: Glob, Grep, Read, Bash
---

You are a Harmony System Specialist for the Soteria Health Mobile app.

## Core Knowledge

The Harmony system tracks user wellness balance:
- **Harmony Status**: Achieved by completing balanced routines for 7 consecutive days
- **Balanced Day**: At least 1 routine in each category (Mind, Body, Soul)
- **Advanced Routines**: Premium content requiring Harmony to access

## Key Files

- `lib/utils/harmony.ts` - Core harmony logic
- `components/HarmonyProgressCard.tsx` - Dashboard card
- `components/HarmonyModal.tsx` - Detailed modal
- `types/index.ts` - HarmonyStatus type definition

## HarmonyStatus Structure

```typescript
interface HarmonyStatus {
  isInHarmony: boolean
  consecutiveBalancedDays: number
  daysUntilHarmony: number
  mindToday, bodyToday, soulToday: number
  isTodayBalanced: boolean
  dailyHistory: DailyBalanceRecord[]
}
```

## When Debugging

1. Check `calculateConsecutiveBalancedDays()` logic
2. Verify `dailyHistory` data freshness
3. Confirm UI displays match backend data
4. Review database triggers if streak isn't updating
```

### Health Team Expert

```markdown
---
name: health-team-expert
description: >
  Understands health team permissions, RLS policies, and official routine management.
  Use when implementing health team features, debugging permission errors, or working
  with official routines. Examples: "permission denied" errors, health team invitations,
  official routine CRUD operations.
allowed-tools: Glob, Grep, Read, Bash
---

You are a Health Team Expert for the Soteria Health Mobile app.

## Core Knowledge

Health team members have elevated permissions:
- **Roles**: 'user' | 'health_team' | 'admin'
- **Official Routines**: Created by health team, `author_type = 'official'`
- **Advanced Routines**: Can mark routines as `is_advanced = true`

## Key Files

- `lib/utils/health-team.ts` - Health team functions
- `sql/migrations/add_health_team_*.sql` - RLS policies
- `components/HealthTeamInvitationCard.tsx` - Invitation UI

## Permission Patterns

```typescript
// Always check role before showing health team features
const isHealthTeam = await isHealthTeamMember(user.id);
if (isHealthTeam) {
  // Show health team UI
}
```

## RLS Policy Pattern

```sql
-- Health team can modify official routines
CREATE POLICY "health_team_can_update_official_routines"
ON routines FOR UPDATE
USING (
  (author_type = 'official' AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('health_team', 'admin')
  ))
  OR (is_custom = true AND created_by = auth.uid())
);
```

## Common Issues

1. **"Permission denied"** - Check RLS policies and user role
2. **Update/delete not working** - Verify `author_type` matches policy
3. **Invitation issues** - Check `health_team_invitations` table and constraints
```

### Routine Builder Specialist

```markdown
---
name: routine-builder-specialist
description: >
  Deep knowledge of the routine builder workflow including the 4-step flow
  (Journey → Exercises → Metadata → Review), validation, and data persistence.
  Use for builder implementation, debugging, or UX improvements.
allowed-tools: Glob, Grep, Read, Bash
---

You are a Routine Builder Specialist for the Soteria Health Mobile app.

## Core Knowledge

The routine builder is a 4-step wizard:
1. **Journey Focus** - Select Injury Prevention and/or Recovery
2. **Exercises** - Add/edit/reorder exercises with durations
3. **Metadata** - Name, description, category, difficulty, tags, body parts, benefits
4. **Review** - Preview and save/update

## Key Files

- `app/(tabs)/builder.tsx` - Main builder component
- `lib/utils/routine-builder.ts` - Save/update/validation logic
- `components/DraggableExerciseList.tsx` - Exercise list component
- `types/index.ts` - RoutineBuilderData type

## RoutineBuilderData Structure

```typescript
interface RoutineBuilderData {
  name: string
  description: string
  category: 'Mind' | 'Body' | 'Soul'
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  journey_focus: string[]
  exercises: Exercise[]
  tags?: string[]
  body_parts?: string[]
  benefits?: string[]
  is_advanced?: boolean  // Health team only
}
```

## Critical Patterns

- Navigation buttons must NOT use `position: 'absolute'` (causes scroll issues)
- Use simple tap buttons, NOT swipe gestures (causes crashes)
- Max 30 exercises, max 4 tags/body_parts/benefits each
- Validation runs on each step before allowing navigation
```

### Code Reviewer

```markdown
---
name: code-reviewer
description: >
  Reviews React Native and TypeScript code for bugs, type safety, performance,
  and mobile-specific best practices. Use when seeking code quality feedback
  or before committing significant changes.
allowed-tools: Glob, Grep, Read
---

You are a Code Review Specialist for React Native and TypeScript.

## Review Checklist

### Type Safety
- [ ] No `any` types without justification
- [ ] Proper null checks and optional chaining
- [ ] Strict TypeScript mode compliance

### React Native Patterns
- [ ] Correct hook dependencies in useEffect/useCallback/useMemo
- [ ] No memory leaks (cleanup in useEffect)
- [ ] Proper loading/error state handling
- [ ] Avoid unnecessary re-renders

### Error Handling
- [ ] Try-catch blocks for async operations
- [ ] User-friendly error messages
- [ ] Proper Supabase error checking: `if (error) { ... }`

### Mobile UX
- [ ] Loading indicators for async operations
- [ ] Confirmation dialogs for destructive actions
- [ ] Proper keyboard handling

### Security
- [ ] No hardcoded secrets or API keys
- [ ] Sensitive data not logged
- [ ] RLS policies verified for data access

## When Reviewing

1. Read the file(s) being reviewed
2. Check against each category above
3. Provide specific line numbers for issues
4. Suggest concrete fixes, not vague advice
```

---

## 7. Action Plan

### Phase 1: Setup (Today)

1. **Create the agents directory:**
   ```bash
   mkdir -p .claude/agents
   ```

2. **Create the four recommended agents:**
   - `.claude/agents/harmony-specialist.md`
   - `.claude/agents/health-team-expert.md`
   - `.claude/agents/routine-builder-specialist.md`
   - `.claude/agents/code-reviewer.md`

3. **Commit to git:**
   ```bash
   git add .claude/agents/
   git commit -m "Add custom Claude Code agents for project"
   ```

### Phase 2: Daily Usage Patterns

**Morning Development:**
```
> use the explore agent to understand how [feature] works
> use the plan agent to design the implementation for [task]
```

**Implementation:**
```
> implement [feature] following the plan above
# Or for domain-specific work:
> have the harmony-specialist implement [harmony feature]
```

**Before Committing:**
```
> use the code-reviewer agent to review my changes to [files]
```

**Debugging:**
```
> have the [specialist] agent debug why [issue]
```

### Phase 3: Advanced Patterns

**Chaining Agents:**
```
Step 1: > use explore agent to understand the current auth flow
Step 2: > use plan agent to design the OAuth integration
Step 3: > implement the OAuth integration following the plan
```

**Creating New Agents:**
When you find yourself repeatedly explaining context for a domain:
1. Note the key files, patterns, and knowledge
2. Create a new agent in `.claude/agents/`
3. Test with explicit invocation
4. Refine based on results

### Quick Reference Commands

| Command | Purpose |
|---------|---------|
| `/agents` | View all available agents |
| `use the explore agent to...` | Fast, read-only codebase search |
| `use the plan agent to...` | Architecture and planning |
| `have the [agent] agent...` | Explicit agent delegation |

---

## Summary

Claude Code agents are powerful tools for:

1. **Isolating complex work** from your main conversation
2. **Encoding domain expertise** in reusable system prompts
3. **Parallelizing development** across multiple specialized assistants
4. **Maintaining consistency** across team workflows

Start with the built-in agents (Explore, Plan, General-Purpose), then create custom agents for your project's specific domains as patterns emerge.

---

*Last Updated: December 2024*
