// Edit-cell config for Grid columns with editType="dropdownedit".
// The Grid's dropdown editor reads each item through `fields`, defaulting to the column's own
// field name. A plain string array therefore renders "No records found", so we wrap every value in
// an object keyed by the column field and point `fields` at that key.
export const dropdownEdit = (field, values) => ({
  params: {
    dataSource: values.map((v) => ({ [field]: v })),
    fields: { text: field, value: field },
    allowFiltering: false,
    popupHeight: '220px',
  },
})

// Makes a column's input read-only inside the Grid's Add / Edit dialog (used for the ID columns).
// Call it from the grid's actionComplete handler.
export const lockField = (args, field) => {
  if (args.requestType !== 'beginEdit' && args.requestType !== 'add') return
  const input = args.form?.querySelector(`[name="${field}"]`)
  if (!input) return
  input.readOnly = true
  const box = input.ej2_instances?.[0]
  if (box) box.readonly = true
}
