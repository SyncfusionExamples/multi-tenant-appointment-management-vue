import { reactive } from 'vue'

// Single source of truth: src/data/appData.json, served by the /api/data endpoint (see vite.config.js).
// Every list below is filled from that file by loadData(), and saveData() writes the whole thing back.
const API = `${import.meta.env.BASE_URL}api/data`

// ---------- lists that live in the JSON file ----------
// Reference lists are plain arrays that are filled in place, so imports stay valid after loadData().
export const visitTypes = []
export const clinicStatuses = []
export const genders = []
export const patientStatuses = []
export const doctors = []
export const clinicMonthlyTrend = []
export const salonStatuses = []
export const membershipOptions = []
export const customerTypes = []
export const stylists = []
export const services = []
export const salonDailyTrend = []

// Records that the Grids / Schedulers edit are reactive { list } holders
export const patients = reactive({ list: [] })
export const clinicAppointments = reactive({ list: [] })
export const customers = reactive({ list: [] })
export const bookings = reactive({ list: [] })

const STATIC_LISTS = {
  visitTypes, clinicStatuses, genders, patientStatuses, doctors, clinicMonthlyTrend,
  salonStatuses, membershipOptions, customerTypes, stylists, services, salonDailyTrend,
}
// JSON has dates as ISO strings; the Grid and Scheduler need Date objects
const DATE_FIELDS = {
  patients: ['LastVisitDate'],
  clinicAppointments: ['StartTime', 'EndTime'],
  customers: ['LastAppointment'],
  bookings: ['StartTime', 'EndTime'],
}
// Columns that are not written to the file: computed from appointments (Grid display only), or
// Scheduler-internal fields this app never uses (all-day, time zones, recurrence)
const SCHEDULER_UNUSED = ['IsAllDay', 'StartTimezone', 'EndTimezone', 'RecurrenceRule', 'Guid']
const NOT_STORED_FIELDS = {
  patients: ['AppointmentID', 'LatestAppointment', 'VisitType', 'AppointmentStatus'],
  customers: ['BookingID', 'LatestBooking', 'ServiceBooked', 'BookingStatus'],
  clinicAppointments: SCHEDULER_UNUSED,
  bookings: SCHEDULER_UNUSED,
}

const revive = (rows, key) =>
  rows.map((r) => {
    const o = { ...r }
    for (const f of DATE_FIELDS[key]) if (o[f]) o[f] = new Date(o[f])
    return o
  })
const strip = (rows, key) =>
  rows.map((r) => {
    const o = { ...r }
    for (const f of NOT_STORED_FIELDS[key] || []) delete o[f]
    return o
  })

export const loadData = async () => {
  const res = await fetch(API, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Could not load ${API} (${res.status})`)
  const d = await res.json()
  for (const [key, arr] of Object.entries(STATIC_LISTS)) arr.splice(0, arr.length, ...(d[key] || []))
  patients.list = revive(d.patients, 'patients')
  clinicAppointments.list = revive(d.clinicAppointments, 'clinicAppointments')
  customers.list = revive(d.customers, 'customers')
  bookings.list = revive(d.bookings, 'bookings')
  syncPatientAppointments()
  syncCustomerBookings()
}

let timer = null
let inFlight = Promise.resolve()
const write = () => {
  const body = {
    ...Object.fromEntries(Object.entries(STATIC_LISTS).map(([k, v]) => [k, v])),
    patients: strip(patients.list, 'patients'),
    clinicAppointments: strip(clinicAppointments.list, 'clinicAppointments'),
    customers: strip(customers.list, 'customers'),
    bookings: strip(bookings.list, 'bookings'),
  }
  // writes are queued so two quick edits can never land out of order
  inFlight = inFlight
    .then(() => fetch(API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))
    .then((r) => {
      if (!r.ok) throw new Error('save failed ' + r.status)
    })
    .catch((e) => console.error('Saving appData.json failed:', e))
  return inFlight
}
// Call after any change; quick consecutive changes are written once
export const saveData = () => {
  clearTimeout(timer)
  return new Promise((resolve) => {
    timer = setTimeout(() => write().then(resolve), 150)
  })
}

// ---------- helpers ----------
export const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString()
export const fmtDate = (d) => new Date(d).toLocaleDateString()
export const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

// ---------- Scheduler -> Grid ----------
// The Patients / Customers grids show each person's latest appointment. After every scheduler
// change we recompute it from the appointment list and write it onto that person's record.
const latestFor = (events, idField, id) =>
  events
    .filter((e) => e[idField] === id && e.Status !== 'Cancelled')
    .sort((a, b) => new Date(b.StartTime) - new Date(a.StartTime))[0]

export const syncPatientAppointments = () => {
  patients.list = patients.list.map((p) => {
    const a = latestFor(clinicAppointments.list, 'PatientID', p.PatientID)
    return {
      ...p,
      AppointmentID: a?.Id ?? null,
      LatestAppointment: a?.StartTime ?? null,
      VisitType: a?.VisitType ?? null,
      AppointmentStatus: a?.Status ?? null,
    }
  })
}

export const syncCustomerBookings = () => {
  customers.list = customers.list.map((c) => {
    const b = latestFor(bookings.list, 'CustomerID', c.CustomerID)
    return {
      ...c,
      BookingID: b?.Id ?? null,
      LatestBooking: b?.StartTime ?? null,
      ServiceBooked: b?.ServiceType ?? null,
      BookingStatus: b?.Status ?? null,
    }
  })
}

// ---------- two-way sync: Grid <-> Scheduler ----------
// Both sides edit the same records in the shared store:
//   Grid  -> Scheduler : changing a patient's Doctor Assigned / a customer's Preferred Stylist moves their
//                        open appointments to that doctor / stylist (savePatient / saveCustomer below).
//   Scheduler -> Grid  : creating or changing an appointment sets the person's Doctor Assigned / Preferred
//                        Stylist and Last Visit / Last Appointment (applyAppointmentToPatient / ...Customer).
// "Open" = not yet Completed or Cancelled; finished appointments keep the doctor / stylist they had.
const isOpen = (a) => a.Status !== 'Completed' && a.Status !== 'Cancelled'
const later = (a, b) => (b && (!a || new Date(b) > new Date(a)) ? new Date(b) : a)

// A new array is always assigned so the bound Grid / Scheduler sees the change.
const upsert = (holder, idField, rec) => {
  const i = holder.list.findIndex((r) => r[idField] === rec[idField])
  holder.list = i >= 0 ? holder.list.map((r, n) => (n === i ? { ...r, ...rec } : r)) : [...holder.list, { ...rec }]
}

export const applyAppointmentToPatient = (appt) => {
  patients.list = patients.list.map((p) =>
    p.PatientID !== appt.PatientID
      ? p
      : {
          ...p,
          DoctorAssigned: isOpen(appt) && appt.Doctor ? appt.Doctor : p.DoctorAssigned,
          LastVisitDate: later(p.LastVisitDate, appt.StartTime),
        },
  )
}
export const applyAppointmentToCustomer = (booking) => {
  customers.list = customers.list.map((c) =>
    c.CustomerID !== booking.CustomerID
      ? c
      : {
          ...c,
          PreferredStylist: isOpen(booking) && booking.Stylist ? booking.Stylist : c.PreferredStylist,
          LastAppointment: later(c.LastAppointment, booking.StartTime),
        },
  )
}

export const savePatient = (rec) => {
  const before = patients.list.find((p) => p.PatientID === rec.PatientID)
  const doctorChanged = !!before && before.DoctorAssigned !== rec.DoctorAssigned
  upsert(patients, 'PatientID', rec)
  clinicAppointments.list = clinicAppointments.list.map((a) =>
    a.PatientID !== rec.PatientID
      ? a
      : { ...a, Subject: rec.PatientName, ...(doctorChanged && isOpen(a) ? { Doctor: rec.DoctorAssigned } : {}) },
  )
  syncPatientAppointments()
  return saveData()
}
export const deletePatient = (id) => {
  patients.list = patients.list.filter((p) => p.PatientID !== id)
  clinicAppointments.list = clinicAppointments.list.filter((a) => a.PatientID !== id)
  return saveData()
}
export const saveCustomer = (rec) => {
  const before = customers.list.find((c) => c.CustomerID === rec.CustomerID)
  const stylistChanged = !!before && before.PreferredStylist !== rec.PreferredStylist
  upsert(customers, 'CustomerID', rec)
  bookings.list = bookings.list.map((b) =>
    b.CustomerID !== rec.CustomerID
      ? b
      : { ...b, Subject: rec.CustomerName, ...(stylistChanged && isOpen(b) ? { Stylist: rec.PreferredStylist } : {}) },
  )
  syncCustomerBookings()
  return saveData()
}
// removes the customer and all of their bookings, so the Scheduler no longer shows them
export const deleteCustomer = (id) => {
  customers.list = customers.list.filter((c) => c.CustomerID !== id)
  bookings.list = bookings.list.filter((b) => b.CustomerID !== id)
  return saveData()
}
