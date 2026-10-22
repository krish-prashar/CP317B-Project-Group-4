2.Product Backlog(Expanded)
Summary:
-Total user stories: 12
-Sprint 1: 4 stories
-Sprint 2: 5 stories
-Sprint 3: 3 stories


3. Requirements Refinement

3.1 Functional Requirement
HealthTrack is ahealth monitoring system that lets users record, view, and share their own health data. The main functional requirements are:

1.Account management.Users can register, log in, and log out. Passwords are stored securely, and sessions expire after inactivity.(AUTH-1)

2.Manual measurement entry. Users can record measurements such as weight, BMI body fat rate and heart rate, with value, unit and date/time.(MET-1)

3.CSV import. Users can import existing measurements from a CSV file. Invalid rows are skipped and reported clearly. (IMP-1)

4.Daily summary. Users can see a daily summary of their most recent readings, including value, unit, and time. (UI-1)

5.History filtering. Users can filter their history by metric so they can focus on one type of measurement. (FILTER-1)

6.Data validation. Invalid measurements, such as null values, out-of-range values, or missing units, are flagged and not saved. (DATA-1)

7.Chart generation. Users can select one or more metrics and a date range to generate a line chart. Preset ranges such as last 7 or 30 days are supported, along with a custom range. (CHART-1, REP-1)

8.Export as image. Users can export a daily or weekly summary as an image, choosing which metrics and date range to include. (SHARE-1)

9.CSV export. Users can export their data to a CSV file with date, metric, value, and unit, using the same format as the import feature. (EXP-1)

10.Interface language selection. Users can choose their preferred interface language. All interface text, buttons, error messages, and chart labels update accordingly. (LANG-1)

11.Accessibility support. The interface uses readable fonts, sufficient contrast, simple navigation, and text alternatives for charts. (ACC-1)

12.Future: automatic data sync. Users will be able to connect a health account, such as Apple Health, Health Connect, or a supported device API, so measurements sync automatically. (SYNC-1, Future)

3.2 Non-Functional Requirements

1.Security. Passwords are hashed, sessions expire after inactivity, and no data is accessible without authentication. (AUTH-1)

2.Privacy. Health data is private by default. Sharing is only possible when the user explicitly chooses to export or share a summary. (SHARE-1)

3.Data accuracy. All manually entered and imported data is validated before saving. Invalid entries are flagged and not stored. (DATA-1, IMP-1)

4.Interoperability.The system must support data from multiple brands of weight scales and fitness trackers. Incoming data is normalized into a common format using metric, value, unit, and timestamp, so that readings from different devices can be displayed and compared consistently.(DATA-1, IMP-1)

5.Usability. The interface uses clear labels, simple navigation, and consistent layouts across screens. (UI-1, ACC-1)

6.Accessibility. Text is readable, contrast is sufficient, charts have text alternatives, and the interface passes a basic accessibility checklist. (ACC-1)

7.Performance. The daily summary and charts load within a reasonable time for typical data sizes.

8.Internationalization. All interface text is stored in language files, so new languages can be added without changing application logic. (LANG-1)
