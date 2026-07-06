# Cerebral Valley Calendar

Generates subscribed Apple Calendar feeds for Cerebral Valley events in selected US metro areas.

The feed is built from Cerebral Valley's public event API and published as a static ICS file through GitHub Pages.

## Calendar URL

After this repo is pushed to GitHub as `jaswanth1524/cerebral-valley-calendar` and GitHub Pages is enabled, subscribe to any of these feeds:

```txt
SF & Bay Area:
  https://jaswanth1524.github.io/cerebral-valley-calendar/calendar.ics

New York metro:
  https://jaswanth1524.github.io/cerebral-valley-calendar/new-york.ics

Seattle metro:
  https://jaswanth1524.github.io/cerebral-valley-calendar/seattle.ics

Dallas metro:
  https://jaswanth1524.github.io/cerebral-valley-calendar/dallas.ics

Austin metro:
  https://jaswanth1524.github.io/cerebral-valley-calendar/austin.ics
```

## What It Includes

- SF and Bay Area locations
- New York, Seattle, Dallas, and Austin metro locations
- All event types
- No reminders or alarms
- Original event page in the Apple Calendar event URL field
- Removed source events disappear from the next generated feed

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
