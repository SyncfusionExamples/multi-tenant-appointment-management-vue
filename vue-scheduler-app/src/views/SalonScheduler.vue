<script setup>
import { ref, provide } from 'vue'
import {
  ScheduleComponent as EjsSchedule,
  ViewsDirective as EViews,
  ViewDirective as EView,
  ResourcesDirective as EResources,
  ResourceDirective as EResource,
  Day,
  Week,
  WorkWeek,
  Month,
  Agenda,
} from '@syncfusion/ej2-vue-schedule'
import { ButtonComponent as EjsButton } from '@syncfusion/ej2-vue-buttons'
import { bookings, customers, syncCustomerBookings, applyAppointmentToCustomer, saveData, stylists, services, salonStatuses } from '../data/store'
import { addDropdown, addLookup, setEditorField, refreshLookup, applySchedulerChange } from '../utils/editorFields'

provide('schedule', [Day, Week, WorkWeek, Month, Agenda])

const schedule = ref(null)
const eventSettings = { dataSource: bookings.list }
const instance = () => schedule.value.ej2Instances
const serviceNames = services.map((s) => s.Name)

// New Booking button -> built-in Scheduler event editor dialog
const newBooking = () => {
  const start = new Date()
  start.setMinutes(start.getMinutes() < 30 ? 30 : 60, 0, 0)
  instance().openEditor({ startTime: start, endTime: new Date(start.getTime() + 45 * 60000) }, 'Add')
}
// Clicking an empty cell / an existing event -> same editor dialog
const onCellClick = (args) => {
  args.cancel = true
  instance().openEditor({ startTime: args.startTime, endTime: args.endTime, isAllDay: args.isAllDay }, 'Add')
}
const onEventClick = (args) => {
  args.cancel = true
  instance().openEditor(args.event, 'Save')
}

const onPopupOpen = (args) => {
  if (args.type === 'QuickInfo') {
    args.cancel = true
  } else if (args.type === 'Editor') {
    const form = args.element.querySelector('.e-schedule-form')
    if (form && !form.querySelector('[name=ServiceType]')) {
      // Customer ID lookup: reads the Customer grid's records and fills the editor from the chosen one
      addLookup(form, {
        field: 'CustomerID',
        label: 'Customer ID',
        records: customers.list,
        idField: 'CustomerID',
        nameField: 'CustomerName',
        value: args.data.CustomerID,
        readonly: !!args.data.Id, // an existing booking keeps its customer
        onPick: (c) => {
          setEditorField(form, 'Subject', c.CustomerName)
          setEditorField(form, 'Stylist', c.PreferredStylist)
          setEditorField(form, 'ServiceType', c.PreferredService)
        },
      })
      addDropdown(form, 'ServiceType', 'Service Type', serviceNames, args.data.ServiceType || serviceNames[0])
      addDropdown(form, 'Status', 'Status', salonStatuses, args.data.Status || 'Confirmed')
    }
    if (form) refreshLookup(form, 'CustomerID', { readonly: !!args.data.Id, value: args.data.CustomerID })
  }
}
const onActionBegin = (args) => {
  if (args.requestType === 'eventCreate' || args.requestType === 'eventChange') {
    const rec = Array.isArray(args.data) ? args.data[0] : args.data
    if (args.requestType === 'eventCreate') {
      const max = Math.max(4000, ...bookings.list.map((b) => Number(String(b.Id).slice(1)) || 0))
      rec.Id = 'B' + (max + 1)
    }
    const customer = customers.list.find((c) => c.CustomerID === rec.CustomerID)
    if (customer) rec.Subject = customer.CustomerName
    rec.Duration = Math.round((new Date(rec.EndTime) - new Date(rec.StartTime)) / 60000)
  }
}
const onActionComplete = (args) => {
  if (['eventCreated', 'eventChanged', 'eventRemoved'].includes(args.requestType)) {
    applySchedulerChange(bookings, args)
    // Scheduler -> Grid: new / moved bookings set the customer's Preferred Stylist and Last Appointment
    if (args.requestType !== 'eventRemoved') [...(args.addedRecords || []), ...(args.changedRecords || [])].forEach(applyAppointmentToCustomer)
    syncCustomerBookings() // -> Customer grid on the Customer Management page
    saveData() // -> appData.json
  }
}
const eventRendered = (args) => {
  if (args.data.Status === 'Cancelled') args.element.style.opacity = '0.5'
}
</script>

<template>
  <h1 class="page-title">Salon · Appointment Scheduler</h1>
  <div class="toolbar-row">
    <span></span>
    <ejs-button cssClass="e-primary" @click="newBooking">+ New Booking</ejs-button>
  </div>

  <div class="panel">
    <ejs-schedule
      ref="schedule"
      height="680px"
      :selectedDate="new Date()"
      :eventSettings="eventSettings"
      :showQuickInfo="false"
      :popupOpen="onPopupOpen"
      :cellClick="onCellClick"
      :eventClick="onEventClick"
      :actionBegin="onActionBegin"
      :actionComplete="onActionComplete"
      :eventRendered="eventRendered"
    >
      <e-views>
        <e-view option="Day" />
        <e-view option="Week" />
        <e-view option="Month" />
        <e-view option="Agenda" />
      </e-views>
      <e-resources>
        <e-resource field="Stylist" title="Stylist" name="Stylists" :dataSource="stylists" textField="Name" idField="Name" colorField="Color" />
      </e-resources>
    </ejs-schedule>
  </div>
</template>

