# CP317B - Milestone 02

# HealthTrack

**Health Monitoring and Shared Trends**

Requirements & Backlog Expansion

**Course:** CP317B  **Group:** Group 4  **Due:** October 9, 2026

| Team member | Role |
| --- | --- |
| Colby Lumsden | Lead Developer |
| David | Product Owner (highlighted) |
| Laharl Wang | Requirements Analyst |
| Arvin Gill | QA / Documentation |
| Krish Prashar | Scrum Master / Coordinator |

## 2. Product Backlog (Expanded)

The backlog from Milestone 01 is now expanded with story points using Fibonacci scale, priority, sprint assignment, status, conversation notes and acceptance criteria. No stories are completed yet.

| ID | Story Title | User Story | Pts | Priority | Sprint | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AUTH-1 | Account Access | As a patient, I want to securely access my account so that my health records remain private. | 5 | High | Sprint 1 | Not Started |
| MET-1 | Record Measurements | As a patient, I want to record health measurements so that I can track my health history. | 5 | High | Sprint 1 | Not Started |
| UI-1 | Daily Summary | As a patient, I want to see a daily summary so that I can review recent health data. | 5 | High | Sprint 2 | Not Started |
| IMP-1 | Import Measurements | As a patient, I want to import a CSV file so that I can add existing measurements quickly. | 8 | Medium | Sprint 2 | Not Started |
| REP-1 | Historical Trends | As a patient, I want to view charts by date range so that I can understand changes over time. | 8 | High | Sprint 2 | Not Started |
| SHARE-1 | Manage Sharing | As a patient, I want to grant or revoke professional access so that I control who can view my records. | 8 | High | Sprint 3 | Not Started |

### Conversation and Confirmation

| ID | Conversation (team notes) | Confirmation (acceptance criteria) |
| --- | --- | --- |
| AUTH-1 | Email + password sign-up and login. Passwords are stored hashed, never in plain text. | Given a valid email and password, an account is created and the user can log in and log out. Wrong credentials show a generic error. Passwords are not stored in plain text. Logged-out users cannot open any page that shows health records. |
| MET-1 | Each entry has a metric, value, unit and date/time. Metric types to be confirmed with the Product Owner. | Given a logged-in patient, when they submit a metric, value, unit and date, the entry is saved and appears in their history. Empty or invalid values are rejected with a clear message. Value, unit and date are always shown with the entry. |
| UI-1 | Summary is the landing page after login and shows the most recent reading per metric. | The summary shows the latest reading for each metric with its value, unit and date. If there are no readings, an empty-state message links to the Add Measurement page. Only the logged-in patient's own data is shown. |
| IMP-1 | One supported CSV layout (date, metric, value, unit) with a sample file. Highest uncertainty, so estimated at 8. | A valid CSV adds all its rows to the patient's history. Rows with a bad date, unknown metric or invalid value are skipped and listed with their row numbers while valid rows are still imported. A file in the wrong format is rejected with an explanation. |
| REP-1 | One line chart per metric with a date range picker (presets plus custom dates). | Selecting a metric and date range shows a chart of only the readings in that range. Axes are labelled with dates and units. A range with no data shows an empty-state message. |
| SHARE-1 | Patient grants access using the professional's registered email. A settings page lists everyone with access. | A patient can grant access to a registered professional and see them in a list of current access. A patient can revoke access at any time and it takes effect immediately. No professional can see any record without an active grant. |

## 3. Requirements Refinement

HealthTrack helps patients keep their health measurements in one private place. Patients create an account, record measurements by hand or import them from a CSV file, and see a daily summary and charts of how each metric changes over time. Patients stay in control of their data by granting or revoking a health professional's access at any time.

Health professionals can review only the history that patients have chosen to share with them. Without a patient's approval, no one else can view their records.

### Functional requirements

| ID | Requirement |
| --- | --- |
| FR1 | The system will allow a user to register and log in with an email and password. |
| FR2 | The system will allow a patient to record a measurement with metric, value, unit and date. |
| FR3 | The system will reject measurements with a missing or invalid value, unit or date |
| FR4 | The system will allow a patient to import measurements from a CSV file. |
| FR5 | The system will list each rejected CSV row with its row number. |
| FR6 | The system will show a patient the most recent reading for each metric. |
| FR7 | The system will display a chart of a metric for a date range the patient chooses |
| FR8 | The system will allow a patient to grant a registered health professional access. |
| FR9 | The system will allow a patient to remove that access at any time. |
| FR10 | The system will show a health professional only to the patients who have given access. |

### Non-functional requirements

| Type | Requirement |
| --- | --- |
| Security | The system can be able to store passwords hashed and deny access to any record without an involuntary commitment from the patient. |
| Privacy | Removing access can be immediately |
| Usability | A new patient can record a first measurement within 2 minutes without assistance. |
| Performance | The system can display the daily summary within 3 seconds |

## 4. Ethical Considerations

HealthTrack will contain personal health information, so users should have control over who can access their data. The system will allow users to choose who can view their records and remove that access whenever they want. Features such as record sharing and revoking access are included in the backlog to make sure users stay in control of their information.

Health information is sensitive, so unauthorized access is an important concern. HealthTrack will use secure user accounts, protected passwords, and access controls so that only approved users can view private records. Login and account security are also included as core backlog features.

HealthTrack should provide the same basic experience to all users and should not treat users differently based on their health information. The system will present health data in a consistent way and avoid making judgements or medical decisions based on a user’s records. Features such as language support and accessibility options can also help make the system more usable for different groups of people.

Some users may have difficulty using complicated layouts or reading certain information. HealthTrack will use clear labels, simple navigation, readable text , and easy to understand charts. Accessibility related features in the backlog will help make the application easier to use for people with different needs and levels of technical experience.

Incorrect measurements or imported data could give users a false understanding of their health history. HealthTrack will check entered and imported data where possible and clearly display values, dates, and measurement units. The system will also avoid giving diagnoses or medical advice based on the information stored.

## 5. Initial Design Sketches
