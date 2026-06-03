# Ad Budget Pacing Dashboard

View the live dashbaord site here: https://danfei-byte.github.io/budget-pacing-dashboard/

Serve this folder from a static host or local web server, then open the served URL in a browser.

Local example:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8765/`.

The dashboard calculates:

- Gross planned budget by campaign and channel.
- MTD gross spend from in-platform net spend.
- Audience fee at `impressions / 1000 * CPM` for Campaign C.
- Remaining gross budget, spend percent, timing percent, and gap.
- Saved pacing snapshots by record date.

The seeded values are sample May 20, 2026 pacing data with anonymized campaign names.
