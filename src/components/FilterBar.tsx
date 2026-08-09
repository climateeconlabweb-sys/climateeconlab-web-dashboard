'use client'
import { MODELS, ECS_VALUES, DR_VALUES } from '@/lib/types'
import type { FilterState } from '@/lib/filter'
import { UNIT_CONFIG } from '@/data/config'

interface Props {
  value: FilterState
  onChange: (f: FilterState) => void
}

function Group<T extends string | number>({ label, options, selected, onSelect, format }: {
  label: string
  options: readonly T[]
  selected: T
  onSelect: (v: T) => void
  format?: (v: T) => string
}) {
  return (
    <div className="filter-group" role="group" aria-label={label}>
      <span className="group-label">{label}</span>
      {options.map((opt) => (
        <button
          key={String(opt)}
          type="button"
          className={`filter-btn${opt === selected ? ' selected' : ''}`}
          onClick={() => onSelect(opt)}
        >
          {format ? format(opt) : String(opt)}
        </button>
      ))}
    </div>
  )
}

export default function FilterBar({ value, onChange }: Props) {
  const currencyDisabled = UNIT_CONFIG.usdRate === null
  return (
    <div className="filter-bar">
      <Group
        label="지역"
        options={['Global', 'KOR'] as const}
        selected={value.region}
        onSelect={(region) => onChange({ ...value, region })}
        format={(v) => (v === 'Global' ? '전 세계' : '한국')}
      />
      <Group
        label="모형"
        options={['ALL', ...MODELS] as const}
        selected={value.model}
        onSelect={(model) => onChange({ ...value, model })}
        format={(v) => (v === 'ALL' ? '전체' : String(v))}
      />
      <Group
        label="기후민감도"
        options={['ALL', ...ECS_VALUES] as const}
        selected={value.ecs}
        onSelect={(ecs) => onChange({ ...value, ecs })}
        format={(v) => (v === 'ALL' ? '전체' : `${v}℃`)}
      />
      <Group
        label="할인율"
        options={['ALL', ...DR_VALUES] as const}
        selected={value.dr}
        onSelect={(dr) => onChange({ ...value, dr })}
        format={(v) => (v === 'ALL' ? '전체' : `${v}%`)}
      />
      <div className="filter-group" role="group" aria-label="통화">
        <span className="group-label">통화</span>
        {(['KRW', 'USD'] as const).map((cur) => (
          <button
            key={cur}
            type="button"
            className={`filter-btn${value.currency === cur ? ' selected' : ''}`}
            disabled={currencyDisabled && cur === 'USD'}
            onClick={() => onChange({ ...value, currency: cur })}
          >
            {cur === 'KRW' ? '원' : '달러'}
          </button>
        ))}
        {currencyDisabled && <span className="filter-note">단위 확정 후 사용할 수 있습니다</span>}
      </div>
    </div>
  )
}
