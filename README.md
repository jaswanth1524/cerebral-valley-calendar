# Cerebral Valley Calendar

Generates a subscribed Apple Calendar feed for Cerebral Valley events in San Francisco and the Bay Area.

The feed is built from Cerebral Valley's public event API and published as a static ICS file through GitHub Pages.

## Calendar URL

After this repo is pushed to GitHub as `jaswanth1524/cerebral-valley-calendar` and GitHub Pages is enabled, subscribe to:

```txt
https://jaswanth1524.github.io/cerebral-valley-calendar/calendar.ics
```

## What It Includes

- SF and Bay Area locations
- All event types
- No reminders or alarms
- Original event page in the Apple Calendar event URL field
- Removed source events disappear from the next generated feed

## Local Usage

```sh
npm run build
```

This writes:

- `public/calendar.ics`
- `public/events.json`

## Apple Calendar

1. Open Calendar on macOS.
2. Choose `File > New Calendar Subscription`.
3. Paste the calendar URL.
4. Set auto-refresh to your preference.

Apple Calendar subscribed feeds are read-only. To decide whether to attend, open the event and click the event URL, which takes you to the original event page.

## GitHub Setup

1. Create a public GitHub repo named `cerebral-valley-calendar`.
2. Push this project to it.
3. In GitHub, open `Settings > Pages`.
4. Set `Source` to `GitHub Actions`.
5. Run the `Update Calendar` workflow once manually.

The workflow refreshes the feed daily at 4:00 AM Pacific time.
