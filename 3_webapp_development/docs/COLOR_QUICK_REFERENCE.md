# Color Quick Reference Guide

## 🎨 At-a-Glance Color Usage

### Task Status Colors

```
🟠 To Start (todo)
   bg-qolabb-orange-50 text-qolabb-orange-700 border-qolabb-orange-200
   Psychology: Urgency, needs attention

🔵 Doing (in_progress)
   bg-qolabb-navy-50 text-qolabb-navy-700 border-qolabb-navy-200
   Psychology: Focus, trust, active work

🟢 Done (completed)
   bg-qolabb-green-50 text-qolabb-green-700 border-qolabb-green-200
   Psychology: Achievement, growth, success
```

### Priority Colors

```
🔴 High Priority
   text-qolabb-orange-600
   Use for: Urgent tasks, critical items

🟡 Medium Priority
   text-qolabb-yellow-600
   Use for: Important but not urgent

⚪ Low Priority
   text-gray-600
   Use for: Nice-to-have items
```

### Alert States

```
🚨 Overdue / Urgent
   bg-qolabb-orange-50 border-qolabb-orange-200 text-qolabb-orange-700
   Use for: Past due dates, critical alerts

⚠️ Warning / Due Soon
   bg-qolabb-yellow-100 text-qolabb-yellow-700
   Use for: Upcoming deadlines, important notices

ℹ️ Information
   bg-qolabb-navy-50 border-qolabb-navy-200 text-qolabb-navy-800
   Use for: Helpful tips, neutral information

✅ Success
   bg-qolabb-green-50 border-qolabb-green-200 text-qolabb-green-700
   Use for: Confirmations, achievements
```

### Common Patterns

#### Card with Status Badge
```tsx
<div className="bg-white border border-gray-200 rounded-xl p-4">
  <span className="bg-qolabb-green-50 text-qolabb-green-700 border-qolabb-green-200 px-2 py-1 rounded-full text-xs">
    Done
  </span>
</div>
```

#### Alert Section
```tsx
<section className="bg-qolabb-orange-50 border border-qolabb-orange-200 rounded-xl p-5">
  <div className="text-qolabb-orange-800 font-semibold">
    Needs attention
  </div>
  <p className="text-qolabb-orange-700">
    Description text
  </p>
</section>
```

#### Statistics Display
```tsx
<div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
  <div className="text-2xl font-bold text-qolabb-green-600">
    {count}
  </div>
  <div className="text-xs text-gray-500">
    Label
  </div>
</div>
```

## 🎯 Color Decision Tree

**Need to show task status?**
- Not started → Orange (qolabb-orange)
- In progress → Navy (qolabb-navy)
- Completed → Green (qolabb-green)

**Need to show priority?**
- High → Orange (qolabb-orange-600)
- Medium → Yellow (qolabb-yellow-600)
- Low → Gray (gray-600)

**Need to show an alert?**
- Overdue/Urgent → Orange (qolabb-orange)
- Warning/Due soon → Yellow (qolabb-yellow)
- Info/Neutral → Navy (qolabb-navy)
- Success/Done → Green (qolabb-green)

**Need a background?**
- Page background → Beige (qolabb-beige-50) or Gray (gray-50)
- Card background → White (white)
- Hover state → Gray (gray-50) or Navy (qolabb-navy-50)

**Need text color?**
- Primary text → Gray (gray-900)
- Secondary text → Gray (gray-600)
- Muted text → Gray (gray-500)
- Link text → Navy (qolabb-navy-600)

## 🔍 Common Mistakes to Avoid

❌ **DON'T:**
- Use red (too harsh) → Use orange instead
- Mix multiple alert colors in one section
- Use bright colors for large backgrounds
- Rely on color alone (always add icons/labels)
- Use light text on light backgrounds

✅ **DO:**
- Use consistent color meanings
- Maintain adequate contrast (WCAG AA)
- Add icons to reinforce meaning
- Use neutral backgrounds for readability
- Test with color blindness simulators

## 📱 Responsive Considerations

All colors work across devices, but consider:
- Smaller screens: Ensure colored badges are readable
- Touch targets: Maintain adequate size for colored buttons
- Dark mode: Plan for inverted palette in future

## 🧪 Testing Checklist

- [ ] All statuses display correctly
- [ ] Overdue items are visually distinct
- [ ] Success states feel encouraging
- [ ] Contrast ratios meet WCAG AA
- [ ] Colors work with color blindness
- [ ] Hover states are clear
- [ ] Focus states are visible

---

**Quick Tip:** When in doubt, use neutral grays for backgrounds and navy for interactive elements!
