# Object Groups Implementation Guide

## Overview
This document outlines the Object Groups feature that allows users to organize CRM objects into collapsible groups in the sidebar.

## Frontend Components Created

### 1. WorkspaceObjectGroups Component
**Location:** `frontend/src/pages/Workspaces/WorkspaceObjectGroups/`

#### Files:
- `WorkspaceObjectGroups.jsx` - Main component for managing object groups
- `WorkspaceObjectGroups.module.css` - Styling

#### Features:
- Create new object groups
- Edit group names
- Add/remove objects from groups
- Delete groups
- View object count per group
- Collapsible group expansion/collapse
- Save changes to workspace

### 2. Updated WorkspaceDetail.jsx
Added a new "Object Groups" tab with the Layers icon to the workspace settings interface.

**Tab structure:**
- Settings
- Members
- Objects
- **Object Groups (NEW)**

## Data Structure

### ObjectGroup Schema
```javascript
{
  name: String,              // e.g., "Sales", "Customers"
  objectApiNames: [String]        // Array of CRM object IDs
}
```

### Workspace Schema Update
Add to workspace model:
```javascript
objectGroups: [{
  name: String,
  objectApiNames: [String]
}]
```

## Backend API Endpoints Needed

### 1. Get Object Groups
```
GET /api/workspaces/:id
Response includes objectGroups array
```

### 2. Update Object Groups
```
PUT /api/workspaces/:id/object-groups
Body: {
  objectGroups: [
    { name: "Sales", objectApiNames: ["lead", "deal", "order", "product"] },
    { name: "Customers", objectApiNames: ["contact", "account"] }
  ]
}
```

## Default Groups Setup

### When User Registers
Create default object groups:

```javascript
// Default grouping configuration
const DEFAULT_OBJECT_GROUPS = [
  {
    name: "Sales",
    objectApiNames: ["lead", "deal", "order", "product"]  // Adjust based on actual IDs
  },
  {
    name: "Customers",
    objectApiNames: ["contact", "account"]  // Adjust based on actual IDs
  },
  {
    name: "Other",
    objectApiNames: []  // Remaining objects can go here
  }
];

// In workspace creation/registration:
workspace.objectGroups = DEFAULT_OBJECT_GROUPS;
```

## Sidebar Integration

### Update Sidebar Component
Modify `frontend/src/layout/Sidebar/Sidebar.jsx` to:

1. Fetch object groups from workspace
2. Group objects by their group assignment
3. Create collapsible sections for each group
4. Add expand/collapse toggle per group
5. Store group expansion state in localStorage

### Example Implementation Pattern:
```javascript
// In Sidebar.jsx
const [expandedGroups, setExpandedGroups] = useState(
  new Set(JSON.parse(localStorage.getItem('expandedObjectGroups') || '[]'))
);

// When rendering:
objectGroups.map(group => (
  <div key={group.name} className={styles.group}>
    <button onClick={() => toggleGroup(group.name)}>
      <ChevronDown style={{ transform: isExpanded ? '' : 'rotate(-90deg)' }} />
      {group.name}
    </button>
    {isExpanded && (
      <div className={styles.groupObjects}>
        {/* Render objects in this group */}
      </div>
    )}
  </div>
))
```

## Implementation Checklist

### Backend (Node.js/Express)
- [ ] Add objectGroups array to Workspace schema
- [ ] Create endpoint: `PUT /api/workspaces/:id/object-groups`
- [ ] Add validation for object IDs
- [ ] Create default groups during workspace creation
- [ ] Add objectGroups to workspace response

### Frontend (Already Completed)
- [x] Create WorkspaceObjectGroups component
- [x] Add Object Groups tab to WorkspaceDetail
- [ ] Update Sidebar to display grouped objects
- [ ] Add localStorage persistence for group expansion state
- [ ] Add drag-and-drop support (optional enhancement)

### API Service
- [ ] Add `updateWorkspaceObjectGroups()` function in `services/api/workspaces.js`

### Testing
- [ ] Test creating groups
- [ ] Test adding/removing objects from groups
- [ ] Test deleting groups
- [ ] Test default groups on registration
- [ ] Test sidebar collapsible functionality

## Usage Example

1. **Navigate to Workspace Settings → Object Groups**
2. **Create a new group:**
   - Enter group name: "Sales"
   - Click "Add Group"
3. **Add objects to group:**
   - Expand group
   - Check objects: Leads, Deals, Orders, Products
4. **Save changes**
5. **In sidebar, objects now appear in collapsible groups**

## Future Enhancements

1. **Drag and Drop:** Allow dragging objects between groups
2. **Presets:** Provide common preset groupings
3. **Hidden Groups:** Hide ungrouped objects option
4. **Sorting:** Reorder groups by drag and drop
5. **Permissions:** Control group visibility by user role

## API Service Function Template

```javascript
// In services/api/workspaces.js

export const updateWorkspaceObjectGroups = async (workspaceId, groups) => {
  const response = await api.put(
    `/workspaces/${workspaceId}/object-groups`,
    { objectGroups: groups }
  );
  return response.data.data;
};
```

## Notes

- Object Groups are workspace-specific (each workspace has its own groups)
- Objects can only belong to one group
- Ungrouped objects can be shown in a default "Other" group
- Group expansion state should persist per workspace
- Empty groups should be allowed to exist
