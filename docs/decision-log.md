# Rendering Strategy Decision Log

This log records why each route in Nextmart uses its chosen rendering strategy.
Update it whenever a route is added or its strategy changes.

## Column Schema

| Column | Description |
|---|---|
| **Route** | App Router path, e.g. `/(challenges)/c02-catalog` |
| **Strategy** | `Static` / `ISR` / `PPR` / `SSR` / `Client` / `Edge` |
| **Why** | One-sentence rationale |
| **Cached?** | `Yes` / `No` / `Partial` (for PPR) |
| **First paint** | Expected performance characteristic |

---

## Routes

| Route | Strategy | Why | Cached? | First paint |
|---|---|---|---|---|
| `/` (challenge index) | Static | Auto-discovered challenge list is build-time only; no runtime data needed. Re-run build to add a new challenge. | Yes | Immediate (pre-rendered HTML) |

---

<!-- Add one row per challenge route as they are implemented.  Example rows: -->
<!--
| `/(challenges)/c02-catalog` | ISR (revalidate=300) | Product catalog changes infrequently but must not require a full redeploy every 5 minutes. | Yes (stale-while-revalidate) | Immediate (static shell) |
| `/(challenges)/c04-product-detail` | PPR | Shell is static; price and stock are dynamic per-request. | Partial (shell cached, dynamic island live) | Immediate shell + streaming dynamic |
| `/(challenges)/c07-data-fetching` | SSR | Demonstrates waterfall fetch patterns; dynamic by design. | No | After server fetch |
-->
