const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'be',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'or',
  'that',
  'the',
  'this',
  'to',
  'with'
])

export function tokenizeSearchText(text: string): string[] {
  const seen = new Set<string>()

  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .map(token => token.trim())
    .filter(token => token.length >= 2)
    .filter(token => !STOPWORDS.has(token))
    .filter(token => {
      if (seen.has(token)) {
        return false
      }

      seen.add(token)
      return true
    })
}
