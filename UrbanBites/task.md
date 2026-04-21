# UrbanBites Multi-Role Implementation Tasks

- [ ] Phase 1: Authentication & Shielding
  - [ ] UI: Update `RegisterPage` with Role Selector (Customer, Owner, Agent)
  - [ ] Logic: Implement **Shake Validation** for all auth inputs
  - [ ] Logic: Add 10-digit Phone & Email regex validation
  - [ ] Logic: Redirect users to their specific dashboard on successful login

- [ ] Phase 2: Navigation & Layout Architecture
  - [ ] Component: Create `Sidebar.jsx` (Collapsible, icon-driven, glassmorphic)
  - [ ] Component: Create `DashboardLayout.jsx` (Shared wrapper for partners)
  - [ ] Logic: Implement `ProtectedRoute.jsx` for Role-Based Access Control (RBAC)
  - [ ] UI: Add tooltips for collapsed sidebar states

- [ ] Phase 3: Restaurant Partner Dashboard (`OWNER`)
  - [ ] API: Implement `restaurantDashboardApi.js` endpoints
  - [ ] UI: **Overview Dashboard**: Sales stats, active orders count, revenue charts
  - [ ] UI: **Menu Manager**: Drag-and-drop categories, item availability toggles
  - [ ] UI: **Order Tracker**: "New" / "Preparing" / "Ready" kanban-style columns

- [ ] Phase 4: Delivery Logistics Panel (`AGENT`)
  - [ ] UI: **Active Task View**: Large "Accept Order" cards, Map/Route integration
  - [ ] UI: **Earnings Panel**: Daily/Weekly total log with tip breakdown
  - [ ] UI: **Status Slider**: "Slide to Pickup / Drop-off" specialized component

- [ ] Phase 5: Platform Command Center (`ADMIN`)
  - [ ] UI: **Restaurant Approval**: Profile verification queue with document/image viewer
  - [ ] UI: **Zone & Fees Manager**: CRUD for service zones and dynamic platform fees
  - [ ] UI: **User Audit**: Global search and role-modification tool

- [ ] Phase 6: Core Features (Consumers)
  - [x] Phase 4: Restaurant Discovery (Home Page)
  - [x] Phase 5: Menu & Cart
  - [ ] UI: Checkout & Pricing breakdown
  - [ ] UI: Real-time order status timeline

- [ ] Phase 7: Polish & Micro-interactions
  - [ ] Add "Glass-Dock" for quick role switching (if applicable)
  - [ ] Advanced loading skeletons for all data-heavy dashboards
  - [ ] Comprehensive mobile optimization for Agent & Owner views
