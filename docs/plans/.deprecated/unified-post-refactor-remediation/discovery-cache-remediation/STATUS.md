# Discovery Cache Remediation - Status

## Current Status: **Planning Complete (Simplified)**

**Last Updated**: December 18, 2024

---

## Summary

The MuSig2 discovery cache has issues preventing proper persistence between page reloads. After reviewing `docs/architecture/` guidelines, the original plan was **simplified** to avoid over-engineering.

**Key Insight**: The root cause is `require()` vs `import()` creating separate module instances. The fix is minimal.

---

## Root Cause

The store uses `require()` to import the discovery cache module, while the service uses dynamic `import()`. This creates different module instances, causing data to be written to one cache but read from another.

---

## Document Index

| Document                                       | Description                               | Status      |
| ---------------------------------------------- | ----------------------------------------- | ----------- |
| [00_OVERVIEW.md](./00_OVERVIEW.md)             | Executive summary and root cause analysis | ✅ Complete |
| [01_CRITICAL_FIXES.md](./01_CRITICAL_FIXES.md) | Phase 1 minimal fixes                     | ✅ Complete |
| [03_TESTING.md](./03_TESTING.md)               | Testing and verification procedures       | ✅ Complete |

**Deprecated**: `02_ARCHITECTURE_IMPROVEMENTS.md` - Removed as over-engineered (plugins, sync intervals, etc.)

---

## Implementation Progress

### Phase 1: Critical Fixes (P0) - Minimal Changes

| Task                                            | Priority | Status     | Notes               |
| ----------------------------------------------- | -------- | ---------- | ------------------- |
| 1.1 Replace `require()` with top-level `import` | P0       | ⏳ Pending | **ROOT CAUSE FIX**  |
| 1.2 Add `beforeunload` handler                  | P0       | ⏳ Pending | Flush pending saves |
| 1.3 Add diagnostic logging                      | P0       | ⏳ Pending | Debug visibility    |

### Phase 2: Optional Improvements (P2)

| Task                             | Priority | Status     | Notes    |
| -------------------------------- | -------- | ---------- | -------- |
| 2.1 Add `saveImmediate()` method | P2       | ⏳ Pending | Optional |
| 2.2 Add cache statistics getter  | P2       | ⏳ Pending | Optional |

### Removed from Plan (Over-Engineering)

| Original Task                      | Reason                                 |
| ---------------------------------- | -------------------------------------- |
| Create cache initialization plugin | Plugins are for SDK init only          |
| Cache sync interval                | Event-driven architecture handles this |
| Cache integrity verification       | JSON.parse handles validation          |
| Instance counter/validation        | Unnecessary if imports are correct     |

---

## Files to Modify

| File                          | Change                                 | Lines |
| ----------------------------- | -------------------------------------- | ----- |
| `stores/musig2.ts`            | Add import, remove 2 `require()` calls | ~5    |
| `services/discovery-cache.ts` | Add `isDirty`, `beforeunload`, logging | ~20   |

---

## Estimated Effort

| Phase                   | Effort         |
| ----------------------- | -------------- |
| Phase 1: Critical Fixes | **45 minutes** |
| Phase 2: Optional       | 30 minutes     |
| **Total**               | **~1 hour**    |

---

## Architecture Compliance

Per `docs/architecture/03_SERVICES.md`:

- ✅ Services remain **stateless wrappers**
- ✅ No new plugins (plugins are for SDK init only)
- ✅ Follow existing `services/storage.ts` patterns
- ✅ Use **callback-based events** (existing pattern)

---

## Next Steps

1. Implement Phase 1 fixes (~45 min)
2. Test basic persistence manually
3. Done

---

_Status: Planning Complete - Ready for Implementation_
