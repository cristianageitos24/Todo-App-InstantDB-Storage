'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {Icon} from './WorkUI';
import {
  availableGroupBy,
  displaySummary,
  FILTER_CHIPS,
  FilterChip,
  GROUP_OPTIONS,
  GroupBy,
  isSmart,
  Place,
  SORT_OPTIONS,
  SortMode,
  sortLocked,
} from '@/lib/workroom-views';

export default function DisplayMenu({
  place,
  sort,
  groupBy,
  chips,
  showCompleted,
  onSort,
  onGroupBy,
  onChips,
  onShowCompleted,
}: {
  place: Place;
  sort: SortMode;
  groupBy: GroupBy;
  chips: FilterChip[];
  showCompleted: boolean;
  onSort: (sort: SortMode) => void;
  onGroupBy: (groupBy: GroupBy) => void;
  onChips: (chips: FilterChip[]) => void;
  onShowCompleted: (show: boolean) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const grouping = availableGroupBy(place);
  const lockedSort = sortLocked(place);
  const summary = displaySummary(place, sort, groupBy, chips, showCompleted);
  const hideCompleted = isSmart(place, 'done');

  const toggleChip = (chip: FilterChip) => {
    onChips(chips.includes(chip) ? chips.filter(item => item !== chip) : [...chips, chip]);
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="display-menu" ref={root}>
      <button
        type="button"
        className={`display-trigger${open || summary ? ' is-active' : ''}`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen(current => !current)}
      >
        <span>{summary || 'Display'}</span>
        <Icon name="chevron" size={14}/>
      </button>
      {open && (
        <div className="display-panel" id={`${id}-panel`}>
          <div className="display-section">
            <p>Filter</p>
            <div className="display-chips">
              {FILTER_CHIPS.map(chip => (
                <button
                  type="button"
                  key={chip.id}
                  aria-pressed={chips.includes(chip.id)}
                  onClick={() => toggleChip(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
          {grouping.length > 0 && (
            <label>
              Group by
              <select aria-label="Group by" value={grouping.includes(groupBy) ? groupBy : 'none'} onChange={event => onGroupBy(event.target.value as GroupBy)}>
                {GROUP_OPTIONS.filter(option => grouping.includes(option.id)).map(option => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
          )}
          {grouping.length === 0 && isSmart(place, 'upcoming') && <p className="display-note">Upcoming is grouped by date.</p>}
          <label>
            Sort
            {lockedSort ? (
              <span className="display-locked">Due date</span>
            ) : (
              <select aria-label="Sort" value={sort} onChange={event => onSort(event.target.value as SortMode)}>
                {SORT_OPTIONS.map(option => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            )}
          </label>
          {!hideCompleted && (
            <label className="display-check">
              <input type="checkbox" checked={showCompleted} onChange={event => onShowCompleted(event.target.checked)}/>
              Show completed
            </label>
          )}
        </div>
      )}
    </div>
  );
}

export function ActiveChips({
  chips,
  onRemove,
  onClear,
}: {
  chips: FilterChip[];
  onRemove: (chip: FilterChip) => void;
  onClear: () => void;
}) {
  if (!chips.length) return null;
  return (
    <div className="active-chips" aria-label="Active filters">
      {chips.map(chip => {
        const found = FILTER_CHIPS.find(item => item.id === chip);
        return (
          <button type="button" key={chip} onClick={() => onRemove(chip)}>
            {found?.label || chip}
            <Icon name="close" size={12}/>
          </button>
        );
      })}
      {chips.length > 1 && <button type="button" className="wr-text" onClick={onClear}>Clear</button>}
    </div>
  );
}
