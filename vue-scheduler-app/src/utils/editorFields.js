import { DropDownList } from '@syncfusion/ej2-dropdowns'
import { createElement } from '@syncfusion/ej2-base'

const buildRow = (form, field, label, atTop) => {
  const row = createElement('div', { className: 'custom-field-row', styles: 'margin-top: 12px' })
  row.appendChild(createElement('div', { innerHTML: label, styles: 'font-size: 12px; color: #6b7280' }))
  const input = createElement('input', { className: atTop ? 'e-field e-lookup-id' : 'e-field', attrs: { name: field } })
  row.appendChild(input)
  if (atTop) form.insertBefore(row, form.firstChild)
  else form.appendChild(row)
  return input
}

// Extra dropdown inside the Scheduler's built-in editor (value is saved with the event).
export const addDropdown = (form, field, label, items, value) => {
  new DropDownList({ dataSource: items, value, popupHeight: '200px' }).appendTo(buildRow(form, field, label, false))
}

// "Patient ID" / "Customer ID" lookup at the top of the editor. Picking an ID calls onPick(record)
// so the caller can fill the other editor fields from the matching Data Grid record.
export const addLookup = (form, { field, label, records, idField, nameField, value, readonly = false, onPick }) => {
  const items = records.map((r) => ({ id: r[idField], text: `${r[idField]} - ${r[nameField]}` }))
  new DropDownList({
    dataSource: items,
    fields: { text: 'text', value: 'id' },
    value,
    readonly,
    placeholder: `Select or type ${label}`,
    allowFiltering: true,
    filterType: 'Contains',
    popupHeight: '220px',
    change: (e) => {
      if (!e.isInteracted) return
      const rec = records.find((r) => r[idField] === e.value)
      if (rec) onPick(rec)
    },
  }).appendTo(buildRow(form, field, label, true))
}

// The editor form is built once and reused, so the lookup's state is refreshed on every open:
// locked for an existing appointment, selectable for a new one.
export const refreshLookup = (form, field, { readonly, value }) => {
  const dd = form.querySelector('input.e-lookup-id')?.ej2_instances?.[0]
  if (!dd) return
  dd.readonly = readonly
  dd.value = value ?? null
}

// Set a value on a field of the Scheduler editor (text input or resource dropdown).
export const setEditorField = (form, name, value) => {
  const el = form.querySelector(`[name="${name}"]`)
  if (!el) return
  // Resource fields render as a hidden <select>; the dropdown instance lives on the visible input beside it
  const holder = el.ej2_instances?.length ? el : el.parentElement?.querySelector('input.e-dropdownlist')
  const inst = holder?.ej2_instances?.[0]
  if (inst) inst.value = value
  else {
    el.value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

// Scheduler -> Data Grid sync. `store` is the reactive { list } bound to the grid; `args` is the
// scheduler's actionComplete event carrying the added / changed / deleted records.
export const applySchedulerChange = (store, args) => {
  const clean = ({ Guid, ...rest }) => rest
  // assign a new array each time so the bound Grid sees a new dataSource and re-renders
  const upsert = (rec) => {
    const i = store.list.findIndex((r) => r.Id === rec.Id)
    store.list =
      i >= 0
        ? store.list.map((r, idx) => (idx === i ? { ...r, ...clean(rec) } : r))
        : [...store.list, clean(rec)]
  }
  if (args.requestType === 'eventCreated') (args.addedRecords || []).forEach(upsert)
  if (args.requestType === 'eventChanged') (args.changedRecords || []).forEach(upsert)
  if (args.requestType === 'eventRemoved') {
    const ids = (args.deletedRecords || []).map((r) => r.Id)
    store.list = store.list.filter((r) => !ids.includes(r.Id))
  }
}

