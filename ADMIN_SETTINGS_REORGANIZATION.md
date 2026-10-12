# Admin Settings Reorganization - Accordion Layout

## Overview
Reorganized the admin settings page into logical groupings with a collapsible accordion interface for better navigation and organization.

## New Components Created

### 1. Accordion Component
**Location:** `frontend/src/components/common/Accordion/Accordion.jsx`
- Main accordion component with collapsible items
- `AccordionItem` component for individual accordion entries
- Smooth animations and transitions
- Dark mode support
- Features:
  - One section open at a time (default first section)
  - Icon display for each section
  - Chevron indicator showing open/closed state
  - Responsive design

### 2. SettingsCard Component
**Location:** `frontend/src/components/admin/SettingsCard/SettingsCard.jsx`
- Individual card component for each setting
- Displays within accordion sections
- Features:
  - Icon with colored background
  - Title and description
  - Hover effects and animations
  - Chevron icon indicating navigation
  - Links to respective settings pages

## Settings Groups Organization

### 1. Company Settings
- Company Information
- Revenue & Sales Targets
- Invoice & Quote Settings

### 2. Roles and Permissions
- Manage Users
- Roles and Permissions

### 3. Email Configuration
- Email Configuration

### 4. Data Import and Export
- Data Import
- Data Export

### 5. Billing and Subscription
- Billing & Subscription

### 6. Other
- Other Settings (Tenders, Approvals, and other feature toggles)

## Files Modified

1. **frontend/src/pages/Admin/AdminSettings.jsx**
   - Reorganized settings into groups using SETTINGS_GROUPS array
   - Integrated Accordion component
   - Added SettingsCard components within each accordion section
   - Removed card grid layout in favor of accordion

2. **frontend/src/pages/Admin/AdminSettings.module.css**
   - Added `.cardsGrid` style for responsive card layout within accordion sections
   - Responsive breakpoints for different screen sizes

## Files Created

1. **frontend/src/components/common/Accordion/Accordion.jsx**
   - Main accordion component and AccordionItem sub-component
   - Manages open/close state

2. **frontend/src/components/common/Accordion/Accordion.module.css**
   - Accordion styling with smooth transitions
   - Dark mode support
   - Responsive design

3. **frontend/src/components/admin/SettingsCard/SettingsCard.jsx**
   - Individual setting card component
   - Displays icon, title, description, and navigation arrow

4. **frontend/src/components/admin/SettingsCard/SettingsCard.module.css**
   - Card styling with hover effects
   - Responsive adjustments
   - Dark mode support

## Features

✅ **Collapsible Accordion** - Only one section open at a time for cleaner interface
✅ **Organized Groups** - Settings logically grouped by functionality
✅ **Icons** - Each group has a distinctive icon
✅ **Responsive Design** - Works on all screen sizes
✅ **Dark Mode Support** - Full dark mode compatibility
✅ **Smooth Animations** - Professional transitions and effects
✅ **Easy Navigation** - Clear indication of settings within each group

## Usage

Users can now:
1. Navigate to Admin Settings (/admin/settings)
2. Click on accordion headers to expand/collapse groups
3. Select individual settings from within each group
4. Only one group is open at a time for reduced cognitive load

## Future Enhancements

Potential future additions:
- Allow multiple accordion sections open simultaneously (optional toggle)
- Search functionality to filter settings across all groups
- Favorite/pin commonly used settings
- Settings usage analytics
- Keyboard navigation support (arrow keys)
