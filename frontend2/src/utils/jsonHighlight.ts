/**
 * Syntax-highlight a JSON string by wrapping token types in <span> tags.
 * Returns an HTML string safe to set via dangerouslySetInnerHTML.
 */
export function highlightJson(json: unknown): string {
  const str = JSON.stringify(json, null, 2)
  return str.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'text-amber-300' // number
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'text-sky-300' : 'text-green-300' // key vs string
      } else if (/true|false/.test(match)) {
        cls = 'text-purple-300'
      } else if (/null/.test(match)) {
        cls = 'text-red-400'
      }
      return `<span class="${cls}">${match}</span>`
    },
  )
}
