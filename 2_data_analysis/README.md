# Data Analysis

Analysis notebooks for Qolabb participation data.

---

## 📓 Notebooks

### [team_collaboration_analysis.ipynb](./team_collaboration_analysis.ipynb)

Analyzes team participation patterns to identify:
- **Participation patterns** — Distribution of high/medium/low contributors
- **Low contributors** — Members averaging < 4 hours/week
- **Team fairness** — Inequality scores using standard deviation
- **Peer ratings** — Correlation between contribution and ratings

**Key Findings:**
- 13% of students are free-riders
- High contributors work 5x more than low contributors  
- 43% of teams have significant inequality
- Low contributors rated 2.9/5 vs 4.4/5 for high

**Dataset used:** `1_data_collection/team_collaboration/`

---

## 🚀 How to Run

```bash
cd 2_data_analysis
jupyter notebook team_collaboration_analysis.ipynb
```

**Requirements:** `pip install pandas matplotlib`
