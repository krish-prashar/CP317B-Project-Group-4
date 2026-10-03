# Milestone 01 — writing guide
Status: first-pass planning notes; rewrite in your own words before submission.
Course: CP317B | Proposed group: Group 4 (confirm official ID)
Deadline: October 2, 2026, 11:59 PM, MyLS.

## What to submit
- One PDF: cover page, abstract, description/objectives, backlog table, ethics.
- Separate Excel team blog using the instructor-provided template.
- Names: GroupID-Milestone01.pdf and GroupID-Blog.xlsx; replace GroupID with the official ID.
- GitHub files are working notes; pushing them does not submit to MyLS.
- Application code is not required by this milestone.
- Basis: CP317B_Fall2026_Milestone_01 (1).pdf, pages 1–3.

## 1. Cover page — write these fields
- Course: CP317B.
- Milestone: Milestone 01: Project Description and Objectives.
- Working title: HealthTrack — Health Monitoring and Shared Trends.
- Group ID: [CONFIRM OFFICIAL GROUP ID].
- Team: [FULL NAME] — [ROLE], repeated for every member.
- Explicitly label one member Product Owner.
- Agree on Scrum/team responsibilities; do not invent assignments.
- Date: [SUBMISSION DATE].

## 2. Abstract — expand these into 1–2 paragraphs
Paragraph 1:
- Problem: health measurements are scattered; users and authorized professionals need understandable history.
- Users: patients/individual users and health professionals.
- Idea: one dashboard for recording/importing metrics and reviewing trends.
Paragraph 2:
- Deliver: manual entry, supported file import, daily summaries, historical charts, controlled sharing.
- Metrics: heart rate, resting heart rate, sleep duration, activity/steps where available.
- Benefit: easier review and patient control over access.
- Wearable sync: optional extension, subject to feasibility.
- Present as an educational monitoring prototype; no diagnostic or emergency-response promises.

## 3. Project description — one short section
- Domain: Health Monitoring System, one of the suggested assignment options.
- Patient: records/imports data, views own trends, grants/revokes professional access.
- Professional: reviews only consenting patients' data and history.
- Input: manual measurements and a documented CSV format for the core version.
- Output: summaries and date-filtered charts with units, source, timestamps.
- Core: accounts, metrics, import, dashboard, sharing, export/deletion.
- Extensions: direct WHOOP connection; Apple Health XML import; Swift iPhone companion for automatic HealthKit sync.
- Explain that imported historical data is not a continuous live sensor stream.
- Exclude from committed scope: medical diagnosis, automatic emergency interventions, custom watch app.
- Keep the professional role to fit the suggested domain; confirm with instructor if reframed as solely a personal fitness app.
- Suggested stack, not a course requirement: TypeScript, React/Next.js, PostgreSQL; Swift/HealthKit only for a later iPhone companion.
- Process: Scrum; maintain prioritized backlog, plan sprints, review progress, use GitHub version control.
- Personal motivation: Apple Watch + WHOOP ownership makes real-data exploration useful; group demo uses synthetic data.

## 3a. Objectives — select/refine these 6 concrete goals
1. Allow patients to create accounts and access only their own records.
2. Allow patients to add measurements manually and import a documented CSV file.
3. Display daily summaries and historical charts filtered by metric and date range.
4. Allow patients to grant and revoke a health professional's access.
5. Allow authorized professionals to review a patient's shared historical measurements.
6. Allow patients to export their records and request deletion.

Writing tip: describe observable system behavior. Do not promise every wearable integration for the first release.

## 4. Initial product backlog — table for the PDF
Eight draft entries below use feature-area prefixes and the required story format.
Review/rephrase as a team. Story points, sprint assignments, and expanded status details come in Milestone 02.

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

## 5. Ethical considerations — maximum 1 page
Write a short issue + mitigation explanation for at least 3; these 4 fit the project:
- Privacy/consent: sensitive health history; share only with explicit consent, allow revocation, collect only needed data, support export/deletion.
- Security: unauthorized access; secure password handling through established authentication tools, server-side authorization checks, HTTPS in deployment, keep secrets/private exports out of Git.
- Accuracy/responsible interpretation: devices differ, imports can be stale or missing; show source, units, timestamps and gaps, avoid double counting overlapping device records, avoid diagnostic claims.
- Accessibility/fairness: users may lack wearables or have visual limitations; support manual entry, readable labels, keyboard access, and indicators beyond colour.
- Use synthetic demo data; publish personal health data only if deliberately approved by its owner.
- Do not describe proposed safeguards as already implemented.

## 6. Team blog — separate instructor Excel template
- Download the provided course Excel blog template from MyLS.
- Fill the template's team information: official group ID, names, roles, Product Owner.
- Record actual planning activities only; do not invent meetings, hours, attendance, or contributions.
- Confirm the team will update the blog throughout the semester.
- If the template has an activity row: date + actual activity + participants/contributions + decision + next task, using its existing columns.
- Suggested planning topics: choose domain; agree core/extension scope; assign roles; review objectives/stories/ethics.
- Save as GroupID-Blog.xlsx and upload separately.
- This guide is not a replacement for the supplied workbook.

## Immediate team checklist
- [ ] Confirm official group ID.
- [ ] Add every member's full name and agreed role; identify Product Owner.
- [ ] Agree project title and scope.
- [ ] Rewrite abstract and description from the notes.
- [ ] Refine 3–6 objectives and the 6–10-story backlog table.
- [ ] Write ethics within 1 page.
- [ ] Complete instructor Excel blog template and semester-update confirmation.
- [ ] Export final document to PDF; check that the table is legible and not clipped.
- [ ] Remove placeholders and any claims not agreed by the team.
- [ ] Upload PDF and Excel to MyLS with required filenames before the deadline.
- [ ] Verify submission confirmation.

## Future implementation notes — optional, not Milestone 01 deliverables
- First vertical slice: manually enter resting heart rate -> save -> seven-day chart.
- Then accounts + sharing, followed by CSV import.
- WHOOP OAuth integration can follow; use current API v2 and keep tokens server-side.
- Apple Watch data can be read through HealthKit by a permissioned iPhone app; web pages cannot directly query the phone's HealthKit store.
- Native iOS development needs Mac/Xcode access; verify team access before committing to it.
- Apple Health XML import is a manual fallback, not automatic sync.
- Preserve source identity and metric definition; avoid combining overlapping workouts or incompatible HRV definitions.
- No application scaffolding is included because the current request is Milestone 01 planning only.
