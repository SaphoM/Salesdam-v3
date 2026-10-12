# Recurring Tasks Feature Documentation

## Overview

The Recurring Tasks feature allows users to create tasks that automatically recur on a specified schedule without needing to manually recreate them each time.

## Features

### 1. **Recurrence Cadences**
Tasks can recur with the following schedules:
- **Daily**: Creates a task every day
- **Weekly**: Creates a task every week
- **Monthly**: Creates a task every month (on the same day)
- **Yearly**: Creates a task every year (on the same day)

### 2. **Automatic End Date Calculation**
The end date of the recurrence series is automatically calculated based on:
- **Start Date**: When the recurrence begins
- **Cadence**: The recurrence pattern (daily, weekly, monthly, yearly)
- **Occurrence Count**: How many times the task should recur

Example: A weekly task starting on Jan 1, 2026 with 4 occurrences will:
- Occurrence 1: Jan 1, 2026
- Occurrence 2: Jan 8, 2026
- Occurrence 3: Jan 15, 2026
- Occurrence 4: Jan 22, 2026 (End Date)

### 3. **Series Management**
All tasks in a recurring series are grouped together with a unique `series_id`, allowing for:
- Bulk updates to all tasks in the series
- Viewing the complete series at once
- Deleting the entire series with one action

### 4. **Task Metadata**
Each recurring task includes:
- `series_id`: Unique identifier for the recurrence series
- `occurrence_index`: Position in the series (0-based)
- `is_recurring`: Boolean flag indicating it's part of a recurring series
- `recurrence_cadence`: The recurrence pattern
- `recurrence_count`: Total occurrences in the series
- `recurrence_start_date`: When the series begins
- `recurrence_end_date`: When the series ends (auto-calculated)

## API Endpoints

### Create a Recurring Task Series
**POST** `/api/v1/recurring-tasks`

Request body:
```json
{
  "subject": "Weekly Team Meeting",
  "description": "Team sync-up meeting",
  "assigned_to": "user_id",
  "due_date": "2026-01-01T10:00:00Z",
  "status": "not_started",
  "priority": "normal",
  "department": "sales_marketing",
  "related_to_model": "deal",
  "related_to_id": "deal_id",
  "recurrence_cadence": "weekly",
  "recurrence_count": 12,
  "recurrence_start_date": "2026-01-01T10:00:00Z"
}
```

Response:
```json
{
  "seriesId": "uuid",
  "cadence": "weekly",
  "occurrenceCount": 12,
  "startDate": "2026-01-01T10:00:00Z",
  "endDate": "2026-03-19T10:00:00Z",
  "taskCount": 12,
  "tasks": [...]
}
```

### Get All Tasks in a Series
**GET** `/api/v1/recurring-tasks/:seriesId`

Response:
```json
{
  "series": {
    "seriesId": "uuid",
    "cadence": "weekly",
    "occurrenceCount": 12,
    "startDate": "2026-01-01T10:00:00Z",
    "endDate": "2026-03-19T10:00:00Z",
    "totalTasks": 12,
    "completedTasks": 3
  },
  "tasks": [...]
}
```

### Update All Tasks in a Series
**PUT** `/api/v1/recurring-tasks/:seriesId`

Request body:
```json
{
  "status": "in_progress",
  "assigned_to": "new_user_id"
}
```

⚠️ **Note**: You cannot modify the recurrence configuration (cadence, count, series_id) through this endpoint.

### Delete a Recurring Series
**DELETE** `/api/v1/recurring-tasks/:seriesId`

Soft-deletes all tasks in the series.

## Frontend Integration

### Creating a Recurring Task

```javascript
import { createRecurringTasks } from '@/lib/api/recurringTasks';

const handleCreateRecurringTask = async () => {
  const result = await createRecurringTasks({
    subject: 'Weekly Report',
    description: 'Submit weekly progress report',
    department: 'sales_marketing',
    recurrence_cadence: 'weekly',
    recurrence_count: 52, // 52 weeks (1 year)
    recurrence_start_date: new Date(),
    priority: 'high',
  });
  
  console.log(`Created ${result.taskCount} tasks with series ID: ${result.seriesId}`);
};
```

### Viewing a Series

```javascript
import { getRecurringSeriesTasks } from '@/lib/api/recurringTasks';

const series = await getRecurringSeriesTasks('series_uuid');
console.log(`Series has ${series.series.totalTasks} tasks, ${series.series.completedTasks} completed`);
```

### Updating All Tasks in a Series

```javascript
import { updateRecurringSeries } from '@/lib/api/recurringTasks';

await updateRecurringSeries('series_uuid', {
  status: 'completed',
  assigned_to: 'new_user_id'
});
```

### Deleting a Series

```javascript
import { deleteRecurringSeries } from '@/lib/api/recurringTasks';

await deleteRecurringSeries('series_uuid');
```

## Database Schema

### Task Fields Added

The Task object now includes these system fields:

| Field | Type | Description |
|-------|------|-------------|
| `is_recurring` | Boolean | Whether the task is part of a recurring series |
| `recurrence_cadence` | Picklist | daily, weekly, monthly, yearly |
| `recurrence_count` | Number | Total occurrences in the series |
| `recurrence_start_date` | DateTime | Start date of the series |
| `recurrence_end_date` | DateTime | End date (auto-calculated) |
| `series_id` | Text | Unique identifier for the series |
| `occurrence_index` | Number | 0-based position in the series |

## Use Cases

### 1. **Weekly Team Meetings**
- Cadence: Weekly
- Count: 52 (annual)
- All team members automatically get the meeting task every week

### 2. **Monthly Reports**
- Cadence: Monthly
- Count: 12
- Finance team gets a "Submit Monthly Report" task on the 1st of each month

### 3. **Daily Standup**
- Cadence: Daily
- Count: 260 (business days, roughly)
- Engineers get a standup reminder every workday

### 4. **Annual Reviews**
- Cadence: Yearly
- Count: 3
- HR gets reminders to conduct employee reviews annually for 3 years

### 5. **Quarterly Planning**
- Cadence: Monthly (or custom quarterly logic)
- Count: 4
- Managers create quarterly planning tasks

## Calculation Examples

### Monthly Cadence
- Start: Jan 15, 2026
- Cadence: Monthly
- Count: 6
- **Results:**
  - Occurrence 1: Jan 15, 2026
  - Occurrence 2: Feb 15, 2026
  - Occurrence 3: Mar 15, 2026
  - Occurrence 4: Apr 15, 2026
  - Occurrence 5: May 15, 2026
  - Occurrence 6: Jun 15, 2026 (End Date)

### Daily Cadence
- Start: Jan 1, 2026 at 9:00 AM
- Cadence: Daily
- Count: 5
- **Results:**
  - Occurrence 1: Jan 1 at 9:00 AM
  - Occurrence 2: Jan 2 at 9:00 AM
  - Occurrence 3: Jan 3 at 9:00 AM
  - Occurrence 4: Jan 4 at 9:00 AM
  - Occurrence 5: Jan 5 at 9:00 AM (End Date)

## Best Practices

1. **Use Descriptive Subject Lines**: Help users understand what the recurring task is about
2. **Set Appropriate Cadences**: Match the recurrence pattern to your business needs
3. **Assign Ownership**: Assign tasks to specific users to ensure accountability
4. **Document Dependencies**: Use the description field to explain any dependencies
5. **Review Regularly**: Check completed recurring series and create new ones as needed
6. **Bulk Updates**: Use the series update endpoint to quickly update all tasks in a series

## Limitations

- Once a recurring series is created, the recurrence configuration cannot be modified
- To change the recurrence pattern, you must delete the series and create a new one
- Recurring tasks follow a strict calendar-based pattern (no business-days-only option)
- Monthly cadence uses the same day of month (e.g., 15th each month)

## Future Enhancements

Potential improvements for future versions:
- Business days only option (skip weekends/holidays)
- Complex recurrence patterns (every other week, quarterly, etc.)
- Exception handling (skip specific occurrences)
- Recurrence rule modification (change cadence/count mid-series)
- Custom holiday calendars
- Task template system for quick creation

## Troubleshooting

### Series Not Found
Ensure the `seriesId` is correct and the series belongs to your tenant.

### End Date Calculation Issues
Verify that `recurrence_cadence` is one of: daily, weekly, monthly, yearly
Ensure `recurrence_count` is greater than 0

### Tasks Not Creating
Check that all required fields are provided:
- subject
- department
- recurrence_cadence
- recurrence_count
- recurrence_start_date

## Support

For questions or issues, contact the development team or refer to the API documentation.
