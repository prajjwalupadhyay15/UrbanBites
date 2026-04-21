# Advanced Onboarding Experience (Phase 10)

Your suggestion to mimic the professional onboarding flows of Swiggy/Zomato is perfect. Right now, your `RestaurantPartnerPage` stuffs the Map, the Image Uploader, the Description, and the Address all onto one single crowded screen.

We will split this flow into a structured **Multi-Step Wizard** and enhance the address fields to collect granular data, which we will seamlessly combine before sending to your backend.

## User Action Required

**Critical Question:** I propose splitting the actual "Restaurant Setup" into two highly polished pages/steps. Page 1 for brand identity, and Page 2 for geolocation. Does this specific flow match what you had in mind?

## Proposed Implementation

### 1. Granular Address Fields
*Goal: Provide specific address inputs instead of a single "Address Line" box.*
- **Action**: Add UI fields for `buildingName`, `streetArea`, and `landmark`.
- **Action**: When submitting to the backend, we will mathematically concatenate these `buildingName + ", " + streetArea + " (" + landmark + ")"` to perfectly satisfy your backend's singular `addressLine` expectation.

### 2. The 2-Step Onboarding Form
*Goal: Remove clutter and improve conversion rates.*
- **Action**: Update `RestaurantPartnerPage.jsx` State Machine structure.
- **Step 4A (Identity Page)**:
   - Image uploader (Large and prominent)
   - Restaurant Name
   - Short Description
   - "Next: Location Setup" Button
- **Step 4B (Location Page)**:
   - Detailed Address Inputs (Building, Street, Landmark, City)
   - The Interactive Map
   - "Finish & Create Restaurant" Button

### 3. Hyper-Responsive Geocoding
*Goal: Make the map feel instantly reactive.*
- **Action**: Reduce the `setTimeout` geocoding debounce in `RestaurantPartnerPage.jsx` from `1200ms` down to `500ms`.
- **Action**: Bind the geocoding triggers to the new `buildingName` and `streetArea` fields so the map cursor moves exactly as they type.

## Verification Plan
1. **Flow Verification**: Refresh the page as an Owner, ensure clicking "Add Location" gracefully starts at "Step 4A: Details" instead of the Map.
2. **Geocoding Speed**: Type an address and verify the map crosshairs jump to the location in less than a second.
3. **Backend Alignment**: Complete the flow and check the backend Database to ensure the granular address fields were successfully combined into the `addressLine` column.
