# Vacation Planner

A yearly vacation planner: one client-only web page with no backend, no accounts and no sync. Trips and settings live in the browser's `localStorage`.

- Endless calendar of years (1950–2099) with weekends and public holidays marked; holiday names show in a tooltip on hover or keyboard focus
- Public holidays for every country [Nager.Date](https://date.nager.at) covers, with an optional region (ISO 3166-2 subdivision) for countries whose holidays differ by state or nation
- Days-off counting per calendar year: weekends and holidays are free
- A heat map view (the flame button in the header) that shades every working day by its value: the most days off per day of leave that a block of up to a working week through it can buy around a public holiday. A regular Monday or Friday with nothing else around stays bare, bridge days next to public holidays glow, a day that joins two hits into one long break gets heat too, and the weekends and holidays inside a break take its heat so the whole length of a vacation shows as one band; hover or focus a shaded day for the figures and the block
- Today returns to the current year, or on phones, where months stack in one column, to the current month; the app opens there too
- Sidebar with a summary, a New Trip form (a date-range picker, or click two days in the calendar) and the trips of the year in view; removing a trip can be undone from the toast
- Settings popover: holidays on/off, searchable country list, region, week start, days off per year
- Light, dark and system appearance; on phones the sidebar opens as a sheet

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (holiday engine, counting rules, day-cell states, heat levels)
npm run typecheck
npm run build      # type-checks, then writes dist/
npm run preview    # serves dist/
```

Stack: Vite, TypeScript, React 19, Tailwind CSS v4 and [shadcn/ui](https://ui.shadcn.com) (Radix base, Vega style, neutral base colour with the blue theme, Lucide icons). No date library: all date maths runs in UTC via `Date.UTC` and dates are stored as `YYYY-MM-DD` strings; only the date-range picker (react-day-picker) works in local `Date` objects at its edges. Inter is self-hosted from `@fontsource-variable/inter`.

Layout:

- `src/lib` holds the pure logic (`dates.ts`, `nager.ts`, `holidayStore.ts`, `holidays.ts`, `calendar.ts`, `storage.ts`, `palette.ts`). `calendar.ts` builds a semantic model of every day (trip, draft, holiday, weekend; band joins; first/last day; the day's value for the heat map) and leaves colours to the components.
- `src/components/ui` is the shadcn/ui registry output, as `npx shadcn add` installs it; `components.json` is configured so more components can be added the same way. `src/components` holds the app's own pieces: `app-sidebar`, `app-header`, `year-calendar`, `heat-scale`, `date-range-picker`, `settings-popover`, `theme-toggle`, `theme-provider`.
- `src/hooks/use-year-scroller.ts` runs the endless year list (anchored prepends, year- and month-in-view sync, jumps to a year or a month).
- `src/index.css` imports Tailwind and `shadcn/tailwind.css` and defines the design tokens as CSS custom properties, plus three small utilities that colour trip days from a `--trip` custom property and the `--heat-1`…`--heat-4` ramp of the heat map with a darker `--heat-N-free` shade per step for the free days inside a break (one orange hue; dark mode has its own steps).

## Heat map

The heat map keeps the same year grid and shades each working day by its value, `bestBlock` and `valueOf` in `calendar.ts`. Every run of up to five working days through the day whose break takes in a public holiday is a candidate block of leave; the weekends and public holidays inside it and touching either end come free, and the block's value is its days off per day of leave. The day takes its best block, the longest break among equals. A regular Friday buys 3 days for 1 but captures no holiday, so with nothing else around it stays bare, and so does its weekend; the Thursday before a Friday holiday buys 4 for 1; a Monday between the New Year holidays and Epiphany can buy 7 for 1. A plain day wedged between two such days joins them: with Mon 30 Nov and Tue 1 Dec 2026 off in Romania, Wed 2 Dec buys 5 for 1 and Thu 3 Dec would buy nothing alone, but Wed–Fri buys Sat 28 Nov – Sun 6 Dec, 9 days for 3, so Thu 3 gets the same heat as a regular Friday and Fri 4's tooltip names the chain. Likewise Mon 4 and Tue 5 Jan 2027 together buy Fri 1 – Thu 7 for 2 days of leave. Below two and a half days off per day of leave nothing shows, which keeps a five-day block that merely reaches back to a holiday off the map; up to 3 is the faintest step of the orange ramp, up to 4 and up to 5 are the two middle steps and more than 5 is the hottest. The same value always has the same colour in every year. Trips are left out of the value on purpose: it describes the calendar, not the plan. Weekends and holidays take the heat of the strongest break that covers them and join its band, in a darker and duller shade of the step so that a band shows which days cost leave and which are already free, and the whole length of a vacation shows at a glance: a regular weekend wears the faint tint of its Friday and Monday, Christmas Day the medium step of the Thursday before it, and the first ten days of January 2027 glow from end to end. Where no break reaches, they keep the backgrounds they have in the calendar view. Planned trips show as solid bands in their colour, and the range being picked is outlined over whatever it covers. With holidays turned off, or before their data arrives, nothing is shaded.

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

`vp-apple-v1` holds `{ trips, settings }` (settings include the calendar view, `calendar` or `heatmap`); `vp-holidays-v1` and `vp-countries-v1` hold the Nager.Date cache; `vp-theme` holds the appearance choice. A missing, corrupt or blocked store falls back to the defaults and three seed trips for 2026. Clear site data to start over.
