* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #020617;
  --bg-alt: #0b1120;
  --panel: #020617;
  --border: #111827;
  --accent: #38bdf8;
  --accent2: #22c55e;
  --text: #e5e7eb;
  --muted: #9ca3af;
  --muted-dark: #6b7280;
  --danger: #ef4444;
  --warn: #eab308;
}

body {
  font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: radial-gradient(circle at top left, #020617 0, #020617 40%, #000 100%);
  color: var(--text);
  min-height: 100vh;
  display: flex;
}

/* Sidebar */
.sidebar {
  width: 250px;
  background: #020617;
  border-right: 1px solid var(--border);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.logo {
  font-size: 1.4rem;
  font-weight: 600;
  letter-spacing: 0.06em;
}
.logo span {
  color: var(--accent);
}

.nav-section-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted-dark);
  margin-bottom: 6px;
}

.nav-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-item {
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 0.85rem;
  color: var(--muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover {
  background: #020617;
  color: var(--text);
}
.nav-item.active {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: var(--bg);
  font-weight: 600;
}

.sidebar-footer {
  margin-top: auto;
  font-size: 0.7rem;
  color: var(--muted-dark);
}

/* Main */
.main {
  flex: 1;
  padding: 20px 26px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.top-bar-title h1 {
  font-size: 1.5rem;
  font-weight: 600;
}
.top-bar-title p {
  font-size: 0.9rem;
  color: var(--muted);
}

.top-bar-controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}

.input,
.select {
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #020617;
  color: var(--text);
  font-size: 0.85rem;
  outline: none;
  min-width: 120px;
}
.input::placeholder {
  color: var(--muted-dark);
}
.input:focus,
.select:focus {
  border-color: var(--accent);
}

.btn {
  padding: 7px 12px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: var(--bg);
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  white-space: nowrap;
}
.btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-secondary {
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-alt);
  color: var(--muted);
  font-weight: 500;
}
.btn-secondary:hover {
  border-color: var(--accent);
  color: var(--text);
}

/* KPI cards */
.cards {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}
.card {
  position: relative;
  background: radial-gradient(circle at top left, #0f172a, #020617);
  border-radius: 15px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.7);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.card::before {
  content: "";
  position: absolute;
  top: -24px;
  right: -24px;
  width: 50px;
  height: 50px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.28), transparent);
  opacity: 0.7;
}
.card-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted-dark);
}
.card-value {
  font-size: 1.1rem;
  font-weight: 600;
}
.card-subtext {
  font-size: 0.7rem;
  color: var(--muted);
}

/* Layout */
.content-layout {
  display: grid;
  grid-template-columns: 2.1fr 1.4fr;
  gap: 14px;
  align-items: flex-start;
}

.panel {
  background: var(--panel);
  border-radius: 15px;
  border: 1px solid var(--border);
  padding: 12px 14px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.7);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 10px;
}
.panel-title {
  font-size: 0.95rem;
  font-weight: 600;
}
.panel-subtitle {
  font-size: 0.8rem;
  color: var(--muted-dark);
}

/* Table */
.table-wrapper {
  margin-top: 8px;
  max-height: 260px;
  overflow: auto;
  border-radius: 10px;
  border: 1px solid var(--border);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}
thead {
  background: #020617;
  position: sticky;
  top: 0;
  z-index: 1;
}
th,
td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid #0b1120;
  white-space: nowrap;
}
th {
  font-weight: 500;
  color: var(--muted);
  font-size: 0.72rem;
}
tbody tr {
  cursor: pointer;
  transition: background 0.15s;
}
tbody tr:hover {
  background: #020617;
}
tr.selected {
  background: rgba(56, 189, 248, 0.15);
}

.status-pill {
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 500;
  display: inline-block;
}
.status-open {
  background: rgba(56, 189, 248, 0.12);
  color: var(--accent);
}
.status-containment {
  background: rgba(234, 179, 8, 0.12);
  color: var(--warn);
}
.status-corrective {
  background: rgba(34, 197, 94, 0.12);
  color: var(--accent2);
}
.status-closed {
  background: rgba(34, 197, 94, 0.12);
  color: var(--accent2);
}

.severity-pill {
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 0.7rem;
}
.sev-1 {
  background: rgba(248, 113, 113, 0.12);
  color: var(--danger);
}
.sev-2 {
  background: rgba(234, 179, 8, 0.12);
  color: var(--warn);
}
.sev-3 {
  background: rgba(56, 189, 248, 0.12);
  color: var(--accent);
}

/* Detail panel */
.banner {
  padding: 7px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #020617;
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.banner-chip {
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.18);
  font-size: 0.7rem;
}
.detail-id {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 3px;
}
.detail-title {
  font-size: 0.9rem;
  margin-bottom: 5px;
}
.hint {
  font-size: 0.75rem;
  color: var(--muted-dark);
  margin-top: 4px;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 10px;
  font-size: 0.8rem;
  margin: 8px 0;
}
.meta-label {
  font-size: 0.7rem;
  color: var(--muted-dark);
}

.labels-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}
.label-chip {
  padding: 3px 7px;
  border-radius: 999px;
  border: 1px solid #1f2937;
  font-size: 0.7rem;
  color: var(--muted);
}

.section-title-small {
  font-size: 0.78rem;
  color: var(--muted);
  margin-top: 8px;
  margin-bottom: 3px;
}

.sources-list {
  font-size: 0.78rem;
  max-height: 70px;
  overflow: auto;
}
.sources-pill {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px dashed #1f2937;
  font-size: 0.7rem;
  margin: 0 4px 3px 0;
}

/* Mini forms (status, binning, export) */
.mini-form {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  align-items: center;
}
.mini-input {
  padding: 4px 7px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-alt);
  color: var(--text);
  font-size: 0.75rem;
  width: 110px;
}
.mini-select {
  padding: 4px 7px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-alt);
  color: var(--text);
  font-size: 0.75rem;
}
.mini-btn {
  padding: 4px 9px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #020617;
  font-size: 0.75rem;
  cursor: pointer;
}
.mini-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.audit-list {
  max-height: 90px;
  overflow: auto;
  font-size: 0.72rem;
  border-radius: 8px;
  border: 1px solid #1f2937;
  padding: 5px 7px;
}
.audit-item + .audit-item {
  border-top: 1px solid #111827;
  margin-top: 3px;
  padding-top: 3px;
}

@media (max-width: 1100px) {
  .cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .content-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  body {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  .main {
    padding: 14px;
  }
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 540px) {
  .cards {
    grid-template-columns: 1fr;
  }
}

