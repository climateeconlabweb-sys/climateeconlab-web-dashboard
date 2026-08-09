'use client'
import { MODELS, ECS_VALUES, DR_VALUES, type Ecs, type Dr, type Model } from '@/lib/types'
import type { FilterState } from '@/lib/filter'

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

function Select({ label, value, options, onChange }: {
  label: string
  value: string
  options: { value: string; text: string; disabled?: boolean }[]
  onChange: (v: string) => void
}) {
  return (
    <label className="filter-select">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>{o.text}</option>
        ))}
      </select>
    </label>
  )
}

export default function FilterBar({ value, onChange }: Props) {
  return (
    <div className="filter-bar">
      {/* 데스크톱: 버튼 그룹 */}
      <div className="filter-groups-desktop">
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
              onClick={() => onChange({ ...value, currency: cur })}
            >
              {cur === 'KRW' ? '원' : '달러'}
            </button>
          ))}
        </div>
      </div>

      {/* 모바일: 카테고리별 드롭다운, 공간 부족 시 가로 스크롤 */}
      <div className="filter-groups-mobile">
        <Select
          label="지역" value={value.region}
          options={[{ value: 'Global', text: '전 세계' }, { value: 'KOR', text: '한국' }]}
          onChange={(v) => onChange({ ...value, region: v as FilterState['region'] })}
        />
        <Select
          label="모형" value={value.model}
          options={[{ value: 'ALL', text: '전체' }, ...MODELS.map((m) => ({ value: m, text: m }))]}
          onChange={(v) => onChange({ ...value, model: v as 'ALL' | Model })}
        />
        <Select
          label="기후민감도" value={String(value.ecs)}
          options={[{ value: 'ALL', text: '전체' }, ...ECS_VALUES.map((e) => ({ value: String(e), text: `${e}℃` }))]}
          onChange={(v) => onChange({ ...value, ecs: v === 'ALL' ? 'ALL' : (Number(v) as Ecs) })}
        />
        <Select
          label="할인율" value={String(value.dr)}
          options={[{ value: 'ALL', text: '전체' }, ...DR_VALUES.map((d) => ({ value: String(d), text: `${d}%` }))]}
          onChange={(v) => onChange({ ...value, dr: v === 'ALL' ? 'ALL' : (Number(v) as Dr) })}
        />
        <Select
          label="통화" value={value.currency}
          options={[
            { value: 'KRW', text: '원' },
            { value: 'USD', text: '달러' },
          ]}
          onChange={(v) => onChange({ ...value, currency: v as FilterState['currency'] })}
        />
      </div>
    </div>
  )
}
