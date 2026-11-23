<script setup>
import { ref, computed, provide } from 'vue'
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
  AxesDirective as EAxes,
  AxisDirective as EAxis,
  Category,
  ColumnSeries,
  LineSeries,
  Legend,
  Tooltip,
  DataLabel,
} from '@syncfusion/ej2-vue-charts'
import { DropDownListComponent as EjsDropdownlist } from '@syncfusion/ej2-vue-dropdowns'
import { dropdownEdit, lockField } from '../utils/gridEditors'
import { customers, bookings, services, stylists, membershipOptions, customerTypes, salonDailyTrend, saveCustomer, deleteCustomer, saveData, isSameDay, fmtDate } from '../data/store'

provide('grid', [Page, Sort, Filter, Edit, Toolbar])
provide('chart', [Category, ColumnSeries, LineSeries, Legend, Tooltip, DataLabel])

const serviceFilter = ref('All Services')
const serviceOptions = ['All Services', ...services.map((s) => s.Name)]
const priceOf = (name) => services.find((s) => s.Name === name)?.Price ?? 0

const filtered = computed(() =>
  bookings.list.filter((b) => (serviceFilter.value === 'All Services' || b.ServiceType === serviceFilter.value) && b.Status !== 'Cancelled'),
)
const today = new Date()
const kpis = computed(() => {
  const f = filtered.value
  const sum = (arr) => arr.reduce((t, b) => t + priceOf(b.ServiceType), 0)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6); weekAgo.setHours(0, 0, 0, 0)
  const done = f.filter((b) => b.Status === 'Completed')
  return [
    { label: "Today's Bookings", value: f.filter((b) => isSameDay(b.StartTime, today)).length },
    { label: "Today's Revenue", value: '$' + sum(f.filter((b) => isSameDay(b.StartTime, today) && b.Status !== 'Confirmed')) },
    { label: 'Revenue (7 days, completed)', value: '$' + sum(done.filter((b) => new Date(b.StartTime) >= weekAgo)) },
    { label: 'Customers', value: customers.list.length },
  ]
})

const daily = salonDailyTrend

const grid = {
  pageSettings: { pageSize: 6 },
  filterSettings: { type: 'Excel' },
  serviceEditable: { allowEditing: true, allowAdding: true, allowDeleting: true, mode: 'Dialog' },
  serviceToolbar: ['Add', 'Edit', 'Delete'],
  req: { required: true },
  price: { required: true, number: true, min: 0 },
  dur: { required: true, number: true, min: 5 },
}

const stylistNames = stylists.map((s) => s.Name)
const customerEdit = { allowEditing: true, allowAdding: true, allowDeleting: true, mode: 'Dialog' }
// Dropdown lists for the Customers grid edit dialog, built from the shared store data
const stylistEdit = dropdownEdit('PreferredStylist', stylistNames)
const membershipEdit = dropdownEdit('MembershipStatus', membershipOptions)
const typeEdit = dropdownEdit('CustomerType', customerTypes)
const serviceEdit = dropdownEdit('PreferredService', services.map((s) => s.Name))
// Grid -> appData.json: add / edit in the Customers grid is written to the JSON file
const onCustomerActionComplete = (args) => {
  lockField(args, 'CustomerID') // the generated ID can't be typed over
  if (args.requestType === 'save' && args.data) saveCustomer({ ...args.data })
  // deleting a customer also removes their bookings, so the Scheduler stays in step
  if (args.requestType === 'delete' && args.data) [].concat(args.data).forEach((c) => deleteCustomer(c.CustomerID))
}
// the Service catalog grid edits the services list in place, so just persist it
const onServiceActionComplete = (args) => {
  if (args.requestType === 'save' || args.requestType === 'delete') saveData()
}
const onCustomerActionBegin = (args) => {
  if (args.requestType === 'add' && args.data && !args.data.CustomerID) {
    args.data.CustomerID = 'C' + (Math.max(3000, ...customers.list.map((c) => Number(c.CustomerID.slice(1)))) + 1)
    args.data.PreferredStylist = stylistNames[0]
    args.data.MembershipStatus = 'None'
    args.data.CustomerType = 'New'
    args.data.PreferredService = services[0].Name
    args.data.LastAppointment = new Date()
  }
}

const primaryX = { valueType: 'Category', title: 'Date (Daily)' }
const yBookings = { title: 'Number of Bookings', minimum: 0, maximum: 40, interval: 10 }
const yRevenue = { name: 'yRevenue', title: 'Revenue ($)', minimum: 0, maximum: 1600, interval: 400, opposedPosition: true, majorGridLines: { width: 0 } }
const tooltip = { enable: true, shared: false }
const legend = { visible: true }
const marker = { visible: true, width: 8, height: 8 }
</script>

<template>
  <div class="toolbar-row">
    <ejs-dropdownlist :dataSource="serviceOptions" v-model="serviceFilter" width="220px" placeholder="Service" popupHeight="220px" />
  </div>

  <div class="kpis">
    <div v-for="k in kpis" :key="k.label" class="e-card kpi">
      <div class="e-card-content">
        <div class="label">{{ k.label }}</div>
        <div class="value">{{ k.value }}</div>
      </div>
    </div>
  </div>

  <div class="row" style="margin-top: 16px">
    <div class="panel" style="grid-column: 1 / -1">
      <h3>Daily bookings and revenue</h3>
      <ejs-chart :primaryXAxis="primaryX" :primaryYAxis="yBookings" :tooltip="tooltip" :legendSettings="legend" height="320px" :margin="{ right: 30 }">
        <e-axes>
          <e-axis :name="yRevenue.name" :title="yRevenue.title" :minimum="yRevenue.minimum" :maximum="yRevenue.maximum" :interval="yRevenue.interval" :opposedPosition="true" :majorGridLines="yRevenue.majorGridLines" rowIndex="0" />
        </e-axes>
        <e-series-collection>
          <e-series :dataSource="daily" type="Column" xName="date" yName="bookings" name="Daily Bookings" fill="#4f46e5" />
          <e-series :dataSource="daily" type="Line" xName="date" yName="revenue" yAxisName="yRevenue" name="Daily Revenue ($)" fill="#e11d48" :width="3" :marker="marker" />
        </e-series-collection>
      </ejs-chart>
    </div>
  </div>

  <h2 class="section-title">Staff</h2>
  <div class="staff">
    <div v-for="s in stylists" :key="s.Id" class="e-card">
      <div class="e-card-content">
        <strong><span class="dot" :style="{ background: s.Color }"></span>{{ s.Name }}</strong>
        <div style="color: #6b7280; font-size: 13px">{{ s.Role }}</div>
        <div style="font-size: 13px; margin-top: 4px">
          {{ bookings.list.filter((b) => b.Stylist === s.Name && isSameDay(b.StartTime, today) && b.Status !== 'Cancelled').length }} bookings today
        </div>
      </div>
    </div>
  </div>

  <h2 class="section-title">Service catalog</h2>
  <div class="panel">
    <ejs-grid :dataSource="services" :editSettings="grid.serviceEditable" :toolbar="grid.serviceToolbar" :allowSorting="true" :actionComplete="onServiceActionComplete">
      <e-columns>
        <e-column field="Name" headerText="Service" :isPrimaryKey="true" :validationRules="grid.req" />
        <e-column field="Duration" headerText="Duration (min)" editType="numericedit" :validationRules="grid.dur" textAlign="Right" />
        <e-column field="Price" headerText="Price ($)" editType="numericedit" format="C0" :validationRules="grid.price" textAlign="Right" />
      </e-columns>
    </ejs-grid>
  </div>

  <h2 class="section-title">Customers</h2>
  <div class="panel">
    <ejs-grid
      :dataSource="customers.list"
      :allowPaging="true"
      :allowSorting="true"
      :allowFiltering="true"
      :filterSettings="grid.filterSettings"
      :pageSettings="grid.pageSettings"
      :editSettings="customerEdit"
      :toolbar="['Add', 'Edit', 'Delete', 'Search']"
      :actionBegin="onCustomerActionBegin"
      :actionComplete="onCustomerActionComplete"
    >
      <e-columns>
        <e-column field="CustomerID" headerText="Customer ID" :isPrimaryKey="true" :allowEditing="false" width="120" />
        <e-column field="CustomerName" headerText="Customer Name" :validationRules="{ required: true }" width="170" />
        <e-column field="PhoneNumber" headerText="Phone Number" :validationRules="{ required: true }" width="140" />
        <e-column field="PreferredStylist" headerText="Preferred Stylist" editType="dropdownedit" :edit="stylistEdit" width="160" />
        <e-column field="LastAppointment" headerText="Last Appointment" type="date" format="yMd" editType="datepickeredit" textAlign="Right" width="150" />
        <e-column field="CustomerType" headerText="Customer Type" editType="dropdownedit" :edit="typeEdit" width="140" />
        <e-column field="PreferredService" headerText="Preferred Service" editType="dropdownedit" :edit="serviceEdit" width="160" />
        <e-column field="MembershipStatus" headerText="Membership Status" editType="dropdownedit" :edit="membershipEdit" width="150" />
        <e-column field="BookingID" headerText="Booking ID" :allowEditing="false" width="120" />
        <e-column field="LatestBooking" headerText="Latest Booking" type="date" format="yyyy/MM/dd" :allowEditing="false" width="190" />
        <e-column field="ServiceBooked" headerText="Service Booked" :allowEditing="false" width="150" />
        <e-column field="BookingStatus" headerText="Booking Status" :allowEditing="false" width="150" />
      </e-columns>
    </ejs-grid>
  </div>
</template>


