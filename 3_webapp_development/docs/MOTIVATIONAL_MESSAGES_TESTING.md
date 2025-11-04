# Testing Motivational Messages System

## Prerequisites

1. **Run the database migration** in Supabase:
   - Go to Supabase Dashboard → SQL Editor
   - Run the migration file: `supabase/migrations/047_add_motivational_messages.sql`
   - Verify tables were created: `motivational_messages`, `message_templates`

2. **Verify RLS policies** are active (they should be created by the migration)

---

## Testing Methods

### Method 1: Test Page (Recommended)

1. **Navigate to the test page**:
   - URL: `http://localhost:3000/test-motivation`
   - Or add link in sidebar for easy access

2. **Send test messages**:
   - Click any of the 8 test message buttons
   - Each button sends a different type of message
   - Check if success toast appears

3. **Verify messages appear**:
   - Messages should appear in the "Your Messages" section below
   - Check banner at top of page (should show if unread messages exist)
   - Click a message card to mark as read

4. **Test frequency limits**:
   - Send the same message type twice quickly
   - Second message should be blocked (frequency limit: 1 day for similar messages)

---

### Method 2: Real-World Triggers

#### Test Task Completion Trigger
1. Go to Tasks page
2. Complete a task (change status to "completed")
3. Check dashboard banner for "First Task Complete!" message
4. Complete 2 more tasks on consecutive days
5. Should trigger "3-Day Streak!" message

#### Test Contribution Trigger
1. Go to Contributions page
2. Log your first contribution
3. Should trigger "Getting Started! 🌱" message
4. Log 4 more contributions in the same week
5. Should trigger "5 Contributions Logged! 📊" message

#### Test Low Participation Trigger
1. Don't log any contributions or complete tasks for 3+ days
2. Should trigger "We Miss You! 💙" message (may take time to appear)

#### Test Active Week Trigger
1. Log contributions or complete tasks every day for 7 days
2. Should trigger "Active Week! 💪" message

---

## Verification Checklist

### ✅ Database
- [ ] `motivational_messages` table exists
- [ ] `message_templates` table exists with 15 default templates
- [ ] RLS policies are enabled
- [ ] Helper functions created (`send_motivational_message`, etc.)

### ✅ Backend Functions
- [ ] `sendMotivationalMessage()` works
- [ ] `getMotivationalMessages()` returns messages
- [ ] `markMotivationalMessageAsRead()` updates read status
- [ ] Frequency limits prevent duplicate messages

### ✅ UI Components
- [ ] Banner appears at top when unread messages exist
- [ ] Message cards display correctly
- [ ] Mark as read functionality works
- [ ] Dismiss functionality works
- [ ] Filters work in messages panel

### ✅ Triggers
- [ ] Task completion triggers messages
- [ ] Contribution logging triggers messages
- [ ] Participation checks work
- [ ] Frequency limits prevent spam

---

## Expected Behavior

### Message Delivery
- Messages appear in banner (top of page) if unread
- Messages appear in notification dropdown (if integrated)
- Messages can be viewed in test page
- High-priority messages appear first

### Frequency Limits
- Same trigger event won't send multiple messages within 1 day
- Different trigger events can send messages on same day
- User preferences control which message types are sent

### Message States
- **Unread**: Shows in banner, highlighted in list
- **Read**: Strikethrough title, grayed out appearance
- **Dismissed**: Marked as read, removed from unread count

---

## Troubleshooting

### Messages Not Appearing
1. **Check migration ran**: Verify tables exist in Supabase
2. **Check RLS policies**: Ensure policies allow message creation
3. **Check user preferences**: User might have disabled motivational messages
4. **Check frequency limits**: Similar message may have been sent recently
5. **Check console**: Look for errors in browser console

### Frequency Limit Issues
- Frequency limit is 1 day for similar trigger events
- To test same message twice: Wait 24 hours OR manually delete the message from database

### Banner Not Showing
- Banner only shows if there are unread messages
- Check message count: Should show "X unread messages"
- Try refreshing the page

### TypeScript Errors
- Ensure all imports are correct
- Check that `MotivationalMessage` type is exported from `queries.ts`
- Run `npm run build` to check for type errors

---

## Quick Test Commands

### In Supabase SQL Editor
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('motivational_messages', 'message_templates');

-- Check message count
SELECT COUNT(*) FROM motivational_messages;

-- View recent messages
SELECT id, user_id, message_type, title, is_read, sent_at 
FROM motivational_messages 
ORDER BY sent_at DESC 
LIMIT 10;

-- Check templates
SELECT message_type, trigger_condition, title_template 
FROM message_templates 
WHERE is_active = true;
```

---

## Next Steps After Testing

Once testing is complete:
1. ✅ Remove or hide test page (or keep for future testing)
2. ✅ Verify real-world triggers work correctly
3. ✅ Check message appearance and styling
4. ✅ Verify user preferences work
5. ✅ Test on different devices/browsers

---

## Notes

- Messages are stored in `motivational_messages` table
- Each user only sees their own messages (RLS enforced)
- Messages can be filtered by type in the panel
- Frequency limits are enforced at the database level
- User preferences control which message types are sent
