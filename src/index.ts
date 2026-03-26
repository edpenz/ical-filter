import { transformCalendar } from './ical'

export default {
  async fetch(request: Request): Promise<Response> {
    // Pull out query params
    const query = new URL(request.url).searchParams
    const originalUrl = query.get('url')
    const excludePatterns = query.getAll('exclude')

    if (!originalUrl) {
      return new Response('Missing "url" query parameter', { status: 400 })
    } else if (excludePatterns.length === 0) {
      return new Response('Missing "exclude" query parameter(s)', { status: 400 })
    }

    // Make the request for the original calendar
    let fetched: Response
    try {
      fetched = await fetch(originalUrl)
    } catch (error) {
      return new Response(`Error fetching target URL: ${error}`, {
        status: 502,
      })
    }
    if (!fetched.ok) {
      return new Response(`Target fetch failed: ${fetched.statusText}`, {
        status: fetched.status,
      })
    }

    const original = await fetched.text()

    // Transform the calendar
    const transformed = transformCalendar(original, excludePatterns)

    // Return the transformed calendar with headers to mimic the original response
    return new Response(transformed, {
      status: 200,
      headers: fetched.headers,
    })
  },
} satisfies ExportedHandler<Env>
