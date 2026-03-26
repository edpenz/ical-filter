// <KEY>[;<KEY_EXTRA>]:<VALUE>
// or
// <KEY>[;<KEY_EXTRA>]:<VALUE_PART_0>
//  <VALUE_PART_1>
//  ...
//  <VALUE_PART_N>
type ICalAttr = {
  key: string
  keyExtra?: string | undefined
  value: string

  type?: undefined // For uniform access to union
}

// BEGIN:<TYPE>
// ...
// END:<TYPE>
type ICalObject = {
  type: string
  children: Array<ICalAttr | ICalObject>

  key?: undefined // For uniform access to union
}

const EOL = '\r\n'
const LINE_WRAP_OFFSET = 75
const LINE_WRAP_PATTERN = new RegExp(`.{1,${LINE_WRAP_OFFSET}}`, 'g')

function partition(str: string, sep: string): [string, string | undefined] {
  const idx = str.indexOf(sep)
  if (idx === -1) {
    return [str, undefined]
  }
  return [str.slice(0, idx), str.slice(idx + sep.length)]
}

export function decodeIcs(icsString: string): ICalObject {
  const root: ICalObject = { type: '', children: [] }
  decodeIcsImpl(root, icsString)

  const firstChild = root.children[0]
  if (!firstChild || firstChild.type !== 'VCALENDAR') {
    throw new Error('Invalid ICS format: Missing VCALENDAR')
  }

  return firstChild
}

function decodeIcsImpl(parent: ICalObject, text: string | undefined): string | undefined {
  let line = ''
  let remaining: string | undefined = text

  for (;;) {
    ;[line, remaining] = partition(remaining || '', '\r\n')

    // Line unwrapping
    // FIXME: escaped characters
    while (remaining && (remaining[0] === ' ' || remaining[0] === '\t')) {
      let lineContinuation = ''
      ;[lineContinuation, remaining] = partition(remaining, '\r\n')
      line += lineContinuation.slice(1)
    }

    // Handling of object hierarchy
    if (!line) {
      return remaining
    } else if (line === `END:${parent.type}`) {
      return remaining
    } else if (line.startsWith('BEGIN:')) {
      const [, type] = partition(line, ':')
      const child: ICalObject = { type: type || '', children: [] }
      remaining = decodeIcsImpl(child, remaining)
      parent.children.push(child)
    } else {
      const [keyPart, valuePart] = partition(line, ':')
      const [key, keyExtra] = partition(keyPart, ';')
      const attr: ICalAttr = { key, keyExtra, value: valuePart || '' }
      parent.children.push(attr)
    }
  }
}

export function encodeIcs(calendar: ICalObject): string {
  let result = `BEGIN:${calendar.type}${EOL}`
  for (const child of calendar.children) {
    if (child.type !== undefined) {
      result += encodeIcs(child)
    } else {
      // FIXME: Escaped characters
      let attribute = child.key
      if (child.keyExtra) {
        attribute += `;${child.keyExtra}`
      }
      attribute += `:${child.value}`

      // Line wrap
      attribute = [...attribute.matchAll(LINE_WRAP_PATTERN)]
        .map((match) => match[0])
        .join(EOL + ' ')
      result += attribute + EOL
    }
  }
  result += `END:${calendar.type}${EOL}`
  return result
}

export function transformCalendar(icsString: string, excludePatterns: string[]): string {
  excludePatterns = excludePatterns.map((pattern) => pattern.toLowerCase())

  const calendar = decodeIcs(icsString)

  // Simplify lookup of recurrence parent
  const eventsByUid: Record<string, ICalObject[]> = {}
  for (const child of calendar.children) {
    if (child.type === 'VEVENT') {
      const uidAttr = child.children.find((attr): attr is ICalAttr => attr.key === 'UID')
      if (uidAttr) {
        const uid = uidAttr.value
        const events = eventsByUid[uid] || []
        eventsByUid[uid] = [...events, child]
      }
    }
  }

  function excludeMatcher(child: ICalAttr | ICalObject): boolean {
    if (child.key !== 'SUMMARY') {
      return false
    }
    return excludePatterns.some((pattern) => child.value.toLowerCase().includes(pattern))
  }

  // Iterate children by index (for deletion)
  for (let i = 0; i < calendar.children.length; i++) {
    const child = calendar.children[i]
    if (child.type !== 'VEVENT') {
      continue
    }

    const isRecurrence = child.children.some((attr) => attr.key === 'RECURRENCE-ID')
    const isToBeDeleted = child.children.some(excludeMatcher)

    if (!isToBeDeleted) {
      continue
    }

    // Create exclusion on parent if this is a recurrence
    if (isRecurrence) {
      calendar.children.splice(i, 1)
      const uidAttr = child.children.find((attr): attr is ICalAttr => attr.key === 'UID')
      if (!uidAttr) {
        continue
      }
      const uid = uidAttr.value
      const parentEvent = eventsByUid[uid][0]
      if (!parentEvent) {
        continue
      }

      const recurrenceIdAttr = child.children.find(
        (attr): attr is ICalAttr => attr.key === 'RECURRENCE-ID'
      )
      if (!recurrenceIdAttr) {
        continue
      }
      const recurrenceId = recurrenceIdAttr.value

      parentEvent.children.push({
        key: 'EXDATE',
        keyExtra: recurrenceIdAttr.keyExtra,
        value: recurrenceId,
      })
    }

    // Remove the event instance
    calendar.children.splice(i, 1)
    i--
  }

  return encodeIcs(calendar)
}
