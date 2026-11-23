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
import { clinicAppointments, patients, syncPatientAppointments, applyAppointmentToPatient, saveData, doctors, visitTypes, clinicStatuses } from '../data/store'
import { addDropdown, addLookup, setEditorField, refreshLookup, applySchedulerChange } from '../utils/editorFields'

provide('schedule', [Day, Week, WorkWeek, Month, Agenda])

const schedule = ref(null)
const eventSettings = { dataSource: clinicAppointments.list }
const instance = () => schedule.value.ej2Instances

// New Appointment button -> built-in Scheduler event editor dialog
const newAppointment = () => {
  const start = new Date()
  start.setMinutes(start.getMinutes() < 30 ? 30 : 60, 0, 0)
  instance().openEditor({ startTime: start, endTime: new Date(start.getTime() + 30 * 60000) }, 'Add')
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
    if (form && !form.querySelector('[name=VisitType]')) {
      // Patient ID lookup: reads the Patient grid's records and fills the editor from the chosen one
      addLookup(form, {
        field: 'PatientID',
        label: 'Patient ID',
        records: patients.list,
        idField: 'PatientID',
        nameField: 'PatientName',
        value: args.data.PatientID,
        readonly: !!args.data.Id, // an existing appointment keeps its patient
        onPick: (p) => {
          setEditorField(form, 'Subject', p.PatientName)
          setEditorField(form, 'Doctor', p.DoctorAssigned)
        },
      })
      addDropdown(form, 'VisitType', 'Visit Type', visitTypes, args.data.VisitType || 'Consultation')
      addDropdown(form, 'Status', 'Status', clinicStatuses, args.data.Status || 'Scheduled')
    }
    if (form) refreshLookup(form, 'PatientID', { readonly: !!args.data.Id, value: args.data.PatientID })
  }
}
const onActionBegin = (args) => {
  if (args.requestType === 'eventCreate' || args.requestType === 'eventChange') {
    const rec = Array.isArray(args.data) ? args.data[0] : args.data
    if (args.requestType === 'eventCreate') {
      const max = Math.max(2000, ...clinicAppointments.list.map((a) => Number(String(a.Id).slice(1)) || 0))
      rec.Id = 'A' + (max + 1)
    }
    const patient = patients.list.find((p) => p.PatientID === rec.PatientID)
    if (patient) rec.Subject = patient.PatientName
  }
}
const onActionComplete = (args) => {
  if (['eventCreated', 'eventChanged', 'eventRemoved'].includes(args.requestType)) {
    applySchedulerChange(clinicAppointments, args)
    // Scheduler -> Grid: new / moved appointments set the patient's Doctor Assigned and Last Visit Date
    if (args.requestType !== 'eventRemoved') [...(args.addedRecords || []), ...(args.changedRecords || [])].forEach(applyAppointmentToPatient)
    syncPatientAppointments() // -> Patient grid on the Patient Management page
    saveData() // -> appData.json
  }
}
const eventRendered = (args) => {
  if (args.data.Status === 'Cancelled') args.element.style.opacity = '0.5'
  if (args.data.Status === 'Completed') args.element.style.filter = 'saturate(0.6)'
}
</script>

<template>
  <h1 class="page-title">Clinic · Appointment Scheduling</h1>
  <div class="toolbar-row">
    <span></span>
    <ejs-button cssClass="e-primary" @click="newAppointment">+ New Appointment</ejs-button>
  </div>
  <div class="panel">
    <ejs-schedule
      ref="schedule"
      height="680px"
      :selectedDate="new Date()"
      :eventSettings="eventSettings"
      :showQuickInfo="false"
      startHour="00:00"
      endHour="24:00"
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
        <e-resource field="Doctor" title="Doctor" name="Doctors" :dataSource="doctors" textField="Name" idField="Name" colorField="Color" />
      </e-resources>
    </ejs-schedule>
  </div>
</template>

