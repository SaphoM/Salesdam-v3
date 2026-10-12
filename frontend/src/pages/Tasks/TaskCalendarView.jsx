import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button/Button';
import Layout from '../../layout/Layout';
import api from '../../services/api';
import styles from './TaskCalendarView.module.css';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const VIEWS = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
];

const PRIORITY_COLORS = {
  low: '#22c55e',
  normal: '#3b82f6',
  high: '#ef4444',
};

const STATUS_INDICATORS = {
  not_started: '#9ca3af',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  waiting: '#f59e0b',
  deferred: '#6b7280',
};

function TaskCalendarView() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const res = await api.get('/records/task');
        setTasks(res.data?.data || []);
      } catch (err) {
        toast.error('Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleTaskClick = (task) => {
    navigate(`/o/task/${task._id}`);
  };

  const tasksForDate = (date) => {
    return tasks.filter((task) => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date);
      return (
        taskDate.getFullYear() === date.getFullYear()
        && taskDate.getMonth() === date.getMonth()
        && taskDate.getDate() === date.getDate()
      );
    });
  };

  const monthCalendar = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const calendar = [];
    let currentWeek = [];

    for (let i = 0; i < 42; i++) {
      currentWeek.push(new Date(startDate));
      if (currentWeek.length === 7) {
        calendar.push(currentWeek);
        currentWeek = [];
      }
      startDate.setDate(startDate.getDate() + 1);
    }

    return calendar;
  }, [currentDate]);

  const weekStart = useMemo(() => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - date.getDay());
    return date;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000));
    }
    return days;
  }, [weekStart]);

  const handleDateClick = (date) => {
    if (view === 'month') {
      setView('day');
      setCurrentDate(date);
    }
  };

  if (loading) {
    return (
      <Layout title="Tasks Calendar" description="View and manage tasks on a calendar">
        <div className={styles.page}>
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading tasks...</div>
        </div>
      </Layout>
    );
  }

  if (view === 'month') {
    return (
      <Layout title="Tasks Calendar" description="View and manage tasks on a calendar">
        <div className={styles.page}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.titleRow}>
              <div className={styles.titleIcon}>
                <Calendar size={24} />
              </div>
              <h1 className={styles.title}>Tasks Calendar</h1>
            </div>

            <div className={styles.controls}>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/o/task')}
              >
                Back to List
              </Button>
              {VIEWS.map((v) => (
                <button
                  key={v.value}
                  className={`${styles.viewBtn} ${view === v.value ? styles.viewBtnActive : ''}`}
                  onClick={() => setView(v.value)}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Month View */}
          <div className={styles.calendarContainer}>
            <div className={styles.calendarHeader}>
              <button className={styles.navBtn} onClick={handlePrevious}>
                <ChevronLeft size={20} />
              </button>
              <div className={styles.dateDisplay}>
                <h2>
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
              </div>
              <button className={styles.navBtn} onClick={handleNext}>
                <ChevronRight size={20} />
              </button>
              <Button size="sm" variant="secondary" onClick={handleToday}>
                Today
              </Button>
            </div>

            <div className={styles.weekdayRow}>
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className={styles.weekdayHeader}>
                  {day}
                </div>
              ))}
            </div>

            {monthCalendar.map((week, weekIdx) => (
              <div key={weekIdx} className={styles.week}>
                {week.map((date) => {
                  const dayTasks = tasksForDate(date);
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                  const isToday =
                    date.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={date.toISOString()}
                      className={`${styles.day} ${!isCurrentMonth ? styles.dayOtherMonth : ''} ${isToday ? styles.dayToday : ''}`}
                      onClick={() => handleDateClick(date)}
                    >
                      <div className={styles.dayNumber}>{date.getDate()}</div>
                      <div className={styles.dayTasks}>
                        {dayTasks.slice(0, 2).map((task) => (
                          <div
                            key={task._id}
                            className={styles.taskBadge}
                            style={{
                              borderLeftColor: PRIORITY_COLORS[task.priority] || '#3b82f6',
                              cursor: 'pointer',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTaskClick(task);
                            }}
                            title={task.subject}
                          >
                            {task.subject}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <div className={styles.moreCount}>
                            +{dayTasks.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (view === 'week') {
    return (
      <Layout title="Tasks Calendar - Week View" description="View tasks for this week">
        <div className={styles.page}>
          <div className={styles.header}>
            <div className={styles.titleRow}>
              <div className={styles.titleIcon}>
                <Calendar size={24} />
              </div>
              <h1 className={styles.title}>Tasks Calendar - Week View</h1>
            </div>

            <div className={styles.controls}>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/o/task')}
              >
                Back to List
              </Button>
              {VIEWS.map((v) => (
                <button
                  key={v.value}
                  className={`${styles.viewBtn} ${view === v.value ? styles.viewBtnActive : ''}`}
                  onClick={() => setView(v.value)}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.calendarContainer}>
            <div className={styles.calendarHeader}>
              <button className={styles.navBtn} onClick={handlePrevious}>
                <ChevronLeft size={20} />
              </button>
              <div className={styles.dateDisplay}>
                <h2>
                  {weekStart.toLocaleDateString('en-ZA')} -{' '}
                  {new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-ZA')}
                </h2>
              </div>
              <button className={styles.navBtn} onClick={handleNext}>
                <ChevronRight size={20} />
              </button>
              <Button size="sm" variant="secondary" onClick={handleToday}>
                Today
              </Button>
            </div>

            <div className={styles.weekViewContainer}>
              {weekDays.map((date) => {
                const dayTasks = tasksForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={date.toISOString()}
                    className={`${styles.weekDay} ${isToday ? styles.dayToday : ''}`}
                  >
                    <div className={styles.weekDayHeader}>
                      <div className={styles.weekDayName}>
                        {DAYS_OF_WEEK[date.getDay()]}
                      </div>
                      <div className={styles.weekDayDate}>{date.getDate()}</div>
                    </div>
                    <div className={styles.weekDayTasks}>
                      {dayTasks.map((task) => (
                        <div
                          key={task._id}
                          className={styles.weekTaskItem}
                          onClick={() => handleTaskClick(task)}
                          style={{
                            borderLeftColor: PRIORITY_COLORS[task.priority] || '#3b82f6',
                          }}
                        >
                          <div
                            className={styles.taskStatus}
                            style={{
                              backgroundColor: STATUS_INDICATORS[task.status] || '#9ca3af',
                            }}
                          />
                          <div className={styles.weekTaskInfo}>
                            <div className={styles.weekTaskSubject}>{task.subject}</div>
                            <div className={styles.weekTaskDept}>{task.department}</div>
                          </div>
                        </div>
                      ))}
                      {dayTasks.length === 0 && (
                        <div className={styles.noTasks}>No tasks</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Day View
  const dayTasks = tasksForDate(currentDate);

  return (
    <Layout title="Tasks Calendar - Day View" description="View tasks for today">
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <div className={styles.titleIcon}>
              <Calendar size={24} />
            </div>
            <h1 className={styles.title}>Tasks Calendar - Day View</h1>
          </div>

          <div className={styles.controls}>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/o/task')}
            >
              Back to List
            </Button>
            {VIEWS.map((v) => (
              <button
                key={v.value}
                className={`${styles.viewBtn} ${view === v.value ? styles.viewBtnActive : ''}`}
                onClick={() => setView(v.value)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.calendarContainer}>
          <div className={styles.calendarHeader}>
            <button className={styles.navBtn} onClick={handlePrevious}>
              <ChevronLeft size={20} />
            </button>
            <div className={styles.dateDisplay}>
              <h2>{currentDate.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
            </div>
            <button className={styles.navBtn} onClick={handleNext}>
              <ChevronRight size={20} />
            </button>
            <Button size="sm" variant="secondary" onClick={handleToday}>
              Today
            </Button>
          </div>

          <div className={styles.dayViewContainer}>
            {dayTasks.length > 0 ? (
              <div className={styles.dayTasksList}>
                {dayTasks.map((task) => (
                  <div
                    key={task._id}
                    className={styles.dayTaskItem}
                    onClick={() => handleTaskClick(task)}
                  >
                    <div
                      className={styles.taskStatusDot}
                      style={{
                        backgroundColor: STATUS_INDICATORS[task.status] || '#9ca3af',
                      }}
                    />
                    <div className={styles.dayTaskContent}>
                      <h3 className={styles.dayTaskSubject}>{task.subject}</h3>
                      <p className={styles.dayTaskDesc}>{task.description}</p>
                      <div className={styles.dayTaskMeta}>
                        <span className={styles.dayTaskDept}>{task.department}</span>
                        <span
                          className={styles.dayTaskPriority}
                          style={{
                            color: PRIORITY_COLORS[task.priority] || '#3b82f6',
                          }}
                        >
                          {task.priority}
                        </span>
                        {task.assigned_to && (
                          <span className={styles.dayTaskAssigned}>Assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Calendar size={48} />
                <p>No tasks for this day</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default TaskCalendarView;
