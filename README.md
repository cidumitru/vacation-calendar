# Vacation Planner

A yearly vacation planner: one client-only web page with no backend, no accounts and no sync. Trips and settings live in the browser's `localStorage`.

- Endless calendar of years (1950–2099) with weekends and public holidays marked; holiday names show in a tooltip on hover or keyboard focus
- Public holidays for 200+ countries, computed in the browser from the rules of [date-holidays](https://github.com/commenthol/date-holidays), with an optional region for the countries whose holidays differ by state or nation
- Days-off counting per calendar year: weekends and holidays are free
- A heat map view (the flame button in the header) that shades every working day by its value: the most days off per day of leave that a block of up to a working week through it can buy around a public holiday. A regular Monday or Friday with nothing else around stays bare, bridge days next to public holidays glow, a day that joins two hits into one long break gets heat too, and the weekends and holidays inside a break take its heat so the whole length of a vacation shows as one band; hover or focus a shaded day for the figures and the block
- Today returns to the current year, or on phones, where months stack in one column, to the current month; the app opens there too
- Sidebar with a summary and the trips of the year in view; removing a trip can be undone from the toast
- A new trip starts in the calendar: click a first day, then a last day (the same day twice for one day), and a popover on that day shows the dates with a date-range picker to adjust them, the days off work it costs and the public holidays it includes, and takes a name; Enter adds, Esc cancels, and clicking another day starts over
- Insights dialog (the Insights button at the right end of each year's heading) for that year: a map of the year, working days, weekends, public holidays on weekdays and the ones lost to a weekend, bridge days, what the leave still left can buy, and the breaks worth taking grouped around each holiday; a click adds a break to the calendar as a trip, undoable from the toast. Its code loads the first time it opens
- Settings panel (the Settings button), beside the calendar on the right or as a sheet on phones: holidays on/off, searchable country list, region, week start, days off per year, and the appearance (light, dark or system)
- On phones the sidebar opens as a sheet

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (holiday engine, counting rules, day-cell states, heat levels, insights and the leave plan)
npm run typecheck
npm run build      # type-checks, then writes dist/
npm run preview    # serves dist/
```

Stack: Vite, TypeScript, React 19, Tailwind CSS v4 and [shadcn/ui](https://ui.shadcn.com) (Radix base, Vega style, neutral base colour with the blue theme, Lucide icons). No date library: all date maths runs in UTC via `Date.UTC` and dates are stored as `YYYY-MM-DD` strings; only the date-range picker (react-day-picker) works in local `Date` objects at its edges. Inter is self-hosted from `@fontsource-variable/inter`.

Layout:

- `src/lib` holds the pure logic (`dates.ts`, `holidayEngine.ts`, `holidayStore.ts`, `holidays.ts`, `calendar.ts`, `insights.ts`, `storage.ts`, `palette.ts`). `calendar.ts` builds a semantic model of every day (trip, draft, holiday, weekend; band joins; first/last day; the day's value for the heat map) and leaves colours to the components. `insights.ts` reads the year's figures and the suggested breaks off that model.
- `src/components/ui` is the shadcn/ui registry output, as `npx shadcn add` installs it; `components.json` is configured so more components can be added the same way. `src/components` holds the app's own pieces: `app-sidebar`, `app-header`, `year-calendar`, `trip-popover`, `heat-scale`, `insights-dialog` (lazy-loaded, with its content in `insights-map` and the shared `insights-bits`), `date-range-picker`, `settings-panel`, `theme-toggle`, `theme-provider`.
- `src/hooks/use-year-scroller.ts` runs the endless year list (anchored prepends, the month at the top held in place when the width changes and the months reflow, year- and month-in-view sync, jumps to a year or a month).
- `src/index.css` imports Tailwind and `shadcn/tailwind.css` and defines the design tokens as CSS custom properties, plus three small utilities that colour trip days from a `--trip` custom property and the `--heat-1`…`--heat-4` ramp of the heat map with a darker `--heat-N-free` shade per step for the free days inside a break (one orange hue; dark mode has its own steps).

## Heat map

The heat map keeps the same year grid and shades each working day by its value, `bestBlock` and `valueOf` in `calendar.ts`. Every run of up to five working days through the day whose break takes in a public holiday is a candidate block of leave; the weekends and public holidays inside it and touching either end come free, and the block's value is its days off per day of leave. The day takes its best block, the longest break among equals. A regular Friday buys 3 days for 1 but captures no holiday, so with nothing else around it stays bare, and so does its weekend; the Thursday before a Friday holiday buys 4 for 1; a Monday between the New Year holidays and Epiphany can buy 7 for 1. A plain day wedged between two such days joins them: with Mon 30 Nov and Tue 1 Dec 2026 off in Romania, Wed 2 Dec buys 5 for 1 and Thu 3 Dec would buy nothing alone, but Wed–Fri buys Sat 28 Nov – Sun 6 Dec, 9 days for 3, so Thu 3 gets the same heat as a regular Friday and Fri 4's tooltip names the chain. Likewise Mon 4 and Tue 5 Jan 2027 together buy Fri 1 – Thu 7 for 2 days of leave. Below two and a half days off per day of leave nothing shows, which keeps a five-day block that merely reaches back to a holiday off the map; up to 3 is the faintest step of the orange ramp, up to 4 and up to 5 are the two middle steps and more than 5 is the hottest. The same value always has the same colour in every year. Trips are left out of the value on purpose: it describes the calendar, not the plan. Weekends and holidays take the heat of the strongest break that covers them and join its band, in a darker and duller shade of the step so that a band shows which days cost leave and which are already free, and the whole length of a vacation shows at a glance: a regular weekend wears the faint tint of its Friday and Monday, Christmas Day the medium step of the Thursday before it, and the first ten days of January 2027 glow from end to end. Where no break reaches, they keep the backgrounds they have in the calendar view. Planned trips show as solid bands in their colour, and the range being picked is outlined over whatever it covers. With holidays turned off, or before their data arrives, nothing is shaded.

## Insights

The dialog behind the Insights button in a year's heading describes that year, `buildInsights` in `insights.ts`, from the same year model the calendar draws:

- The figures: days, weekend days, working days (weekdays that are not public holidays), public holidays on weekdays and the ones that fall on a Saturday or Sunday and so add nothing, holidays per weekday, and bridge days (working days where one day of leave buys a break of four days or more).
- The suggested breaks: every distinct best block (see the heat map) worth two and a half days off per day of leave or more, gathered into clusters by overlap, so that the one, two, three, four and five days of leave around New Year are one entry with five lengths rather than five entries. A break is named after its holidays ("Good Friday – Easter Monday"); a break a trip already covers is marked as planned and cannot be added again. Adding one makes a trip over the whole break, free days included, so it shows as one band.
- What the leave left can buy: the most days off that non-overlapping suggested breaks can buy within the allowance minus the leave planned, the fewest days of leave among equals (a knapsack over the breaks, `planLeave`), plus the frontier of what each smaller number of days could buy.

The dialog shows this as a year map, twelve month strips with holidays red, breaks worth taking orange, trips in their colours and today ringed (a click closes the dialog and scrolls the calendar to the month), then a ledger of the figures with the holidays lost to a weekend by name and the holidays per weekday, then the breaks in date order, every length on its own line with the days off it buys and a plus to add it; the picks of the best plan are marked. `App.tsx` imports `insights-dialog` with `React.lazy`, so the dialog, the map and `lib/insights` are a separate chunk that loads the first time the dialog opens; nothing of it is in the main bundle.

## Public holidays

Holidays are computed in the browser from the rules of [date-holidays](https://github.com/commenthol/date-holidays) (data CC BY-SA 3.0). Nothing is fetched from a holiday API, so the data works offline and for any year of the calendar:

- `holidayEngine.ts` wraps the library: the country list, the regions of a country (`<country>-<subdivision>`, e.g. `GB-SCT`) and the holidays of a country, region and year as `{ date, name, type }`, one entry per day for a holiday that spans several (Eid, Korean New Year, Romania's two days of New Year).
- Only entries typed `public` count as a day off; bank, school, optional and observance days are kept out. With a region selected, its holidays are added to the nationwide ones.
- The rules for all countries weigh about 250 KB gzipped, so `holidayStore.ts` loads the engine as its own chunk once holidays are on and memoises results per country, region and year; the calendar paints before the rules arrive. Should the chunk fail to download, Settings shows the error with a Retry button and holidays simply cost like weekdays until it loads.

## Deploy to GitHub Pages

`.github/workflows/deploy.yml` builds and publishes the site on every push to `main` (and on demand from the Actions tab):

1. In the repository go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to `main`. The workflow runs the tests, builds with `BASE_PATH=/<repo-name>/` so assets resolve under the project URL, and deploys `dist/`.
3. The site is published at `https://<owner>.github.io/<repo-name>/`.

For a user or organisation site, or a custom domain, set `BASE_PATH` to `/` in the workflow.

## Storage

`vp-apple-v1` holds `{ trips, settings }` (settings include the calendar view, `calendar` or `heatmap`); `vp-theme` holds the appearance choice (Settings). The holiday caches of earlier releases (`vp-holidays-v1`, `vp-countries-v1`) are removed on load. A missing, corrupt or blocked store falls back to the defaults and three seed trips for 2026. Clear site data to start over.
