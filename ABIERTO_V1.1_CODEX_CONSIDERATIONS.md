# Abierto v1.1: Codex Decisions

**Phase 1 Auth:** Simplified (code + pwd + rate limit, 4hr) OR full email login (6hr)?

**Phase 3 Backup:** Supabase Storage OR AWS S3? + test restore before launch.

**Phase 4 Offline:** Graceful degradation (v1.1) OR queued actions (v1.2)?

**Testing:** Smoke tests now, Jest/CI later.

**Health check:** Verify DB connectivity, not just app startup.

**Signing key:** Store securely (not in repo/email).
