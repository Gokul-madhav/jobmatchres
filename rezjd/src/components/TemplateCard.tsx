import React from 'react'
import { CheckCircle } from 'lucide-react'
import { cn } from '../lib/utils'

export interface Template {
  id: string
  name: string
  description: string
  tags: string[]
  badge?: string
}

interface TemplateCardProps {
  template: Template
  selected: boolean
  onSelect: (id: string) => void
}

// ── SVG resume previews — each one visually represents the template style ──

function CleanPreview() {
  return (
    <svg viewBox="0 0 160 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="200" fill="#ffffff" />
      {/* Name */}
      <rect x="40" y="14" width="80" height="7" rx="1" fill="#111111" />
      {/* Contact */}
      <rect x="30" y="25" width="100" height="3" rx="1" fill="#888888" />
      {/* Rule */}
      <line x1="10" y1="36" x2="150" y2="36" stroke="#111111" strokeWidth="0.5" />
      {/* Section: SUMMARY */}
      <rect x="10" y="40" width="40" height="4" rx="1" fill="#111111" />
      <rect x="10" y="48" width="140" height="2.5" rx="1" fill="#cccccc" />
      <rect x="10" y="53" width="120" height="2.5" rx="1" fill="#cccccc" />
      {/* Rule */}
      <line x1="10" y1="62" x2="150" y2="62" stroke="#111111" strokeWidth="0.5" />
      {/* Section: SKILLS */}
      <rect x="10" y="66" width="30" height="4" rx="1" fill="#111111" />
      <rect x="10" y="74" width="130" height="2.5" rx="1" fill="#cccccc" />
      {/* Rule */}
      <line x1="10" y1="83" x2="150" y2="83" stroke="#111111" strokeWidth="0.5" />
      {/* Section: EXPERIENCE */}
      <rect x="10" y="87" width="55" height="4" rx="1" fill="#111111" />
      <rect x="10" y="95" width="90" height="3" rx="1" fill="#444444" />
      <rect x="14" y="101" width="120" height="2" rx="1" fill="#cccccc" />
      <rect x="14" y="106" width="100" height="2" rx="1" fill="#cccccc" />
      <rect x="14" y="111" width="110" height="2" rx="1" fill="#cccccc" />
      <rect x="10" y="118" width="80" height="3" rx="1" fill="#444444" />
      <rect x="14" y="124" width="115" height="2" rx="1" fill="#cccccc" />
      <rect x="14" y="129" width="95" height="2" rx="1" fill="#cccccc" />
      {/* Rule */}
      <line x1="10" y1="138" x2="150" y2="138" stroke="#111111" strokeWidth="0.5" />
      {/* Section: EDUCATION */}
      <rect x="10" y="142" width="45" height="4" rx="1" fill="#111111" />
      <rect x="10" y="150" width="130" height="2.5" rx="1" fill="#cccccc" />
      <rect x="10" y="155" width="100" height="2.5" rx="1" fill="#cccccc" />
      {/* Rule */}
      <line x1="10" y1="164" x2="150" y2="164" stroke="#111111" strokeWidth="0.5" />
      {/* Section: PROJECTS */}
      <rect x="10" y="168" width="38" height="4" rx="1" fill="#111111" />
      <rect x="10" y="176" width="80" height="3" rx="1" fill="#444444" />
      <rect x="14" y="182" width="120" height="2" rx="1" fill="#cccccc" />
      <rect x="14" y="187" width="100" height="2" rx="1" fill="#cccccc" />
    </svg>
  )
}

function ModernPreview() {
  return (
    <svg viewBox="0 0 160 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="200" fill="#ffffff" />
      {/* Header bar */}
      <rect width="160" height="38" fill="#1A2B4A" />
      <rect x="30" y="10" width="100" height="8" rx="1" fill="#ffffff" />
      <rect x="25" y="22" width="110" height="3" rx="1" fill="#94a3b8" />
      {/* Section: SUMMARY */}
      <rect x="10" y="44" width="40" height="4" rx="1" fill="#1A2B4A" />
      <line x1="10" y1="51" x2="150" y2="51" stroke="#1A2B4A" strokeWidth="1.5" />
      <rect x="10" y="55" width="140" height="2.5" rx="1" fill="#cccccc" />
      <rect x="10" y="60" width="120" height="2.5" rx="1" fill="#cccccc" />
      {/* Section: SKILLS */}
      <rect x="10" y="69" width="30" height="4" rx="1" fill="#1A2B4A" />
      <line x1="10" y1="76" x2="150" y2="76" stroke="#1A2B4A" strokeWidth="1.5" />
      <rect x="10" y="80" width="130" height="2.5" rx="1" fill="#cccccc" />
      {/* Section: EXPERIENCE */}
      <rect x="10" y="89" width="55" height="4" rx="1" fill="#1A2B4A" />
      <line x1="10" y1="96" x2="150" y2="96" stroke="#1A2B4A" strokeWidth="1.5" />
      <rect x="10" y="100" width="90" height="3" rx="1" fill="#1A2B4A" />
      <rect x="14" y="106" width="120" height="2" rx="1" fill="#cccccc" />
      <rect x="14" y="111" width="100" height="2" rx="1" fill="#cccccc" />
      <rect x="14" y="116" width="110" height="2" rx="1" fill="#cccccc" />
      <rect x="10" y="123" width="80" height="3" rx="1" fill="#1A2B4A" />
      <rect x="14" y="129" width="115" height="2" rx="1" fill="#cccccc" />
      <rect x="14" y="134" width="95" height="2" rx="1" fill="#cccccc" />
      {/* Section: EDUCATION */}
      <rect x="10" y="143" width="45" height="4" rx="1" fill="#1A2B4A" />
      <line x1="10" y1="150" x2="150" y2="150" stroke="#1A2B4A" strokeWidth="1.5" />
      <rect x="10" y="154" width="130" height="2.5" rx="1" fill="#cccccc" />
      <rect x="10" y="159" width="100" height="2.5" rx="1" fill="#cccccc" />
      {/* Section: PROJECTS */}
      <rect x="10" y="168" width="38" height="4" rx="1" fill="#1A2B4A" />
      <line x1="10" y1="175" x2="150" y2="175" stroke="#1A2B4A" strokeWidth="1.5" />
      <rect x="10" y="179" width="80" height="3" rx="1" fill="#1A2B4A" />
      <rect x="14" y="185" width="120" height="2" rx="1" fill="#cccccc" />
      <rect x="14" y="190" width="100" height="2" rx="1" fill="#cccccc" />
    </svg>
  )
}

function ExecutivePreview() {
  return (
    <svg viewBox="0 0 160 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="200" fill="#fafaf8" />
      {/* Name — large */}
      <rect x="25" y="12" width="110" height="9" rx="1" fill="#0A0A0A" />
      {/* Contact */}
      <rect x="30" y="25" width="100" height="3" rx="1" fill="#777777" />
      {/* Double rule */}
      <line x1="10" y1="34" x2="150" y2="34" stroke="#8B7355" strokeWidth="1" />
      <line x1="10" y1="37" x2="150" y2="37" stroke="#0A0A0A" strokeWidth="0.3" />
      {/* SUMMARY */}
      <rect x="10" y="42" width="42" height="4.5" rx="1" fill="#0A0A0A" />
      <line x1="10" y1="49" x2="150" y2="49" stroke="#8B7355" strokeWidth="1" />
      <line x1="10" y1="51" x2="150" y2="51" stroke="#0A0A0A" strokeWidth="0.3" />
      <rect x="10" y="55" width="140" height="2.5" rx="1" fill="#bbbbbb" />
      <rect x="10" y="60" width="120" height="2.5" rx="1" fill="#bbbbbb" />
      {/* SKILLS */}
      <rect x="10" y="69" width="32" height="4.5" rx="1" fill="#0A0A0A" />
      <line x1="10" y1="76" x2="150" y2="76" stroke="#8B7355" strokeWidth="1" />
      <line x1="10" y1="78" x2="150" y2="78" stroke="#0A0A0A" strokeWidth="0.3" />
      <rect x="10" y="82" width="130" height="2.5" rx="1" fill="#bbbbbb" />
      {/* EXPERIENCE */}
      <rect x="10" y="91" width="58" height="4.5" rx="1" fill="#0A0A0A" />
      <line x1="10" y1="98" x2="150" y2="98" stroke="#8B7355" strokeWidth="1" />
      <line x1="10" y1="100" x2="150" y2="100" stroke="#0A0A0A" strokeWidth="0.3" />
      <rect x="10" y="104" width="90" height="3" rx="1" fill="#333333" />
      <rect x="14" y="110" width="120" height="2" rx="1" fill="#bbbbbb" />
      <rect x="14" y="115" width="100" height="2" rx="1" fill="#bbbbbb" />
      <rect x="14" y="120" width="110" height="2" rx="1" fill="#bbbbbb" />
      <rect x="10" y="127" width="80" height="3" rx="1" fill="#333333" />
      <rect x="14" y="133" width="115" height="2" rx="1" fill="#bbbbbb" />
      <rect x="14" y="138" width="95" height="2" rx="1" fill="#bbbbbb" />
      {/* EDUCATION */}
      <rect x="10" y="147" width="48" height="4.5" rx="1" fill="#0A0A0A" />
      <line x1="10" y1="154" x2="150" y2="154" stroke="#8B7355" strokeWidth="1" />
      <line x1="10" y1="156" x2="150" y2="156" stroke="#0A0A0A" strokeWidth="0.3" />
      <rect x="10" y="160" width="130" height="2.5" rx="1" fill="#bbbbbb" />
      <rect x="10" y="165" width="100" height="2.5" rx="1" fill="#bbbbbb" />
      {/* PROJECTS */}
      <rect x="10" y="174" width="40" height="4.5" rx="1" fill="#0A0A0A" />
      <line x1="10" y1="181" x2="150" y2="181" stroke="#8B7355" strokeWidth="1" />
      <line x1="10" y1="183" x2="150" y2="183" stroke="#0A0A0A" strokeWidth="0.3" />
      <rect x="10" y="187" width="80" height="3" rx="1" fill="#333333" />
      <rect x="14" y="193" width="120" height="2" rx="1" fill="#bbbbbb" />
    </svg>
  )
}

function CompactPreview() {
  return (
    <svg viewBox="0 0 160 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="200" fill="#ffffff" />
      {/* Name — smaller */}
      <rect x="45" y="8" width="70" height="6" rx="1" fill="#111111" />
      {/* Contact */}
      <rect x="20" y="17" width="120" height="2.5" rx="1" fill="#888888" />
      {/* Rule */}
      <line x1="8" y1="24" x2="152" y2="24" stroke="#333333" strokeWidth="0.5" />
      {/* SUMMARY */}
      <rect x="8" y="27" width="36" height="3.5" rx="1" fill="#111111" />
      <line x1="8" y1="33" x2="152" y2="33" stroke="#333333" strokeWidth="0.5" />
      <rect x="8" y="36" width="144" height="2" rx="1" fill="#cccccc" />
      <rect x="8" y="40" width="130" height="2" rx="1" fill="#cccccc" />
      {/* SKILLS */}
      <rect x="8" y="46" width="28" height="3.5" rx="1" fill="#111111" />
      <line x1="8" y1="52" x2="152" y2="52" stroke="#333333" strokeWidth="0.5" />
      <rect x="8" y="55" width="144" height="2" rx="1" fill="#cccccc" />
      {/* EXPERIENCE */}
      <rect x="8" y="61" width="50" height="3.5" rx="1" fill="#111111" />
      <line x1="8" y1="67" x2="152" y2="67" stroke="#333333" strokeWidth="0.5" />
      <rect x="8" y="70" width="85" height="2.5" rx="1" fill="#444444" />
      <rect x="12" y="75" width="130" height="1.8" rx="1" fill="#cccccc" />
      <rect x="12" y="79" width="110" height="1.8" rx="1" fill="#cccccc" />
      <rect x="12" y="83" width="120" height="1.8" rx="1" fill="#cccccc" />
      <rect x="8" y="88" width="75" height="2.5" rx="1" fill="#444444" />
      <rect x="12" y="93" width="125" height="1.8" rx="1" fill="#cccccc" />
      <rect x="12" y="97" width="105" height="1.8" rx="1" fill="#cccccc" />
      <rect x="8" y="102" width="70" height="2.5" rx="1" fill="#444444" />
      <rect x="12" y="107" width="120" height="1.8" rx="1" fill="#cccccc" />
      <rect x="12" y="111" width="100" height="1.8" rx="1" fill="#cccccc" />
      {/* EDUCATION */}
      <rect x="8" y="117" width="42" height="3.5" rx="1" fill="#111111" />
      <line x1="8" y1="123" x2="152" y2="123" stroke="#333333" strokeWidth="0.5" />
      <rect x="8" y="126" width="140" height="2" rx="1" fill="#cccccc" />
      <rect x="8" y="130" width="110" height="2" rx="1" fill="#cccccc" />
      {/* PROJECTS */}
      <rect x="8" y="136" width="36" height="3.5" rx="1" fill="#111111" />
      <line x1="8" y1="142" x2="152" y2="142" stroke="#333333" strokeWidth="0.5" />
      <rect x="8" y="145" width="75" height="2.5" rx="1" fill="#444444" />
      <rect x="12" y="150" width="130" height="1.8" rx="1" fill="#cccccc" />
      <rect x="12" y="154" width="110" height="1.8" rx="1" fill="#cccccc" />
      <rect x="8" y="159" width="80" height="2.5" rx="1" fill="#444444" />
      <rect x="12" y="164" width="125" height="1.8" rx="1" fill="#cccccc" />
      <rect x="12" y="168" width="100" height="1.8" rx="1" fill="#cccccc" />
      {/* ACHIEVEMENTS */}
      <rect x="8" y="174" width="52" height="3.5" rx="1" fill="#111111" />
      <line x1="8" y1="180" x2="152" y2="180" stroke="#333333" strokeWidth="0.5" />
      <rect x="12" y="183" width="130" height="1.8" rx="1" fill="#cccccc" />
      <rect x="12" y="187" width="110" height="1.8" rx="1" fill="#cccccc" />
      <rect x="12" y="191" width="120" height="1.8" rx="1" fill="#cccccc" />
    </svg>
  )
}

const PREVIEW_COMPONENTS: Record<string, React.FC> = {
  clean: CleanPreview,
  modern: ModernPreview,
  executive: ExecutivePreview,
  compact: CompactPreview,
}

export function TemplateCard({ template, selected, onSelect }: TemplateCardProps) {
  const Preview = PREVIEW_COMPONENTS[template.id]

  return (
    <div
      onClick={() => onSelect(template.id)}
      className={cn(
        'relative rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden group',
        'hover:-translate-y-1',
        selected
          ? 'border-japandi-primary dark:border-gothic-primary shadow-japandi-md dark:shadow-gothic-glow'
          : 'border-japandi-border dark:border-gothic-border hover:border-japandi-primary/60 dark:hover:border-gothic-primary/60'
      )}
    >
      {/* Selected badge */}
      {selected && (
        <div className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full bg-japandi-primary dark:bg-gothic-primary flex items-center justify-center shadow-sm">
          <CheckCircle size={14} className="text-white" />
        </div>
      )}

      {/* Best for badge */}
      {template.badge && (
        <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full text-xs font-medium bg-japandi-accent/90 dark:bg-gothic-accent/90 text-white">
          {template.badge}
        </div>
      )}

      {/* SVG Preview */}
      <div className={cn(
        'h-52 overflow-hidden transition-all duration-200',
        'bg-white dark:bg-[#f8f8f6]',
        'group-hover:scale-[1.02] origin-top',
        selected && 'ring-0'
      )}>
        {Preview && <Preview />}
      </div>

      {/* Info panel */}
      <div className={cn(
        'p-4 border-t transition-colors duration-200',
        'bg-white border-japandi-border',
        'dark:bg-gothic-card dark:border-gothic-border',
        selected && 'bg-japandi-primary/5 dark:bg-gothic-primary/10'
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className={cn(
              'font-semibold text-sm',
              'text-japandi-text dark:text-gothic-text',
              selected && 'text-japandi-primary dark:text-gothic-primary'
            )}>
              {template.name}
            </h3>
            <p className="text-xs text-japandi-muted dark:text-gothic-muted mt-0.5 leading-relaxed">
              {template.description}
            </p>
          </div>
          {selected && (
            <CheckCircle size={16} className="text-japandi-primary dark:text-gothic-primary flex-shrink-0 mt-0.5" />
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-2.5">
          {template.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                'px-2 py-0.5 rounded-full text-xs transition-colors',
                selected
                  ? 'bg-japandi-primary/10 text-japandi-primary dark:bg-gothic-primary/20 dark:text-gothic-primary'
                  : 'bg-japandi-bg text-japandi-muted dark:bg-gothic-border dark:text-gothic-muted'
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
