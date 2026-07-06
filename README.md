# Cerebral Valley Calendar

Generates subscribed calendar feeds for Cerebral Valley and Luma events in selected US metro areas.

The feeds are built from Cerebral Valley's public event API and Luma's public discovery endpoints, then published as static ICS files through GitHub Pages.

## Calendar URLs

After this repo is pushed to GitHub as `jaswanth1524/cerebral-valley-calendar` and GitHub Pages is enabled, subscribe to any of these feeds:

```txt
SF & Bay Area:
  https://jaswanth1524.github.io/cerebral-valley-calendar/calendar.ics
  https://jaswanth1524.github.io/cerebral-valley-calendar/luma-calendar.ics
  https://jaswanth1524.github.io/cerebral-valley-calendar/all-calendar.ics

New York metro:
  https://jaswanth1524.github.io/cerebral-valley-calendar/new-york.ics
  https://jaswanth1524.github.io/cerebral-valley-calendar/luma-new-york.ics
  https://jaswanth1524.github.io/cerebral-valley-calendar/all-new-york.ics

Seattle metro:
  https://jaswanth1524.github.io/cerebral-valley-calendar/seattle.ics
  https://jaswanth1524.github.io/cerebral-valley-calendar/luma-seattle.ics
  https://jaswanth1524.github.io/cerebral-valley-calendar/all-seattle.ics

Dallas metro:
  https://jaswanth1524.github.io/cerebral-valley-calendar/dallas.ics
  https://jaswanth1524.github.io/cerebral-valley-calendar/luma-dallas.ics
  https://jaswanth1524.github.io/cerebral-valley-calendar/all-dallas.ics

Austin metro:
  https://jaswanth1524.github.io/cerebral-valley-calendar/austin.ics
  https://jaswanth1524.github.io/cerebral-valley-calendar/luma-austin.ics
  https://jaswanth1524.github.io/cerebral-valley-calendar/all-austin.ics
```

For each metro, the original URL is Cerebral Valley-only, the `luma-` URL is Luma-only, and the `all-` URL combines both sources with duplicate Luma events collapsed.

Luma feeds depend on public Luma discovery responses. If Luma changes those responses or temporarily blocks requests, the build still publishes the Cerebral Valley-only feeds and writes the Luma error into the matching debug JSON.

## What It Includes

- SF and Bay Area locations
- New York, Seattle, Dallas, and Austin metro locations
- Luma discovery events for the matching public metro pages
- All event types
- No reminders or alarms
- Original event page in the calendar event URL field
- New source events are appended to the saved feed state
- Existing source events replace the saved copy when they are fetched again
- Ended events stay in the feed for 30 days, then are removed

## Local Usage

```sh
npm run build
```

This writes:

- `public/calendar.ics` and `public/events.json`
- `public/new-york.ics` and `public/events-new-york.json`
- `public/seattle.ics` and `public/events-seattle.json`
- `public/dallas.ics` and `public/events-dallas.json`
- `public/austin.ics` and `public/events-austin.json`
- Matching `public/luma-*.ics`, `public/all-*.ics`, and debug JSON files

The build reads previous debug JSON from the deployed GitHub Pages site before writing new files, with local `public/` JSON as a fallback. Set `CALENDAR_STATE_BASE_URL=""` to skip remote state and use only local files during development.

## Apple Calendar

1. Open Calendar on macOS.
2. Choose `File > New Calendar Subscription`.
3. Paste the calendar URL.
4. Set auto-refresh to your preference.

Apple Calendar subscribed feeds are read-only. To decide whether to attend, open the event and click the event URL, which takes you to the original event page.

## Google Calendar

1. Open Google Calendar in a browser.
2. In the left sidebar, next to `Other calendars`, click `+`.
3. Choose `From URL`.
4. Paste one of the calendar URLs above.
5. Click `Add calendar`.

Google Calendar subscribed feeds are read-only. Google controls the refresh schedule, so updates may not appear immediately after this repo publishes a new feed.

## GitHub Setup

1. Create a public GitHub repo named `cerebral-valley-calendar`.
2. Push this project to it.
3. In GitHub, open `Settings > Pages`.
4. Set `Source` to `GitHub Actions`.
5. Run the `Update Calendar` workflow once manually.

The workflow refreshes the feed daily at 4:00 AM Pacific time.
