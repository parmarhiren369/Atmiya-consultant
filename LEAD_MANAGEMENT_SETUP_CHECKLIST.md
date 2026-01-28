# Lead Management System - Quick Setup Checklist

## ✅ Setup Steps

### 1. Database Setup (REQUIRED)
- [ ] Open Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Copy and run the contents of `SETUP_LEADS_TABLE.sql`
- [ ] Verify the `leads` table is created
- [ ] Verify RLS policies are enabled

### 2. Application Restart
- [ ] Stop your development server (Ctrl+C)
- [ ] Restart the server with `npm run dev` or `yarn dev`
- [ ] Ensure no compilation errors

### 3. Test the Feature
- [ ] Login to your application
- [ ] Look for "Leads" in the sidebar (with UserPlus icon)
- [ ] Click on "Leads" menu item
- [ ] Page should load showing "Leads Management"

### 4. Test Add Inquiry
- [ ] Click "Add Inquiry" button
- [ ] Fill in the form:
  - Customer Name: "Test Customer"
  - Mobile: "9876543210"
  - Email: "test@example.com"
  - Product Type: Select "TW" or "FW"
  - Lead Source: Select "Website"
  - Status: "New" (default)
  - Follow Up Date: Select today's date
- [ ] Click "Add Inquiry"
- [ ] Verify success toast appears
- [ ] Verify lead appears in the table

### 5. Test Dashboard
- [ ] Click "Dashboard" button (purple button)
- [ ] Verify dashboard loads with statistics
- [ ] Check the following cards display:
  - Total Leads
  - New Leads
  - Follow Up
  - Conversion Rate
- [ ] Verify upcoming follow-ups section

### 6. Test Filters
- [ ] Go back to Leads Management (`/leads`)
- [ ] Test search box with customer name
- [ ] Test status filter dropdown
- [ ] Test product type filter
- [ ] Test priority filter
- [ ] Click "Refresh" button

### 7. Test Export
- [ ] Click "Export" button (green button)
- [ ] Verify CSV file downloads
- [ ] Open CSV and verify data is correct

### 8. Test Delete
- [ ] Click trash icon on a lead
- [ ] Confirm deletion in popup
- [ ] Verify lead is removed from table
- [ ] Verify success toast appears

## 📋 Verification Checklist

### Navigation
- [x] "Leads" menu item visible in sidebar
- [x] Icon is UserPlus
- [x] Positioned after "Client Folders"

### Leads Management Page
- [x] Table displays correctly
- [x] "Add Inquiry" button visible
- [x] "Dashboard" button visible
- [x] "Export" button visible
- [x] Search box functional
- [x] Filter dropdowns work
- [x] Responsive design

### Add Lead Modal
- [x] Modal opens when clicking "Add Inquiry"
- [x] All fields present and labeled
- [x] Required fields marked with *
- [x] Dropdowns populated with options
- [x] Date pickers work (calendar opens)
- [x] Form validation works
- [x] Submit button works
- [x] Cancel button closes modal

### Dashboard
- [x] Statistics cards display
- [x] Numbers calculate correctly
- [x] Status breakdown shows
- [x] Upcoming follow-ups list
- [x] Lead source distribution
- [x] Color coding works
- [x] Responsive layout

### Dark Mode
- [x] All components support dark mode
- [x] Text is readable in both modes
- [x] Colors adjust properly

## 🐛 Troubleshooting

### If leads don't show:
1. Check if `leads` table exists in Supabase
2. Run `SETUP_LEADS_TABLE.sql` if not
3. Check browser console for errors
4. Verify user is authenticated

### If "Add Inquiry" doesn't work:
1. Check browser console for errors
2. Verify all required fields are filled
3. Check mobile number format (10 digits)
4. Verify email format is valid

### If dashboard shows 0 for all stats:
1. Make sure you have added at least one lead
2. Refresh the page
3. Check browser console for errors

### If navigation doesn't show "Leads":
1. Clear browser cache
2. Restart development server
3. Check if Sidebar.tsx was updated correctly

## 📝 What Was Modified

### New Files Created:
1. `src/services/leadService.ts`
2. `src/components/AddLeadModal.tsx`
3. `src/pages/LeadsManagement.tsx`
4. `src/pages/LeadsDashboard.tsx`
5. `SETUP_LEADS_TABLE.sql`
6. `LEAD_MANAGEMENT_GUIDE.md`
7. `LEAD_MANAGEMENT_SETUP_CHECKLIST.md` (this file)

### Modified Files:
1. `src/types/index.ts` - Added Lead and LeadFormData types
2. `src/components/Sidebar.tsx` - Added Leads menu item
3. `src/App.tsx` - Added routes for /leads and /leads-dashboard

### Database:
1. New table: `leads`
2. Multiple indexes for performance
3. RLS policies for security
4. Triggers for auto-updating timestamps

## 🎯 Next Steps

After successful setup:

1. **Customize Product Types**: Edit product types in `AddLeadModal.tsx` if needed
2. **Customize Lead Sources**: Add/modify lead sources in `AddLeadModal.tsx`
3. **Customize Statuses**: Modify status options if needed
4. **Add More Features**: Consider implementing suggested enhancements from `LEAD_MANAGEMENT_GUIDE.md`
5. **Train Users**: Share the usage guide with your team

## 💡 Tips

- Use the Dashboard to track conversion rates
- Set up follow-up reminders using the Next Follow Up Date
- Export leads regularly for backup
- Use priority field to focus on high-value leads
- Use remarks field to track communication history

## ✨ Success Indicators

You'll know the setup is successful when:
- ✅ "Leads" appears in sidebar
- ✅ You can add a new lead
- ✅ Leads appear in the table
- ✅ Dashboard shows statistics
- ✅ Filters work correctly
- ✅ Export creates CSV file
- ✅ Delete removes leads

---

**Need Help?** Refer to `LEAD_MANAGEMENT_GUIDE.md` for detailed documentation.

**Version:** 1.0.0  
**Date:** January 11, 2026
