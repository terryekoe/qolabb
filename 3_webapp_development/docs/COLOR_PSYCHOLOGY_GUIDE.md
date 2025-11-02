# Color Psychology Implementation Guide

## Overview
This document outlines how color psychology principles have been applied throughout the Qolabb application to create an intuitive, motivating, and visually pleasant user experience.

## Color Palette

### Primary Colors

#### Qolabb Navy (Blue)
**Psychological Effect:** Calmness, trust, focus
**Usage:**
- Main UI backgrounds
- Headers and navigation
- Information sections
- "Doing" task status (in-progress work)
- Active project status

**Tailwind Classes:** `qolabb-navy-{50-900}`

#### Qolabb Beige (Neutral)
**Psychological Effect:** Clarity, reduce fatigue
**Usage:**
- Page backgrounds
- Container backgrounds
- Whitespace and spacing
- Subtle borders

**Tailwind Classes:** `qolabb-beige-{50-900}`

### Accent Colors

#### Qolabb Green
**Psychological Effect:** Balance, growth, motivation
**Usage:**
- ✅ Completed tasks ("Done" status)
- Success messages
- Positive feedback
- Progress indicators
- Dashboard highlights for achievements
- "Recent wins" sections

**Tailwind Classes:** `qolabb-green-{50-900}`

**Examples:**
- Task status badges: `bg-qolabb-green-50 text-qolabb-green-700 border-qolabb-green-200`
- Success icons: `text-qolabb-green-600`
- Completed project status: `bg-qolabb-green-50 text-qolabb-green-600`

#### Qolabb Yellow/Amber
**Psychological Effect:** Energy, optimism, attention
**Usage:**
- ⚠️ Alerts and warnings (use sparingly)
- Important notifications
- Due-soon indicators
- Medium priority items
- CTAs requiring attention

**Tailwind Classes:** `qolabb-yellow-{50-900}`

**Examples:**
- Due soon badges: `bg-qolabb-yellow-100 text-qolabb-yellow-700`
- Medium priority: `text-qolabb-yellow-600`
- Warning alerts: `bg-qolabb-yellow-50 border-qolabb-yellow-200`

#### Qolabb Orange
**Psychological Effect:** Warmth, urgency
**Usage:**
- 🔥 Overdue items
- High priority tasks
- "To Start" task status (needs attention)
- Urgent notifications
- Action-required states

**Tailwind Classes:** `qolabb-orange-{50-900}`

**Examples:**
- Overdue alerts: `bg-qolabb-orange-50 border-qolabb-orange-200 text-qolabb-orange-700`
- To Start status: `bg-qolabb-orange-50 text-qolabb-orange-700 border-qolabb-orange-200`
- High priority: `text-qolabb-orange-600`

## Task Status Color Mapping

### To Start (todo)
- **Color:** Orange
- **Psychology:** Creates urgency and attention
- **Classes:** `text-qolabb-orange-700 bg-qolabb-orange-50 border-qolabb-orange-200`

### Doing (in_progress)
- **Color:** Navy Blue
- **Psychology:** Promotes focus and trust
- **Classes:** `text-qolabb-navy-700 bg-qolabb-navy-50 border-qolabb-navy-200`

### Done (completed)
- **Color:** Green
- **Psychology:** Celebrates growth and achievement
- **Classes:** `text-qolabb-green-700 bg-qolabb-green-50 border-qolabb-green-200`

## Priority Color Mapping

- **High Priority:** Orange (`text-qolabb-orange-600`)
- **Medium Priority:** Yellow (`text-qolabb-yellow-600`)
- **Low Priority:** Gray (`text-gray-600`)

## Best Practices

### 1. Backgrounds & Whitespace
✅ **DO:**
- Use neutral beige tones (`qolabb-beige-50`, `qolabb-beige-100`)
- Use light grays (`gray-50`, `gray-100`)
- Maintain adequate whitespace for clarity

❌ **DON'T:**
- Use bright colors for large background areas
- Overuse colored backgrounds

### 2. Alerts & Notifications
✅ **DO:**
- Orange for overdue/urgent items
- Yellow for warnings (sparingly)
- Green for success messages
- Navy for informational messages

❌ **DON'T:**
- Use red (too harsh) - use orange instead
- Mix multiple alert colors in the same section

### 3. Text Readability
✅ **DO:**
- Use darker shades (600-900) for text on light backgrounds
- Use lighter shades (50-200) for backgrounds
- Maintain WCAG AA contrast ratios (4.5:1 minimum)

❌ **DON'T:**
- Use light text on light backgrounds
- Use medium shades (400-500) for both text and background

### 4. Interactive Elements
✅ **DO:**
- Navy for primary actions
- Green for positive confirmations
- Orange for attention-grabbing CTAs
- Neutral tones for secondary actions

❌ **DON'T:**
- Use yellow for primary buttons (too attention-grabbing)
- Mix multiple accent colors in the same button group

## Component-Specific Guidelines

### Task Cards
- **Border:** `border-gray-200`
- **Background:** `bg-white`
- **Hover:** `hover:border-qolabb-navy-300 hover:shadow-md`
- **Status Badge:** Use appropriate status color (orange/navy/green)

### Modals & Dialogs
- **Overlay:** `bg-black/50`
- **Container:** `bg-white`
- **Border:** `border-gray-200`
- **Header:** Navy accent for important actions

### Forms
- **Labels:** `text-gray-700`
- **Inputs:** `border-gray-300 focus:border-qolabb-navy-500`
- **Error States:** `border-qolabb-orange-300 text-qolabb-orange-700`
- **Success States:** `border-qolabb-green-300 text-qolabb-green-700`

### Statistics & Metrics
- **Total Count:** `text-gray-900`
- **To Start Count:** `text-qolabb-orange-600`
- **Doing Count:** `text-qolabb-navy-600`
- **Done Count:** `text-qolabb-green-600`
- **Overdue Count:** `text-qolabb-orange-600`

## Accessibility Considerations

### Contrast Ratios
All color combinations meet WCAG AA standards:
- **Normal text:** 4.5:1 minimum
- **Large text:** 3:1 minimum
- **Interactive elements:** 3:1 minimum

### Color Blindness
- Never rely on color alone to convey information
- Always include icons, labels, or patterns
- Test with color blindness simulators

### Dark Mode (Future Consideration)
When implementing dark mode:
- Invert lightness values (50 ↔ 900)
- Reduce saturation slightly
- Maintain psychological associations

## Migration Checklist

- [x] Add green, yellow, and orange color palettes to Tailwind config
- [x] Update task status colors (To Start, Doing, Done)
- [x] Update priority colors (high, medium, low)
- [x] Update overdue/alert colors
- [x] Update success states and positive feedback
- [x] Update dashboard project status colors
- [x] Verify neutral tones for backgrounds
- [ ] Update notification system colors (if needed)
- [ ] Update analytics page colors (if needed)
- [ ] Update settings page colors (if needed)

## Testing

### Visual Testing
1. Check all task statuses display correctly
2. Verify overdue items are visually distinct
3. Confirm success states are encouraging
4. Ensure neutral backgrounds reduce eye strain

### Accessibility Testing
1. Run WAVE or axe DevTools
2. Test with screen readers
3. Verify keyboard navigation
4. Check color contrast ratios

## References

- [Color Psychology in UX Design](https://www.interaction-design.org/literature/topics/color-psychology)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design Color System](https://material.io/design/color/the-color-system.html)

---

**Last Updated:** 2025-11-02
**Version:** 1.0.0
