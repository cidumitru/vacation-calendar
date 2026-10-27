# Vacation Planner

A yearly vacation planner in the Apple style: one client-only web page with no backend, no accounts and no sync. Trips and settings live in the browser's `localStorage`.

- Endless calendar of years (1950–2099) with weekends and public holidays marked
- Public holidays for every country [Nager.Date](https://date.nager.at) covers, with an optional region (ISO 3166-2 subdivision) for countries whose holidays differ by state or nation
- Days-off counting per calendar year: weekends and holidays are free
- Sidebar with a summary, a New Trip form (or click two days in the calendar) and the trips of the year in view
- Settings popover: holidays on/off, region, week start, days off per year

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (holiday engine, counting rules, day-cell states)
npm run typecheck
npm run build      # type-checks, then writes dist/
npm run preview    # serves dist/
```

Stack: Vite, TypeScript, React 18. No UI kit, no date library: all date maths runs in UTC via `Date.UTC` and dates are stored as `YYYY-MM-DD` strings.

Layout: `src/lib` holds the pure logic (`dates.ts`, `nager.ts`, `holidayStore.ts`, `holidays.ts`, `calendar.ts`, `storage.ts`, `palette.ts`), `src/components` the hand-built controls, `src/styles.css` the design tokens as CSS custom properties.

## Public holidays

Holidays come from the Nager.Date API, one request per country and year, only for the years on screen:

- `GET https://date.nager.at/api/v3/PublicHolidays/{year}/{country}` and `GET /api/v3/AvailableCountries` (the country list in Settings).
- Only entries typed `Public` count as a day off. A holiday applies when it is nationwide (`global`) or its `counties` include the selected region.
- Responses are cached in memory and in `localStorage` (`vp-holidays-v1`, `vp-countries-v1`), capped at 200 country-years. An entry older than 30 days is shown at once and refreshed in the background.
- Offline or on an error, saved data keeps working; a year with no data shows the error in Settings with a Retry button and its holidays simply cost like weekdays until data arrives.

## Deploy to GitHub Pages

`.github/workflows/deploy.yml` builds and publishes the site on every push to `main` (and on demand from the Actions tab):

1. In the repository go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to `main`. The workflow runs the tests, builds with `BASE_PATH=/<repo-name>/` so assets resolve under the project URL, and deploys `dist/`.
3. The site is published at `https://<owner>.github.io/<repo-name>/`.

For a user or organisation site, or a custom domain, set `BASE_PATH` to `/` in the workflow.

## Storage

`vp-apple-v1` holds `{ trips, settings }`; `vp-holidays-v1` and `vp-countries-v1` hold the Nager.Date cache. A missing, corrupt or blocked store falls back to the defaults and three seed trips for 2026. Clear site data to start over.
