import { highlightJson } from '../utils/jsonHighlight'

interface Props {
  label: string
  data: unknown
}

export default function JsonViewer({ label, data }: Props) {
  const html = highlightJson(data)

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-950 overflow-hidden">
      <div className="px-3 py-1.5 bg-gray-800 border-b border-gray-700 text-xs text-gray-400 font-mono">
        {label}
      </div>
      <pre
        className="p-3 text-xs font-mono leading-relaxed overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
