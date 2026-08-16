## Fix Leave Policy Saving + Employee Leave History

### A. Leave Policy save bug (root cause: client/server shape mismatch)
Client sends `{id, name, yearlyQuota, colorTag}`; server PG expects `{code, totalDays, ...}` → NULL inserted into NOT NULL columns → silent failure, nothing persists. Fixes:
- `server/db.ts`: `ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS color_tag VARCHAR(20) DEFAULT 'blue'`
- `server.ts` leave-policies GET/PUT: map to/from client shape (`yearlyQuota`↔`total_days`, `colorTag`↔`color_tag`, derive `code` from name when missing); PUT deletes policies absent from payload; admin||super_admin role check
- `SettingsView.tsx`: re-sync local policies state when props change (useEffect); unlock editing for Admin AND Super Admin
- `App.tsx` `handleSaveLeavePolicies`: await the API call and show an error toast on failure instead of always-success

### B. Employee Leave History (view/add/edit/correct)
Backend has the same shape mismatch on leave_requests (POST fails, PUT only handles status). Fixes/features:
- `server/db.ts`: add `employee_name VARCHAR(255)` + `manager_comment TEXT` to leave_requests; add `leave_used JSONB` to employees (manual balance adjustments currently never persist)
- `server.ts`: full client-shape mapping on leave-requests GET/POST/PUT (`leaveType`, `totalDays`, `appliedDate`, `employeeName`, `managerComment`); extended PUT edits type/dates/days/reason/status/comment with admin role check; employees GET/PUT persist `leaveUsed`
- `App.tsx`: new `recomputeEmployeeLeaveUsed(employeeId)` — sums approved current-year leave days per type, updates `employee.leaveUsed`, persists to server; called after every record mutation (add/edit/delete/approve/reject) so corrections automatically flow into the total balance (profile overview cards + ApplyLeaveModal already read `leaveUsed`)
- `EmployeeProfileModal.tsx` leave_history tab: "Add Leave Record" button (admin/super_admin), per-row Edit/Delete controls, add/edit modal (type from policies, start/end dates, auto-computed duration, status, reason), status/type filter on the table

### Verification
- `tsc --noEmit` typecheck
- curl: policies PUT persists and GET round-trips; leave-record POST/PUT round-trip; role gating
- Browser: save a policy as admin, edit a leave record, confirm balance updates