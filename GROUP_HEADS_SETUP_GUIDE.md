# Group Heads Management Setup Guide

## Overview
The Group Heads feature allows you to organize policies by family groups or corporate entities. Each group head represents a primary customer, and their family members' policies can be tracked together.

## Features
✅ Create and manage group heads (primary customers)
✅ Assign policies to group heads via "Member Of" dropdown
✅ Automatic calculation of total policies and premium amounts
✅ View all policies under each group head
✅ Full CRUD operations (Create, Read, Update, Delete)
✅ Statistics dashboard showing totals

## Database Setup

### Step 1: Run SQL Migrations (IN ORDER)

1. **Create Group Heads Table and Add member_of Column to Policies**
   ```sql
   -- Run: CREATE_GROUP_HEADS_TABLE.sql
   ```
   This creates:
   - `group_heads` table
   - Adds `member_of` column to `policies` table (UUID foreign key)
   - Sets up RLS policies for security
   - Creates indexes for performance

2. **Set up Auto-Update Triggers**
   ```sql
   -- Run: CREATE_GROUP_HEAD_TRIGGERS.sql
   ```
   This automatically updates group head statistics when:
   - New policies are added
   - Policies are updated
   - Policies are deleted

3. **Reload Supabase Schema Cache**
   ```sql
   -- Run: RELOAD_SCHEMA_CACHE.sql
   ```
   OR manually: Supabase Dashboard → Settings → API → "Reload schema cache"

## How to Use

### 1. Create Group Heads
- Navigate to **Group Heads** in the sidebar
- Click **"Add Group Head"**
- Fill in:
  - Group Head Name (e.g., "Dhrumil Patel")
  - Contact Number
  - Email ID
  - Address
  - Relationship Type (Primary, Family Head, Corporate, Business)
  - Notes

### 2. Assign Policies to Group Heads
When adding or editing a policy:
- Find the **"Member Of (Group Head)"** dropdown
- Select the group head (e.g., "Dhrumil Patel")
- The policy will now be linked to that group

### 3. View Group Details
- Go to **Group Heads** page
- Click the **Eye icon** (👁️) next to any group head
- See:
  - Group head contact information
  - Total policies count
  - Total premium amount
  - List of all policies under this group

### 4. Example Usage Scenario

**Family Group: Dhrumil Patel**

1. Create group head "Dhrumil Patel" (father, primary customer)
2. Add policies:
   - **Dhrumil's Health Insurance** → Member Of: Dhrumil Patel
   - **Wife's Health Insurance** → Member Of: Dhrumil Patel
   - **Dhrumil's Car Insurance** → Member Of: Dhrumil Patel
   - **Son's Education Policy** → Member Of: Dhrumil Patel

Now you can:
- View all 4 policies together
- See total premium: ₹45,000
- Track renewals for the entire family
- Generate family-wise reports

## Database Structure

### group_heads Table
```
id                    UUID (Primary Key)
user_id               UUID (References auth.users)
group_head_name       TEXT (e.g., "Dhrumil Patel")
contact_no            TEXT
email_id              TEXT
address               TEXT
relationship_type     TEXT (Primary, Family Head, etc.)
notes                 TEXT
total_policies        INTEGER (auto-calculated)
total_premium_amount  NUMERIC (auto-calculated)
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### policies.member_of
```
member_of             UUID (References group_heads.id)
```

## Key Benefits

1. **Family Policy Management**
   - Track all family members' policies in one place
   - See total family insurance coverage
   - Easy renewal tracking

2. **Corporate Client Management**
   - Group all employee policies under company name
   - Calculate total corporate premiums
   - Simplified reporting

3. **Commission Tracking**
   - View commission earnings per group
   - Analyze high-value customer groups

4. **Automatic Statistics**
   - No manual calculation needed
   - Real-time updates via database triggers
   - Always accurate totals

## Troubleshooting

### Issue: "Member Of" dropdown is empty
**Solution**: Create at least one group head first in the Group Heads page

### Issue: Statistics not updating
**Solution**: 
1. Ensure triggers are installed (run CREATE_GROUP_HEAD_TRIGGERS.sql)
2. Reload schema cache
3. Check that policies have `member_of` value set

### Issue: Can't save policy with group head
**Solution**:
1. Verify `member_of` column exists in policies table
2. Reload schema cache
3. Check foreign key constraint is properly set

## Files Created

✅ `CREATE_GROUP_HEADS_TABLE.sql` - Main database setup
✅ `CREATE_GROUP_HEAD_TRIGGERS.sql` - Auto-update triggers
✅ `src/services/groupHeadService.ts` - Service layer
✅ `src/pages/GroupHeads.tsx` - UI component
✅ Updated `src/App.tsx` - Added route
✅ Updated `src/components/Sidebar.tsx` - Added navigation
✅ Updated `src/pages/AddPolicy.tsx` - Group head dropdown

## Support

For issues or questions, contact support or check the application logs.
