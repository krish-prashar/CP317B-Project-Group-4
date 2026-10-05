# Milestone 1 - fill-in template
> **REPLACE every 🟨 prompt with your team's own writing. Remove prompts before submitting.**

## 1. Cover
- Course: CP317B
- Title: HealthTrack - Health Monitoring and Shared Trends
- Group: Group 4
- Members: Colby Lumsden, David [surname unknown], Laharl Wang, Arvin Gill, Krish Prashar
- Colby Lumsden — Lead Developer: description, technical approach, scope.
- Krish Prashar — Scrum Master / Coordinator: blog, assembly, submission checks.
- David — Product Owner: objectives and feature priorities.
- Laharl Wang — Requirements Analyst: user stories.
- Arvin Gill — QA / Documentation: ethics and proofreading.

## 2. Abstract (1–2 paragraphs)
🟨 [Write: problem → intended users → what you will build → benefit.]

## 3. Description and objectives (Colby)
> HealthTrack will let patients record health measurements and review their history in one place. Users will enter measurements manually or import a CSV file, then view summaries and charts for metrics such as heart rate, sleep duration, and steps. Patients will control whether a health professional can view their records and will be able to revoke access.
>
> The core project will include accounts, measurement entry, CSV imports, historical charts, and permission-based sharing. We propose TypeScript with Next.js for the web application and PostgreSQL for storing records. The team will follow Scrum and use GitHub to manage code and documentation.
>
> WHOOP integration and Apple Health syncing are possible extensions after the core features work. The initial version will focus on recorded history rather than continuous live monitoring, and will not provide diagnoses or emergency alerts.


1. -Allow a user to create a secure account and log in to access their personal dash board and log out
2. -Allow a user to manually enter and save health measurement (e.g. heart rate, sleep, steps) with a date and time
3. -Allow a user to upload a csv file to bulk-import their tealth data from other sources.
4. -Allow a user to view their historical data through interactive charts and summary statistics.
5. -Allow a user to view their historical data through interactive charts and summary statistics.
6. -Allow a user to grant and revoke access to their health records for a specific healthcare professional.

## 4. Initial backlog (6–10 stories)
Write each story: **As a [user], I want [goal] so that [reason].**
Use feature prefixes, e.g. AUTH, MET, UI, REP, SHARE.

| Story ID | Story Title | User Story |
| --- | --- | --- |
| AUTH-1 | User registration |  As a new user, I want to creat an account with a secure password so tha I can access the applicatrion's features.|
| AUTH-2 | User login | As a registered user, I want to log in to my account so that I can view and manage my personal health data.|
| AUTH-3| User logout | As a logged-in user, I want to log out of my account so that I can protect my health data on a shared device. |
| MET-1 | Manual Measurement Entry | As a patient, I want to manually add a new health measurement(type, value, date, time) so that I can keep my health log up to date.|
| MET-2 | View Measurement History| As a patient, I want to see a list of my past measurements so that I can review my recorded data in detail |
|REP-1| Impot Data via CSV| As a patient, I want to import a CSV file containing my health data so that I can avoid manual entry for large datasets |
|REP-2| View Historical Charts | As a patient, I want to view charts of my health metrics over time so that I can easily identify trends and patterns.|
| SHARE-1 | Share Records with Professional | As a patient, I want to grant a healthcare professional access to my health records so that they can review my data before an appointment. |
| SHARE-2 | Revoke Professional's Access | As a patient, I want to revoke a healthcare professional's access to my data at any time so that I remaian in control of my privacy. |
| UI-1 | Dashboard Overview | As a patient, I want a simple dashboard that summarizes my key health metrics so that I can get  a quick overview of my status. |

## 5. Ethics (Arvin)
-  HealthTrack will contain personal health information, so users should have control over who can access it. Users will be able to choose who can view their records and remove that access whenever they want.
-  Since health information is sensitive, unauthorized access is a concern. HealthTrack will use secure user accounts, protected passwords, and access controls so that only approved users can view health records.
-  Incorrect measurements or imported data could give users a false understanding of their health history. HealthTrack will check entered and imported data where possible and clearly display important information such as values, dates, and measurement units.
-  Some users may have difficulty using complicated layouts or reading certain information. HealthTrack will use clear labels, simple navigation, readable text, and easy-to-understand charts so the system is easier for a wider range of users to use.

## 6. Separate Excel blog
- Replace template example names with your team in H6:J11.
- Fill green cells; preserve formulas.
- Replace example activities with actual work, attendance and hours.
- Confirm you will update the blog throughout the semester.

## Before submitting
- Replace all 🟨 prompts and rewrite/review the 🟩 draft; remove instructional labels before submitting.
- Export your completed document as **Group4-Milestone01.pdf**.
- Save completed blog as **Group4-Blog.xlsx**.
- Confirm official group ID; adjust filenames if needed.
- Upload both to MyLS: October 2, 2026, 11:59 PM.
- No application code is required for this milestone.
