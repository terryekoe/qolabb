# Datasets

This folder contains sample datasets for analyzing student collaboration and participation patterns in team-based learning environments.

---

## 📁 Directory Structure

```
1_data_collection/
├── generate_datasets.py          # Script to regenerate sample data
├── team_collaboration/           # Team collaboration data
│   ├── teams.csv                 # Team metadata (30 teams)
│   └── team_activities.csv       # Weekly activity logs (1,680 records)
├── student_engagement/           # Student engagement data
│   └── student_engagement.csv    # Engagement metrics (500 students)
└── learning_analytics/           # Learning analytics data
    ├── courses.csv               # Course metadata (4 courses)
    ├── studentInfo.csv           # Student demographics (1,000 students)
    ├── studentVle.csv            # VLE interactions (124K+ records)
    └── studentAssessment.csv     # Assessment submissions (4K records)
```

---

## 📊 Dataset 1: Team Collaboration

Data simulating team project activities and participation patterns.

### `teams.csv`
| Column | Type | Description |
|--------|------|-------------|
| team_id | int | Unique team identifier |
| team_name | str | Team name (e.g., "Team_01") |
| project_type | str | Type of project |
| team_size | int | Number of members (3-5) |
| start_date | date | Project start |
| end_date | date | Project end |

### `team_activities.csv`
| Column | Type | Description |
|--------|------|-------------|
| team_id | int | Team identifier |
| member_id | str | Member identifier (e.g., "T01M1") |
| week | int | Week number (1-14) |
| hours_logged | float | Hours worked that week |
| commits | int | Code commits |
| meetings_attended | int | Team meetings attended |
| tasks_completed | int | Tasks completed |
| peer_rating | float | Average peer rating (1.0-5.0) |
| contribution_pattern | str | "high", "medium", or "low" |

**Use Case:** Analyze team dynamics, detect uneven participation, predict project outcomes.

---

## 📊 Dataset 2: Student Engagement

Data tracking student engagement metrics in classroom settings.

### `student_engagement.csv`
| Column | Type | Description |
|--------|------|-------------|
| student_id | str | Unique student ID |
| gender | str | M/F |
| nationality | str | Country code |
| grade_level | str | Grade (G-04 to G-12) |
| topic | str | Subject area |
| raised_hand | int | Times raised hand (0-100) |
| visited_resources | int | Resources visited (0-150) |
| announcements_view | int | Announcements viewed (0-100) |
| discussion | int | Discussion participation (0-80) |
| parent_answering_survey | str | Yes/No |
| parent_school_satisfaction | str | Good/Bad/N/A |
| student_absence_days | str | Under-7/Above-7 |
| class_level | str | H (High), M (Medium), L (Low) |

**Use Case:** Classify engagement levels, predict academic performance.

---

## 📊 Dataset 3: Learning Analytics

Data from a virtual learning environment (VLE) tracking student interactions.

### `courses.csv`
| Column | Type | Description |
|--------|------|-------------|
| code_module | str | Course code |
| code_presentation | str | Semester/year |
| module_presentation_length | int | Course length in days |

### `studentInfo.csv`
| Column | Type | Description |
|--------|------|-------------|
| id_student | int | Student ID |
| code_module | str | Enrolled course |
| gender | str | M/F |
| region | str | Geographic region |
| highest_education | str | Education level |
| age_band | str | Age group |
| num_of_prev_attempts | int | Previous attempts |
| studied_credits | int | Credits enrolled |
| final_result | str | Pass/Fail/Withdrawn/Distinction |

### `studentVle.csv`
| Column | Type | Description |
|--------|------|-------------|
| id_student | int | Student ID |
| id_site | int | VLE resource ID |
| date | int | Days from course start |
| sum_click | int | Number of clicks |
| activity_type | str | Resource type |

### `studentAssessment.csv`
| Column | Type | Description |
|--------|------|-------------|
| id_student | int | Student ID |
| id_assessment | str | Assessment ID |
| date_submitted | int | Submission date |
| is_banked | int | Credit banked flag |
| score | float | Assessment score |

**Use Case:** Predict student success, analyze learning behavior patterns.
