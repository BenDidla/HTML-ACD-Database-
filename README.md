# HTML-ACD-Database-

# ACD Quality Projects Dashboard (HTML Mock)

This is a **front-end only** mock of the ACD Quality Projects dashboard.

It simulates:

- Projects (ACD000001…)
- 1:1 binning of SSNW / Warranty / TAC source records → projects
- Workflow states (Ready, Active, Containment, Corrective, Monitoring, Closed)
- RBAC by role: RM / TAC / Quality / Admin
- Simple audit log of changes
- CSV portfolio export

All data is stored **in memory in JavaScript** – there is **no backend / database** in this version.

## Files

- `index.html` – main dashboard layout
- `css/styles.css` – dashboard styling
- `js/app.js` – mock “database”, RBAC, binning, workflow, export logic

## Roles & behaviour (mapped to URs)

- **RM**  
  - Can search & view projects (UR-1, UR-3)
  - Cannot create, bin or move workflow

- **TAC**  
  - Can create projects with minimal data (UR-4)
  - Can move status (e.g. set Ready) (UR-5)
  - Can bin sources (UR-7)

- **Quality**  
  - All TAC capabilities
  - Full workflow control (UR-6)
  - Export CSV (UR-9)

- **Admin**  
  - Same as Quality (plus would manage RBAC in a real system) (UR-10)

## How to run

### Option 1 – Open from file (simplest)

1. Clone or download this repo.
2. Open `index.html` in your browser:
   - Double–click it, or
   - Right–click → **Open With** → Chrome / Edge / Firefox

### Option 2 – From PyCharm

1. Open the project folder in **PyCharm**.
2. In the Project view, right–click `index.html`.
3. Select **Open in Browser** → choose your browser.

No Python server is required for this HTML mock.

## Next steps (optional)

This mock is designed so that it can later be wired to:

- A Flask / FastAPI backend (`/api/projects`, `/api/bin`, `/api/export`, `/api/audit`)
- Or a Node/Express backend with the same API shape

The `app.js` logic closely follows the **User Requirements** and **System Requirements** for:

- Search & open (UR-1, SR-1)
- Create project (UR-4)
- Set Ready and workflow changes (UR-5, UR-6)
- Binning with exclusivity (UR-7, SR-7, AC-2)
- Portfolio export (UR-9, SR-9, AC-5)
- Audit log (UR-11, SR-11)
