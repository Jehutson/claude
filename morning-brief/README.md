# Morning Brief — Follow-ups checklist

A checklist section added to the end of the daily Morning Brief page. Ticking a box,
adding a task or removing one republishes the page itself (artifact capability
`{"artifact": {}}`), so the state is saved on the page.

- `followups.css` / `followups.html` / `followups.js` — the component.
- `add_followups.py BRIEF.html TASKS.json OUT.html` — inserts the component and task
  state into a rendered brief.

Task state lives in `<script type="application/json" id="fu-data">`:
`{"date": "YYYY-MM-DD", "tasks": [{"id", "text", "href", "meta", "done", "since", "slack"}]}`.
`slack` is the task's row ID in the Slack list "Claude List" (F0CF44919UM); the daily run
adds tasks without one to that list and drops tasks completed there.
The weekday "Morning Briefing" scheduled task reads the previous brief's `fu-data`,
carries unticked tasks forward, and adds new ones from Needs attention and
Still waiting on your reply.
