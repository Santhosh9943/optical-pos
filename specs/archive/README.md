# OptixOS — Completed Specs Archive

This directory stores completed, verified, and merged feature specifications.

---

## Archival Policy
1. When a feature in `specs/{feature-id}/` is fully implemented, passes all Playwright tests, and is merged to `main`, move the folder here:
   ```bash
   mv specs/024-feature-name specs/archive/024-feature-name
   ```
2. Archived specs serve as historical documentation of technical decisions and requirements for future reference.
3. Active AI development should only look at active feature directories in `specs/` to keep context windows compact and token-efficient.
