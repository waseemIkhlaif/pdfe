# Sitemap: Merchant portal

Primary navigation for the merchant portal. Target screens are IDs from `docs/design/screen-inventory.md`; the full screen list per interface is in the inventory.

```mermaid
flowchart TD
  SHELL["Merchant portal"]
  SHELL --> MER_NAV_01["nav.mer.dashboard"]
  SHELL --> MER_NAV_02["nav.mer.payments"]
  SHELL --> MER_NAV_03["nav.mer.refunds"]
  SHELL --> MER_NAV_04["nav.mer.settlements"]
  SHELL --> MER_NAV_05["nav.mer.staff"]
  SHELL --> MER_NAV_06["nav.mer.statements"]
  SHELL --> MER_NAV_07["nav.mer.invoices"]
```

| Nav ID | Label key | Target screen | Roles |
|---|---|---|---|
| MER-NAV-01 | nav.mer.dashboard | MER-003 | PER-03 |
| MER-NAV-02 | nav.mer.payments | MER-006 | PER-03 |
| MER-NAV-03 | nav.mer.refunds | MER-011 | PER-03 |
| MER-NAV-04 | nav.mer.settlements | MER-012 | PER-03 |
| MER-NAV-05 | nav.mer.staff | MER-015 | PER-03 |
| MER-NAV-06 | nav.mer.statements | MER-016 | PER-03 |
| MER-NAV-07 | nav.mer.invoices | MER-017 | PER-03, PER-04 |
