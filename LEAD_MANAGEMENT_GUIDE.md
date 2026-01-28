# Lead Management System - Implementation Guide

## Overview
A comprehensive Lead Management System has been implemented to track and manage customer inquiries and leads. This system includes a leads table, dashboard with analytics, and a full CRUD interface.

## Features Implemented

### 1. Lead Data Structure
- **Customer Information**
  - Customer Name
  - Customer Mobile Number
  - Customer Email
  
- **Lead Details**
  - Product Type (TW, FW, Health, Life, Term, Travel, Home, Fire, Marine, Other)
  - Lead Source (Website, Referral, Social Media, Cold Call, Email Campaign, Advertisement, Walk-in, Partner, Other)
  - Status (New, Contacted, Qualified, Proposal Sent, Follow Up, Negotiation, Won, Lost, Canceled)
  - Priority (Low, Medium, High)
  
- **Follow-up Management**
  - Follow Up Date
  - Next Follow Up Date (with calendar picker)
  
- **Additional Fields**
  - Estimated Value (₹)
  - Remark/Notes
  - Conversion tracking (converted to policy)

### 2. Pages Created

#### a) Leads Management Page (`/leads`)
- **Location**: `src/pages/LeadsManagement.tsx`
- **Features**:
  - Comprehensive table view of all leads
  - Add Inquiry button to create new leads
  - Advanced filtering by:
    - Search (name, mobile, email, product)
    - Status filter
    - Product type filter
    - Priority filter
  - Export to CSV functionality
  - Real-time lead statistics
  - Quick actions (Delete)
  - Link to dashboard view
  - Responsive design

#### b) Leads Dashboard Page (`/leads-dashboard`)
- **Location**: `src/pages/LeadsDashboard.tsx`
- **Features**:
  - Statistical overview cards:
    - Total Leads
    - New Leads
    - Follow Up count
    - Conversion Rate
  - Status breakdown (Won, Lost, Total Value)
  - Upcoming follow-ups section with overdue indicators
  - Lead source distribution chart
  - Visual analytics with color-coded status and priority badges

### 3. Components Created

#### Add Lead Modal (`src/components/AddLeadModal.tsx`)
- **Features**:
  - Full form with all required fields
  - Dropdown selections for Product Type, Status, Lead Source, Priority
  - Calendar date pickers for follow-up dates
  - Text area for remarks
  - Input validation (email, mobile number format)
  - Responsive modal design
  - Dark mode support

### 4. Service Layer

#### Lead Service (`src/services/leadService.ts`)
- **CRUD Operations**:
  - `getLeads(userId)` - Fetch all leads for a user
  - `getLeadById(id)` - Get single lead details
  - `createLead(data, userId, userName)` - Create new lead
  - `updateLead(id, data, userId, userName)` - Update lead
  - `deleteLead(id, userId, userName)` - Delete lead
  
- **Advanced Queries**:
  - `getLeadsByStatus(status, userId)` - Filter by status
  - `getUpcomingFollowUps(userId, days)` - Get leads with upcoming follow-ups
  - `getLeadStatistics(userId)` - Calculate statistics
  - `convertLeadToPolicy(leadId, policyId)` - Mark lead as converted

- **Activity Logging**: All operations are logged in the activity log

### 5. Database Setup

#### Table: `leads`
Run the SQL file: `SETUP_LEADS_TABLE.sql` in your Supabase SQL editor

**Columns**:
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to auth.users)
- `customer_name` (TEXT)
- `customer_mobile` (TEXT)
- `customer_email` (TEXT)
- `product_type` (TEXT)
- `follow_up_date` (TIMESTAMP)
- `status` (TEXT with constraints)
- `lead_source` (TEXT)
- `remark` (TEXT, nullable)
- `next_follow_up_date` (TIMESTAMP, nullable)
- `priority` (TEXT, default: 'medium')
- `estimated_value` (NUMERIC, nullable)
- `assigned_to` (UUID, nullable)
- `assigned_to_name` (TEXT, nullable)
- `converted_to_policy_id` (UUID, nullable)
- `is_converted` (BOOLEAN, default: false)
- `created_at` (TIMESTAMP, auto)
- `updated_at` (TIMESTAMP, auto with trigger)

**Indexes**: Created for optimal query performance on frequently searched columns

**RLS Policies**: Users can only access their own leads

### 6. Navigation

#### Sidebar Update
- Added "Leads" menu item with UserPlus icon
- Positioned after "Client Folders" in the navigation
- Accessible to all authenticated users

#### Routes Added
- `/leads` - Main leads management page with table
- `/leads-dashboard` - Analytics dashboard for leads

### 7. TypeScript Types

Added to `src/types/index.ts`:
- `Lead` interface - Full lead data structure
- `LeadFormData` interface - Form submission data

## Setup Instructions

### 1. Database Setup
```sql
-- Run the SQL file in Supabase SQL Editor
-- File: SETUP_LEADS_TABLE.sql
```

### 2. Verify Installation
1. Restart your development server
2. Login to your application
3. Look for "Leads" in the sidebar
4. Click to open Leads Management page

### 3. Test the Feature
1. Click "Add Inquiry" button
2. Fill in the form with test data
3. Submit and verify the lead appears in the table
4. Navigate to "Dashboard" button to view analytics
5. Test filters and search functionality
6. Export leads to CSV

## Usage Guide

### Adding a Lead
1. Navigate to `/leads`
2. Click "Add Inquiry" button
3. Fill in all required fields (marked with *)
4. Optionally add priority, estimated value, and remarks
5. Set follow-up dates
6. Click "Add Inquiry"

### Managing Leads
- **Search**: Use search bar to find leads by name, mobile, email, or product
- **Filter**: Apply status, product type, or priority filters
- **Export**: Click "Export" to download filtered leads as CSV
- **Delete**: Click trash icon to remove a lead (with confirmation)
- **View Dashboard**: Click "Dashboard" button to see analytics

### Dashboard Features
- View key metrics at a glance
- Track conversion rates
- Monitor upcoming follow-ups
- Identify overdue follow-ups (marked in red)
- Analyze lead sources

## Data Flow

```
User Action → Component → Service Layer → Supabase → Database
                ↓                              ↓
         Update UI ← Transform Data ← Response
```

## Security

- **Row Level Security (RLS)**: Enabled on leads table
- **User Isolation**: Users can only see their own leads
- **Activity Logging**: All changes are tracked
- **Input Validation**: Client-side and database constraints

## Performance Optimizations

- Database indexes on frequently queried columns
- Efficient filtering on client side
- Lazy loading for large datasets
- Optimized SQL queries

## Future Enhancements (Suggestions)

1. **Lead Assignment**: Assign leads to team members
2. **Email Integration**: Send follow-up emails directly
3. **SMS Reminders**: Automated SMS for follow-ups
4. **Lead Scoring**: Automatic scoring based on engagement
5. **Pipeline View**: Kanban-style lead pipeline
6. **Advanced Analytics**: More detailed charts and reports
7. **Lead Import**: Bulk import from Excel/CSV
8. **Communication History**: Track all interactions with lead
9. **Lead Conversion Wizard**: Guided flow to convert lead to policy
10. **Reminders Integration**: Auto-create reminders for follow-ups

## Troubleshooting

### Issue: Leads not showing
- Verify database table is created
- Check RLS policies are enabled
- Ensure user is authenticated
- Check browser console for errors

### Issue: Cannot add leads
- Verify required fields are filled
- Check mobile number format (10 digits)
- Verify email format
- Check database permissions

### Issue: Dashboard not loading
- Verify leads exist in database
- Check service functions are working
- Review browser console for errors

## File Structure

```
src/
├── components/
│   └── AddLeadModal.tsx          # Modal for adding/editing leads
├── pages/
│   ├── LeadsManagement.tsx       # Main leads table page
│   └── LeadsDashboard.tsx        # Analytics dashboard
├── services/
│   └── leadService.ts            # Lead CRUD operations
├── types/
│   └── index.ts                  # Lead TypeScript types
└── App.tsx                       # Routes configuration

SETUP_LEADS_TABLE.sql             # Database setup script
```

## Technology Stack

- **Frontend**: React + TypeScript
- **UI Framework**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **State Management**: React Hooks
- **Routing**: React Router v6
- **Notifications**: React Hot Toast
- **Date Handling**: Native JavaScript Date

## Support

If you encounter any issues or need modifications, refer to:
1. This README file
2. Component code comments
3. Service layer documentation
4. Supabase documentation

---

**Status**: ✅ Fully Implemented and Ready to Use
**Version**: 1.0.0
**Last Updated**: January 11, 2026
