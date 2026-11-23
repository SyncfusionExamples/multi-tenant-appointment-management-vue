# Multi-Tenant Appointment Management (Vue)
A Vue 3 sample application that shows how Syncfusion Vue components can be combined to build appointment management for more than one business type (tenant) in a single app. It includes two modules, a Clinic and a Salon. Each module has a dashboard and a scheduler, and the two views edit the same shared data.

## Description and Purpose
The sample demonstrates these Syncfusion scenarios:

-Scheduling appointments with the Syncfusion Vue Scheduler, using resource grouping (doctors or stylists), multiple views, and a customized event editor.
Managing master records (patients, customers, services) with the Syncfusion Vue Data Grid. The -Grid supports CRUD, filtering, sorting, paging and a dialog editor.
Visualizing KPIs and trends with the Syncfusion Vue Charts, ListView, Card styles, DropDownList and Button.
-Keeping the Grid and the Scheduler in two-way sync. Changes in one are reflected in the other.
Tenant	Dashboard	Scheduler	Resource
Clinic	Patient Management Dashboard (/clinic)	Appointments (/clinic/appointments)	Doctors
Salon	Dashboard & Customers (/salon)	Scheduler (/salon/appointments)	Stylists
Syncfusion components used
Package	Components
@syncfusion/ej2-vue-schedule	Scheduler
@syncfusion/ej2-vue-grids	Data Grid
@syncfusion/ej2-vue-charts	Chart
@syncfusion/ej2-vue-lists	ListView
@syncfusion/ej2-vue-dropdowns	DropDownList
@syncfusion/ej2-vue-buttons	Button
@syncfusion/ej2-material3-theme	Material 3 theme
@syncfusion/ej2-base, ej2-layouts, ej2-vue-calendars, ej2-vue-inputs, ej2-vue-navigations, ej2-vue-popups	Supporting modules, including the Card styles used for KPI tiles
Features
1. Scheduler with resource grouping and multiple views
The Clinic and Salon schedulers offer Day, Week, Month and Agenda views. Each event is color-coded by its doctor or stylist through a Scheduler resource.

vue

<ejs-schedule ref="schedule" height="680px" :eventSettings="eventSettings" :showQuickInfo="false"
  :popupOpen="onPopupOpen" :actionBegin="onActionBegin" :actionComplete="onActionComplete">
  <e-views>
    <e-view option="Day" /><e-view option="Week" /><e-view option="Month" /><e-view option="Agenda" />
  </e-views>
  <e-resources>
    <e-resource field="Doctor" title="Doctor" name="Doctors" :dataSource="doctors"
      textField="Name" idField="Name" colorField="Color" />
  </e-resources>
</ejs-schedule>
js

provide('schedule', [Day, Week, WorkWeek, Month, Agenda])
2. Customized event editor (Patient / Customer lookup)
The Scheduler's quick popup is disabled. Clicking an empty cell, an existing event or the New Appointment / New Booking button opens the built-in editor dialog. On popupOpen, the sample injects extra DropDownList fields into the editor: a searchable Patient ID or Customer ID lookup, Visit Type or Service Type, and Status. Picking an ID auto-fills the subject and the doctor or stylist from the Grid record.

js

const onCellClick = (args) => {
  args.cancel = true
  instance().openEditor({ startTime: args.startTime, endTime: args.endTime }, 'Add')
}

new DropDownList({
  dataSource: items,
  fields: { text: 'text', value: 'id' },
  allowFiltering: true,
  filterType: 'Contains',
  change: (e) => { /* fill the other editor fields from the matching record */ },
}).appendTo(inputElement)
3. Data Grid with CRUD, filtering, sorting and paging
The Patients and Customers grids use dialog-mode editing, an Excel-style filter menu, sorting, paging and a toolbar with Add, Edit, Delete and Search. Columns use validation rules and typed editors (numeric, date picker and dropdown).

vue

<ejs-grid :dataSource="patients.list" :allowPaging="true" :allowSorting="true" :allowFiltering="true"
  :filterSettings="{ type: 'Excel' }" :pageSettings="{ pageSize: 6 }"
  :editSettings="{ allowEditing: true, allowAdding: true, allowDeleting: true, mode: 'Dialog' }"
  :toolbar="['Add', 'Edit', 'Delete', 'Search']"
  :actionBegin="onActionBegin" :actionComplete="onActionComplete">
  <e-columns>
    <e-column field="PatientID" headerText="Patient ID" :isPrimaryKey="true" :allowEditing="false" />
    <e-column field="Age" headerText="Age" editType="numericedit" :validationRules="{ required: true, number: true, min: 0, max: 120 }" />
    <e-column field="Gender" headerText="Gender" editType="dropdownedit" :edit="grid.genderEdit" />
    <e-column field="LastVisitDate" headerText="Last Visit Date" type="date" editType="datepickeredit" />
  </e-columns>
</ejs-grid>
js

provide('grid', [Page, Sort, Filter, Edit, Toolbar])
4. Dropdown editors and read-only ID columns in the Grid
dropdownEdit() builds the edit params for dropdownedit columns. lockField() makes generated ID fields read-only in the edit dialog. New records get a generated ID (for example P1001 or C3001) in actionBegin.

js

export const dropdownEdit = (field, values) => ({
  params: {
    dataSource: values.map((v) => ({ [field]: v })),
    fields: { text: field, value: field },
    popupHeight: '220px',
  },
})
5. Two-way sync between Grid and Scheduler
Both views read and write the same reactive store.

Grid to Scheduler: changing a patient's Doctor Assigned or a customer's Preferred Stylist moves their open appointments to that doctor or stylist. Renaming a record updates the event subject. Deleting a record removes their appointments.
Scheduler to Grid: creating or changing an appointment updates the person's Doctor Assigned / Preferred Stylist and Last Visit / Last Appointment. The Grid's read-only columns (Appointment ID, Latest Appointment, Visit Type, Appointment Status) always show the latest non-cancelled appointment.
js

const onActionComplete = (args) => {
  if (['eventCreated', 'eventChanged', 'eventRemoved'].includes(args.requestType)) {
    applySchedulerChange(clinicAppointments, args)           // update the shared list
    if (args.requestType !== 'eventRemoved')
      [...(args.addedRecords || []), ...(args.changedRecords || [])].forEach(applyAppointmentToPatient)
    syncPatientAppointments()                                // refresh the Grid's latest-appointment columns
    saveData()                                               // persist to appData.json
  }
}
6. KPI cards, Charts and ListView dashboards
The dashboards show KPI tiles (Card styles) and Charts.

The Clinic dashboard has a column chart of appointments per month, a ListView of upcoming appointments and a doctor directory.
The Salon dashboard has a combination chart with bookings as columns and revenue as a line on a secondary axis. It also has a staff overview, an editable Service catalog Grid, and a DropDownList filter that recalculates the KPIs by service.
vue

<ejs-chart :primaryXAxis="primaryX" :primaryYAxis="yBookings" :tooltip="tooltip" :legendSettings="legend">
  <e-axes>
    <e-axis name="yRevenue" title="Revenue ($)" :opposedPosition="true" />
  </e-axes>
  <e-series-collection>
    <e-series :dataSource="daily" type="Column" xName="date" yName="bookings" name="Daily Bookings" />
    <e-series :dataSource="daily" type="Line" xName="date" yName="revenue" yAxisName="yRevenue" name="Daily Revenue ($)" :marker="marker" />
  </e-series-collection>
</ejs-chart>

<ejs-listview :dataSource="upcomingItems" :fields="{ id: 'Id', text: 'text' }" :showHeader="false" />

<ejs-dropdownlist :dataSource="serviceOptions" v-model="serviceFilter" placeholder="Service" />
js

provide('chart', [Category, ColumnSeries, LineSeries, Legend, Tooltip, DataLabel])
7. Appointment status styling
Cancelled events are dimmed and completed events are desaturated through the Scheduler's eventRendered event.

js

const eventRendered = (args) => {
  if (args.data.Status === 'Cancelled') args.element.style.opacity = '0.5'
  if (args.data.Status === 'Completed') args.element.style.filter = 'saturate(0.6)'
}
8. Persisted JSON data
All data lives in src/data/appData.json. It is loaded at startup and written back after every Grid or Scheduler change, so edits survive a page refresh. A small /api/data endpoint provided by the local dev and preview server handles this: GET reads the file and PUT replaces it.

Application Workflow
The home page offers two modules: Clinic Appointment Management and Salon Appointment Management.
Each module opens on its dashboard, which has KPIs, Charts and the Grid for patients or customers.
The Appointments / Scheduler page is used to book, reschedule, change status or delete appointments.
Every change is synced between the Grid and the Scheduler and saved to appData.json.
Folder Structure
text

multi-tenant-appointment-management-vue/
├── README.md
└── vue-scheduler-app/
    ├── index.html                      # App entry HTML
    ├── package.json                    # Dependencies (Syncfusion packages) and scripts
    ├── vite.config.js                  # Dev/preview config, includes the /api/data endpoint
    ├── public/                         # Static assets (favicon, icons)
    └── src/
        ├── main.js                     # Loads data, applies the Material 3 theme and mounts the app
        ├── App.vue                     # Top bar, navigation and page outlet
        ├── style.css                   # Application styles
        ├── router/
        │   └── index.js                # Routes: /, /clinic, /clinic/appointments, /salon, /salon/appointments
        ├── data/
        │   ├── appData.json            # Data source: patients, customers, appointments, doctors, stylists, services and chart data
        │   └── store.js                # Shared reactive store, load/save and Grid <-> Scheduler sync logic
        ├── utils/
        │   ├── editorFields.js         # Scheduler editor helpers: extra dropdowns, ID lookup, Scheduler-to-store sync
        │   └── gridEditors.js          # Grid editor helpers: dropdown edit params, read-only ID fields
        └── views/
            ├── Home.vue                # Module selection (Button)
            ├── ClinicDashboard.vue     # Chart, ListView, doctor cards, Patients Grid
            ├── ClinicScheduler.vue     # Scheduler grouped by doctor
            ├── SalonDashboard.vue      # Combination Chart, DropDownList filter, Service catalog Grid, Customers Grid
            └── SalonScheduler.vue      # Scheduler grouped by stylist
How to Run the Sample
Prerequisites
Node.js 18 or later and npm
A Syncfusion license key. Register one in your own copy of the app if you see the trial banner. See the Syncfusion licensing documentation.
Steps
Clone the repository and open the app folder:

bash

git clone https://github.com/<your-account>/multi-tenant-appointment-management-vue.git
cd multi-tenant-appointment-management-vue/vue-scheduler-app
Install the dependencies (this includes the Syncfusion packages):

bash

npm install
Start the development server:

bash

npm run dev
Open the local URL printed in the terminal in your browser. Choose Clinic or Salon on the home page.

To create and preview a production build:

bash

npm run build
npm run preview
Use npm run dev or npm run preview to run the sample. The /api/data endpoint that saves your edits to src/data/appData.json is only provided by these two servers. To reset the demo data, restore src/data/appData.json from source control.

I spotted two small inaccuracies after rereading it:

The main.js line in the folder tree says it applies the Material 3 theme. It actually imports the theme CSS.
The README says the Scheduler uses "resource grouping". The code defines the Doctor and Stylist resources for color-coding but doesn't set a group option, so events aren't split into per-resource columns.
