# ical-filter

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/edpenz/ical-filter)

An iCalendar event filtering service built on Cloudflare Workers, primarily targeted at Microsoft Office public feeds. This service removes events from calendars where the summary/title matches given text patterns. Notably this implementation also works correctly for event recurrences which other similar services struggle on.

## Usage

The service is accessed by composing an appropriate URL consisting of:

1. The `https://ical-filter.edwardpeek.workers.dev/` base URL (or your own deployed worker URL).
2. A `url` query parameter pointing to the original iCalendar feed you want to filter.
3. Some number of `exclude` query parameters (case-insensitive) specifying text patterns to match against.

Query parameters will need to be URL-encoded if they contain special characters.

eg.

https://ical-filter.edwardpeek.workers.dev/?exclude=anniversary&url=https://www.officeholidays.com/ics-clean/new-zealand

## Development

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm run dev
```

Visit http://localhost:5173 to see the interactive demo.

### Testing

```bash
pnpm run test
```

Runs the Jest test suite to verify functionality.

### Deployment

```bash
pnpm run deploy
```

Deploys the worker to Cloudflare.

## Learn More

- [Workers Documentation](https://developers.cloudflare.com/workers)
- [iCalendar RFC 5545](https://tools.ietf.org/rfc/rfc5545.txt)
- [.ics previewer](https://ics-preview-cloudflare-nextjs.pages.dev/)
