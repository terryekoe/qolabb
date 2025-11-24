# 📝 Project Retrospective

This directory is dedicated to documenting the journey of developing **Qolabb**. Use this space to reflect on the process, record lessons learned, and track the project's evolution.

## 🌟 Experiences

### 📅 Initial Entry: The "Why" Behind Qolabb
The core motivation for Qolabb stems from a common and persistent frustration in student life: **uneven participation in group projects**.

As highlighted in the [Domain Study](../0_domain_study/README.md), while Project-Based Learning (PBL) is essential for developing problem-solving and teamwork skills, it often suffers from "free-riding," where some members contribute significantly less than others. This leads to tension, unfair grading, and a poor learning experience.

**Personal Motivation:**
Personally, I really dislike group work for this exact reason. I often find myself doing all the work while others coast along, which is simply not cool. It creates an unfair environment where effort isn't properly recognized.

On the other hand, I also experienced the reverse situation during the CDSP projects with **MIT Emerging Talent** (the program for which I am currently building this project). Due to personal reasons, I couldn't contribute fully, which forced a few colleagues to carry the project. This made me realize that uneven participation is not just about fairness—it actively impedes learning opportunities and meaningful collaboration for everyone involved.

**The Solution:**
Qolabb aims to solve this by building a web application that leverages data science to:
*   **Track individual contributions** transparently.
*   **Visualize engagement** to hold members accountable.
*   **Ensure that grades and recognition reflect actual effort.**

This project is about making teamwork fair again.

## 🧗 Challenges

### 🔐 1. The Workspace RLS Struggle
One of the biggest hurdles was implementing the workspace flow. I wanted users to be able to create a new workspace or select an existing one immediately after logging in.

This feature caused a significant amount of trouble, to the point where I almost felt like giving up. The root cause turned out to be the **Row Level Security (RLS) policies** in Supabase. The policies for authenticated users weren't correctly set up to allow the necessary reads and writes during that initial creation phase. Once I realized the RLS policies were blocking the requests, I was able to fix it, but it was a tough debugging experience.

## 🗣️ Feedback

### 💬 Insights from Evan Cole (Instructor)
I had a valuable conversation with my instructor, Evan, which highlighted both technical issues and a critical design flaw.

**1. The "Disappearing Project" Bug:**
Early on, Evan tested the deployed app and encountered a bug where he created a project but couldn't find it afterwards.
> *"I created a project (ET6 ELO2) then couldn’t find it again, the dropdown told me there were none."*
This confirmed the RLS issue I was struggling with (mentioned above). I had to temporarily disable RLS to let him proceed, which was a quick fix but not a long-term solution.

**2. Feature Creep & Loss of Focus:**
The most critical piece of feedback came later, when Evan noted that the app was losing its educational identity:
> *"It feels like it’s becoming a generic task management app. There’s barely any wording about studying in groups... Imagine yourself as a student without much experience working in groups... trying to use this for the first time. You’d be overwhelmed."*

**Key Takeaway:**
I was building too many features without keeping the specific user persona (students) in mind. The app was becoming complex rather than helpful. Evan advised me to:
*   **Define user personas** more carefully.
*   **Simplify the user experience**, even if it means removing code.
*   Focus on the **minimal set of features** that truly support group study.

## 🔄 Turning Points
*Highlight key moments where the project direction changed or significant decisions were made.*
