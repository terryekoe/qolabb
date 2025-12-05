# Migration Consolidation Guide

This document identifies redundant and superseded database migration files for future cleanup.

## ⚠️ Important Warning

**Never delete migration files that have already been applied to production databases.**

These migrations should remain in place for existing deployments. This guide is for:
1. Documentation purposes
2. Creating a clean baseline for new deployments
3. Understanding the migration history

---

## Superseded Migrations

### RLS Policy Fixes (Multiple Iterations)
| File | Purpose | Superseded By |
|------|---------|---------------|
| `003_fix_rls_policies.sql` | Initial RLS fixes | `005_final_complete_rls.sql` |
| `004_complete_rls_fix.sql` | More RLS fixes | `005_final_complete_rls.sql` |

### Workspace Join RLS (Duplicates)
| File | Purpose | Superseded By |
|------|---------|---------------|
| `009_fix_workspace_join_rls.sql` | Join RLS fix | `011_fix_workspace_join_rls.sql` |

### Workspace Members Recursion (Many Iterations)
| File | Purpose | Note |
|------|---------|------|
| `020_fix_workspace_members_recursion.sql` | Recursion fix attempt 1 | Superseded |
| `023_fix_workspace_members_recursion_final.sql` | "Final" attempt | Superseded |
| `025_definitive_fix_workspace_members_recursion.sql` | "Definitive" attempt | Superseded |
| `027_force_fix_workspace_members_recursion.sql` | Force fix | Superseded |
| `028_simple_fix_workspace_members.sql` | Simple fix | Superseded |
| `029_emergency_fix_workspace_members_recursion.sql` | Emergency fix | Latest |

### RLS Optimization (Current)
| File | Purpose |
|------|---------|
| `20251205_optimize_rls_policies.sql` | Current optimization |
| `20251205_optimize_rls_policies_down.sql` | Rollback (can be removed if not needed) |

---

## Recommended Actions

### For New Deployments
Create a consolidated baseline migration that includes all final states, avoiding the need for incremental fixes.

### For Existing Deployments
Keep all migrations in place. They are idempotent and won't cause issues.

### For Documentation
This file serves as the authoritative guide for understanding migration history and dependencies.

---

## Migration Categories

| Category | Count | Files |
|----------|-------|-------|
| Initial Schema | 1 | 001 |
| RLS Policies | 10+ | 002-005, 035, 041, 20251205* |
| Workspace Features | 6 | 009-014 |
| Team Features | 8 | 015, 018, 031, etc. |
| Task Features | 5 | 030, 032-033, 037 |
| Profile Features | 3 | 007, 017, 022 |
| Storage | 3 | 008, 040, 045 |
| Communication | 2 | 047, 048 |
| Evaluations | 2 | 046, 048_project |
| Integrations | 1 | 049 |
| Submissions | 3 | 20250127, 20250128, 20251128* |

---

## Files Safe to Note as Legacy

These files are kept for historical compatibility but their changes are superseded:

```
003_fix_rls_policies.sql
004_complete_rls_fix.sql
009_fix_workspace_join_rls.sql
020_fix_workspace_members_recursion.sql
023_fix_workspace_members_recursion_final.sql
025_definitive_fix_workspace_members_recursion.sql
027_force_fix_workspace_members_recursion.sql
028_simple_fix_workspace_members.sql
```

---

*Last Updated: 2025-12-05*
