# CP317B - Milestone 01
## Cover page
Project title: HealthTrack - Health Monitoring and Shared Trends
Group ID: Group 4 [confirm official ID]
Team members and roles: [add full names and agreed roles]
Product Owner: [add name]
Submission date: October 2, 2026

## Abstract
HealthTrack is a health monitoring system that will help patients organize their measurements and share relevant history with an authorized health professional. Measurements can be spread across devices and records, making trends difficult to review. The system will bring manually entered and imported data into one dashboard, showing recent summaries and changes over time.

The project will support patient accounts, measurement entry, CSV imports, historical charts, and patient-controlled sharing. Initial metrics will include heart rate, resting heart rate, sleep duration, and steps. Patients will be able to export or delete their records. Wearable integrations may be added after the core features are completed. The project will be developed as an educational prototype, with synthetic data used for demonstrations.

## Project description
HealthTrack follows the Health Monitoring System domain. Patients will record measurements manually or import a supported CSV file, then review daily summaries and historical charts. Each measurement will include its metric type, value, unit, timestamp, and source. Users will be able to filter their history by metric and date range.

Health professionals will be able to review a patient's history only after that patient grants access. Patients will be able to revoke access. Imported records will be presented as historical measurements with visible timestamps, rather than as a continuous live feed.

The proposed implementation is a web application using TypeScript, React/Next.js, and PostgreSQL. The team will use Scrum to prioritize the backlog, plan sprints, and review progress, with GitHub for source code and documentation. Technology choices will be confirmed during requirements and design.

The core scope includes accounts, manual entry, CSV import, summaries, charts, sharing, export, and deletion. Potential extensions include WHOOP integration and Apple Health imports. Automatic Apple Health syncing would require an iPhone companion application and suitable development tools. Extensions will not be dependencies of the core demonstration. The prototype will not diagnose conditions or provide an emergency response service.

## Project objectives
1. Allow patients to create accounts and securely access their own health records.
2. Allow patients to enter measurements manually and import a documented CSV format.
3. Display daily summaries and historical charts filtered by metric and date range.
4. Allow patients to grant and revoke a health professional's access.
5. Allow authorized professionals to review a consenting patient's shared history.
6. Allow patients to export and delete their stored records.

## Initial product backlog
| Story ID | Story Title | User Story |
| --- | --- | --- |
| AUTH-1 | Account Access | As a patient, I want to securely access my account so that my health records remain private. |
| MET-1 | Record Measurements | As a patient, I want to enter health measurements so that I can track my health history. |
| IMP-1 | Import Measurements | As a patient, I want to import a supported CSV file so that I can add existing measurements without entering each one manually. |
| UI-1 | Daily Summary | As a patient, I want to see a daily summary of my measurements so that I can review my recent data. |
| REP-1 | Historical Trends | As a patient, I want to view metric charts over a selected date range so that I can understand changes over time. |
| SHARE-1 | Manage Sharing | As a patient, I want to grant and revoke a health professional's access so that I control who can view my information. |
| PRO-1 | Review Patient History | As a health professional, I want to review a consenting patient's shared measurements so that I can assess their reported trends. |
| DATA-1 | Export and Delete Records | As a patient, I want to export or delete my records so that I retain control over my data. |

## Ethical considerations
### Privacy and consent
Health records contain sensitive information. The system will collect only information needed for its features and require explicit patient consent before professional access is granted. Patients will be able to revoke sharing and export or delete records. Demonstrations will use synthetic data to avoid exposing identifiable health information.

### Security
Unauthorized access could reveal private records. The design will use established authentication tools, secure password handling, and server-side authorization checks for requests involving patient information. Deployed connections will use HTTPS. Credentials, access tokens, and private health exports will be excluded from the repository.

### Accuracy and responsible interpretation
Measurements may be incomplete, outdated, or inconsistent between devices. The dashboard will show units, sources, timestamps, and gaps, distinguishing missing data from zero. Imports will be checked for duplicate records, and overlapping measurements will not be automatically added together. The interface will present recorded trends without claiming to diagnose a condition.

### Accessibility and fairness
Users should be able to use the core system without purchasing a wearable. Manual entry and CSV import will remain available. The interface will use readable text, keyboard navigation, labelled controls, and chart indicators that do not depend on colour alone.
