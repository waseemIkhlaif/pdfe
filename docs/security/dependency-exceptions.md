# Dependency exceptions

A high or critical dependency finding may be merged only if it has a row here with an unexpired date. Maximum validity is 90 days. Rows are self-attested in solo mode.

| Package | Advisory ID | Severity | Reason | Expires (YYYY-MM-DD) | Attested by |
|---|---|---|---|---|---|
| picomatch | GHSA-FC5Q-39XC-VJPF | high | ReDoS through repeated extglobs. Reachable only through dev tooling (typescript-eslint, tinyglobby, fdir) that matches this repository's own file names, never untrusted patterns or input, and not shipped in any image. No patched version exists yet (fix is 4.0.8, latest published is 4.0.7). Revisit when 4.0.8 is published: add a pnpm override and delete this row. | 2026-12-17 | waseemikh (owner, solo mode), approved 2026-11-17 |
