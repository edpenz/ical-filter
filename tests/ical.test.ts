import { existsSync, readFileSync } from 'fs'
import { decodeIcs, encodeIcs, transformCalendar } from '../src/ical'

describe('file format', () => {
  it('can parse a trivial calendar', () => {
    const input = `\
BEGIN:VCALENDAR
BEGIN:VEVENT
UID:040000008200E00074C5B7101A82E00800000000ACDA700DDDDFDB01000000000000000
SUMMARY:Busy
DTSTART;TZID=New Zealand Standard Time:20260225T100000
DTEND;TZID=New Zealand Standard Time:20260225T104500
DTSTAMP:20260322T003235Z
END:VEVENT
END:VCALENDAR
`.replaceAll(/\n/g, '\r\n')

    const result = decodeIcs(input)
    expect(result).toMatchObject({
      type: 'VCALENDAR',
      children: [
        {
          type: 'VEVENT',
          children: [
            {
              key: 'UID',
              value: '040000008200E00074C5B7101A82E00800000000ACDA700DDDDFDB01000000000000000',
            },
            { key: 'SUMMARY', value: 'Busy' },
            {
              key: 'DTSTART',
              keyExtra: 'TZID=New Zealand Standard Time',
              value: '20260225T100000',
            },
            {
              key: 'DTEND',
              keyExtra: 'TZID=New Zealand Standard Time',
              value: '20260225T104500',
            },
            { key: 'DTSTAMP', value: '20260322T003235Z' },
          ],
        },
      ],
    })
  })

  it('combines multiline values', () => {
    const input = `\
BEGIN:VCALENDAR
BEGIN:VEVENT
UID:040000008200E00074C5B7101A82E00800000000ACDA700DDDDFDB01000000000000000
 0100000003519A78AB99C9045BC0E7D6686D6188F
END:VEVENT
END:VCALENDAR
`.replaceAll(/\n/g, '\r\n')

    const result = decodeIcs(input)
    expect(result).toMatchObject({
      type: 'VCALENDAR',
      children: [
        {
          type: 'VEVENT',
          children: [
            {
              key: 'UID',
              value:
                '040000008200E00074C5B7101A82E00800000000ACDA700DDDDFDB010000000000000000100000003519A78AB99C9045BC0E7D6686D6188F',
            },
          ],
        },
      ],
    })
  })
})

describe('exclusions', () => {
  it('deletes matched events', () => {
    const input = `\
BEGIN:VCALENDAR
BEGIN:VEVENT
EXDATE;TZID=New Zealand Standard Time:20260311T100000
UID:040000008200E00074C5B7101A82E00800000000ACDA700DDDDFDB01000000000000000
SUMMARY:Away
DTSTART;TZID=New Zealand Standard Time:20260225T100000
DTEND;TZID=New Zealand Standard Time:20260225T104500
DTSTAMP:20260322T003235Z
END:VEVENT
END:VCALENDAR
`.replaceAll(/\n/g, '\r\n')
    const expected = `\
BEGIN:VCALENDAR
END:VCALENDAR
`.replaceAll(/\n/g, '\r\n')

    const result = transformCalendar(input, ['away', 'free'])
    expect(result).toBe(expected)
  })

  it('transforms matched recurrences to an EXDATE attribute on the recurring event', () => {
    const input = `\
BEGIN:VCALENDAR
BEGIN:VEVENT
RRULE:FREQ=WEEKLY;UNTIL=20260908T220000Z;INTERVAL=2;BYDAY=WE;WKST=SU
EXDATE;TZID=New Zealand Standard Time:20260311T100000
UID:040000008200E00074C5B7101A82E00800000000ACDA700DDDDFDB01000000000000000
 0100000003519A78AB99C9045BC0E7D6686D6188F
SUMMARY:Busy
DTSTART;TZID=New Zealand Standard Time:20260225T100000
DTEND;TZID=New Zealand Standard Time:20260225T104500
DTSTAMP:20260322T003235Z
END:VEVENT
BEGIN:VEVENT
UID:040000008200E00074C5B7101A82E00800000000ACDA700DDDDFDB01000000000000000
 0100000003519A78AB99C9045BC0E7D6686D6188F
RECURRENCE-ID;TZID=New Zealand Standard Time:20260408T100000
SUMMARY:Free
DTSTART;TZID=New Zealand Standard Time:20260408T100000
DTEND;TZID=New Zealand Standard Time:20260408T104500
DTSTAMP:20260322T003235Z
END:VEVENT
END:VCALENDAR
`.replaceAll(/\n/g, '\r\n')
    const expected = `\
BEGIN:VCALENDAR
BEGIN:VEVENT
RRULE:FREQ=WEEKLY;UNTIL=20260908T220000Z;INTERVAL=2;BYDAY=WE;WKST=SU
EXDATE;TZID=New Zealand Standard Time:20260311T100000
UID:040000008200E00074C5B7101A82E00800000000ACDA700DDDDFDB01000000000000000
 0100000003519A78AB99C9045BC0E7D6686D6188F
SUMMARY:Busy
DTSTART;TZID=New Zealand Standard Time:20260225T100000
DTEND;TZID=New Zealand Standard Time:20260225T104500
DTSTAMP:20260322T003235Z
EXDATE;TZID=New Zealand Standard Time:20260408T100000
END:VEVENT
END:VCALENDAR
`.replaceAll(/\n/g, '\r\n')

    const result = transformCalendar(input, ['away', 'free'])
    expect(result).toBe(expected)
  })
})

describe('reference data', () => {
  const referenceFilename = 'sample.ics'

  // BYO reference file
  let maybeSkipIt
  if (existsSync(referenceFilename)) {
    maybeSkipIt = it
  } else {
    maybeSkipIt = it.skip
  }

  maybeSkipIt('can round-trip a non-trivial calendar', () => {
    const input = readFileSync(referenceFilename, 'utf-8')
    const calendar = decodeIcs(input)
    const output = encodeIcs(calendar)
    expect(output).toBe(input)
  })

  maybeSkipIt('can transform a non-trivial calendar without error', () => {
    const input = readFileSync(referenceFilename, 'utf-8')
    const _output = transformCalendar(input, ['away', 'free'])
  })
})
