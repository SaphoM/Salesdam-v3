/**
 * Tour steps. Each step targets a real element via a data-tour attribute,
 * so the tour can never point at something the user cannot see.
 * A step whose target is missing on the page is skipped automatically.
 */
export const TOUR_STEPS = [
  {
    selector: '[data-tour="sidebar"]',
    placement: 'right',
    title: 'Your navigation lives here',
    body: 'Objects, dashboards, tasks and setup all switch from the sidebar. Collapse it any time and the app remembers your choice.',
  },
  {
    selector: '[data-tour="home"]',
    placement: 'right',
    path: '/',
    title: 'Start on Home',
    body: 'Home is your landing page. Your greeting, your dashboard and the latest activity in this workspace all load here.',
  },
  {
    selector: '[data-tour="objects"]',
    placement: 'right',
    group: 'Setup',
    path: '/setup/objects',
    title: 'Object Settings',
    body: 'Shape the data model here: objects, fields and relationships. Anything you add appears in the navigation on the left.',
  },
  {
    selector: '[data-tour="workspaces"]',
    placement: 'right',
    group: 'Setup',
    path: '/workspaces',
    title: 'Workspaces',
    body: 'Split the organisation by team. A workspace decides which objects and records its members see.',
  },
  {
    selector: '[data-tour="search"]',
    placement: 'bottom',
    title: 'Find anything fast',
    body: 'Search across every record and user you have access to. Press the shortcut shown in the box to jump straight to it.',
  },
  {
    selector: '[data-tour="notifications"]',
    placement: 'bottom',
    title: 'Stay in the loop',
    body: 'Assignments, approvals and mentions land here. Unread items are counted on the bell.',
  },
  {
    selector: '[data-tour="profile"]',
    placement: 'bottom',
    title: 'Your account and this tour',
    body: 'Your profile and settings live in this menu. You can start this tour again from here at any time.',
  },
];
