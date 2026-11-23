<script setup>
import { computed, provide } from 'vue'
import {
  GridComponent as EjsGrid,
  ColumnsDirective as EColumns,
  ColumnDirective as EColumn,
  Page,
  Sort,
  Filter,
  Edit,
  Toolbar,
} from '@syncfusion/ej2-vue-grids'
import {
  ChartComponent as EjsChart,
  SeriesCollectionDirective as ESeriesCollection,
  SeriesDirective as ESeries,
  Category,
  ColumnSeries,
  LineSeries,
  Legend,
  Tooltip,
  DataLabel,
} from '@syncfusion/ej2-vue-charts'
import { ListViewComponent as EjsListview } from '@syncfusion/ej2-vue-lists'
import { dropdownEdit, lockField } from '../utils/gridEditors'
import { genders, patientStatuses, patients, doctors, clinicAppointments, clinicMonthlyTrend, savePatient, deletePatient, isSameDay, fmtDate, fmtTime } from '../data/store'

provide('grid', [Page, Sort, Filter, Edit, Toolbar])
provide('chart', [Category, ColumnSeries, LineSeries, Legend, Tooltip, DataLabel])

const today = new Date()
const stats = computed(() => {
  const l = clinicAppointments.list
  return [
    { label: "Today's Appointments", value: l.filter((a) => isSameDay(a.StartTime, today)).length },
    { label: 'Total Patients', value: patients.list.length },
    { label: 'Completed', value: l.filter((a) => a.Status === 'Completed').length },
    { label: 'Cancelled', value: l.filter((a) => a.Status === 'Cancelled').length },
  ]
})

const upcomingItems = computed(() =>
  upcoming.value.length
    ? upcoming.value.map((a) => ({ Id: a.Id, text: `${a.Subject} · ${a.Doctor} · ${a.VisitType} — ${fmtDate(a.StartTime)} ${fmtTime(a.StartTime)}` }))
    : [{ Id: 'none', text: 'No upcoming appointments.' }],
)
const upcoming = computed(() =>
  clinicAppointments.list
    .filter((a) => new Date(a.StartTime) >= today && a.Status === 'Scheduled')
    .sort((a, b) => new Date(a.StartTime) - new Date(b.StartTime))
    .slice(0, 6),
)

const grid = {
  editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, mode: 'Dialog' },
  toolbar: ['Add', 'Edit', 'Delete', 'Search'],
  filterSettings: { type: 'Excel' },
  pageSettings: { pageSize: 6 },
  genderRule: { required: true },
  nameRule: { required: true },
  ageRule: { required: true, number: true, min: 0, max: 120 },
  genderEdit: dropdownEdit('Gender', genders),
  doctorEdit: dropdownEdit('DoctorAssigned', doctors.map((d) => d.Name)),
  statusEdit: dropdownEdit('Status', patientStatuses),
}
// Grid -> appData.json: every add / edit / delete in the Patients grid is written to the JSON file
const onActionComplete = (args) => {
  lockField(args, 'PatientID') // the generated ID can't be typed over
  if (args.requestType === 'save' && args.data) savePatient({ ...args.data })
  if (args.requestType === 'delete' && args.data) [].concat(args.data).forEach((p) => deletePatient(p.PatientID))
}
const onActionBegin = (args) => {
  if (args.requestType === 'add' && args.data && !args.data.PatientID) {
    args.data.PatientID = 'P' + (Math.max(1000, ...patients.list.map((p) => Number(p.PatientID.slice(1)))) + 1)
    args.data.Status = 'Active'
    args.data.LastVisitDate = new Date()
  }
}

const monthlyData = clinicMonthlyTrend
const trendTooltip = { enable: true, shared: false, format: '${point.x}: <b>${point.y}</b> appointments' }
const primaryX = { valueType: 'Category', title: 'Month (Last 6 Months)', majorGridLines: { width: 0 } }
const primaryY = { title: 'Total Appointments per Month', minimum: 0, maximum: 220, interval: 40 }
const marker = { dataLabel: { visible: true, position: 'Top' } }
const legend = { visible: true }
const seriesFill = '#4f46e5'
</script>

<template>
  <div class="kpis">
    <div v-for="s in stats" :key="s.label" class="e-card kpi">
      <div class="e-card-content">
        <div class="label">{{ s.label }}</div>
        <div class="value">{{ s.value }}</div>
      </div>
    </div>
  </div>

  <div class="row" style="margin-top: 16px">
    <div class="panel">
      <h3>Total appointments per month (last 6 months)</h3>
      <ejs-chart :primaryXAxis="primaryX" :primaryYAxis="primaryY" :tooltip="trendTooltip" height="300px" :legendSettings="legend">
        <e-series-collection>
          <e-series :dataSource="monthlyData" type="Column" xName="month" yName="appointments" name="Total Appointments" :fill="seriesFill" :marker="marker" :animation="{ enable: false }" />
        </e-series-collection>
      </ejs-chart>
    </div>
    <div class="panel">
      <h3>Upcoming appointments</h3>
      <ejs-listview :dataSource="upcomingItems" :fields="{ id: 'Id', text: 'text' }" :showHeader="false" cssClass="upcoming-list" />
    </div>
  </div>

  <h2 class="section-title">Doctor directory</h2>
  <div class="staff">
    <div v-for="d in doctors" :key="d.Id" class="e-card">
      <div class="e-card-content">
        <strong><span class="dot" :style="{ background: d.Color }"></span>{{ d.Name }}</strong>
        <div style="color: #6b7280; font-size: 13px">{{ d.Specialty }}</div>
      </div>
    </div>
  </div>

  <h2 class="section-title">Patients</h2>
  <div class="panel">
    <ejs-grid
      :dataSource="patients.list"
      :allowPaging="true"
      :allowSorting="true"
      :allowFiltering="true"
      :filterSettings="grid.filterSettings"
      :pageSettings="grid.pageSettings"
      :editSettings="grid.editSettings"
      :toolbar="grid.toolbar"
      :actionBegin="onActionBegin"
      :actionComplete="onActionComplete"
    >
      <e-columns>
        <e-column field="PatientID" headerText="Patient ID" :isPrimaryKey="true" :allowEditing="false" width="110" />
        <e-column field="PatientName" headerText="Patient Name" :validationRules="grid.nameRule" width="160" />
        <e-column field="Age" headerText="Age" editType="numericedit" :validationRules="grid.ageRule" textAlign="Right" width="90" />
        <e-column field="Gender" headerText="Gender" editType="dropdownedit" :edit="grid.genderEdit" :validationRules="grid.genderRule" width="110" />
        <e-column field="DoctorAssigned" headerText="Doctor Assigned" editType="dropdownedit" :edit="grid.doctorEdit" width="160" />
        <e-column field="LastVisitDate" headerText="Last Visit Date" type="date" format="yMd" editType="datepickeredit" textAlign="Right" width="150" />
        <e-column field="Status" headerText="Status" editType="dropdownedit" :edit="grid.statusEdit" width="110" />
        <e-column field="AppointmentID" headerText="Appointment ID" :allowEditing="false" width="140" />
        <e-column field="LatestAppointment" headerText="Latest Appointment" type="date" format="yyyy/MM/dd" :allowEditing="false" width="190" />
        <e-column field="VisitType" headerText="Visit Type" :allowEditing="false" width="130" />
        <e-column field="AppointmentStatus" headerText="Appointment Status" :allowEditing="false" width="160" />
      </e-columns>
    </ejs-grid>
  </div>
</template>


