// ------------------------------------------------------------------------
// Roles and in-memory "database"
// ------------------------------------------------------------------------
const ROLE_RM = "RM";
const ROLE_TAC = "TAC";
const ROLE_QUALITY = "Quality";
const ROLE_ADMIN = "Admin";

let CURRENT_ROLE = ROLE_RM;
let AUDIT_LOG = []; // {entity_type, entity_id, actor, action, before, after, timestamp}

let PROJECTS = [
  {
    project_id: "ACD000001",
    title: "HV battery contactor weld – MG4 UK",
    description: "Intermittent no-start, DTC P0AA1, contactor weld suspected in cold soak.",
    market: "UK",
    region: "EU",
    model: "MG4",
    platform: "MSP",
    part_no: "12345678",
    vin: "LSJWH4090PN100001",
    symptom_code: "NS-01",
    severity: 1,
    status: "Containment",
    labels: ["HV", "Battery", "Safety", "EV"],
    created_by: "quality.eu",
    created_at: "2025-09-01",
    age_days: 86,
    bin_coverage_ratio: 0.96,
    sources: [
      { source_id: "S12345", source_type: "SSNW" },
      { source_id: "W99887", source_type: "Warranty" }
    ]
  },
  {
    project_id: "ACD000002",
    title: "ICE misfire – HS 1.5T APAC",
    description: "Customer complaints of rough idle and MIL, usually warm restarts.",
    market: "Australia",
    region: "APAC",
    model: "HS",
    platform: "SSA",
    part_no: "87654321",
    vin: "LSJWH4097PN065724",
    symptom_code: "MI-03",
    severity: 2,
    status: "Active",
    labels: ["ICE", "Engine", "Drivability"],
    created_by: "tac.au",
    created_at: "2025-10-10",
    age_days: 47,
    bin_coverage_ratio: 0.84,
    sources: [
      { source_id: "S22334", source_type: "SSNW" },
      { source_id: "W66789", source_type: "Warranty" }
    ]
  },
  {
    project_id: "ACD000003",
    title: "Infotainment freeze – ZS EV EU",
    description: "Screen unresponsive after 30–40 min drive, logs show watchdog reset.",
    market: "Germany",
    region: "EU",
    model: "ZS EV",
    platform: "SSA-EV",
    part_no: "33445566",
    vin: "LSJW74097PZ173546",
    symptom_code: "IF-02",
    severity: 3,
    status: "Corrective",
    labels: ["Software", "HMI"],
    created_by: "quality.eu",
    created_at: "2025-08-18",
    age_days: 100,
    bin_coverage_ratio: 0.92,
    sources: [
      { source_id: "S87342", source_type: "SSNW" }
    ]
  },
  {
    project_id: "ACD000004",
    title: "Water leak – ZS ICE roof antenna",
    description: "Damp headliner around roof antenna in heavy rain.",
    market: "UK",
    region: "EU",
    model: "ZS ICE",
    platform: "SSA",
    part_no: "99887766",
    vin: "LSJWS4095SZ694837",
    symptom_code: "WL-01",
    severity: 2,
    status: "Monitoring",
    labels: ["Body", "Water leak"],
    created_by: "quality.eu",
    created_at: "2025-07-01",
    age_days: 148,
    bin_coverage_ratio: 0.88,
    sources: [
      { source_id: "S44556", source_type: "SSNW" },
      { source_id: "W22446", source_type: "Warranty" }
    ]
  },
  {
    project_id: "ACD000005",
    title: "HV charger communication DTC – MG5 UK",
    description: "Random charge session aborts, EVCC-OBC CAN timeouts.",
    market: "UK",
    region: "EU",
    model: "MG5",
    platform: "SSA-EV",
    part_no: "55667788",
    vin: "LSJWH4095PN078214",
    symptom_code: "CH-04",
    severity: 1,
    status: "Closed",
    labels: ["EVCC", "OBC", "Charging"],
    created_by: "quality.eu",
    created_at: "2025-06-01",
    age_days: 178,
    bin_coverage_ratio: 0.99,
    sources: [
      { source_id: "S99881", source_type: "SSNW" },
      { source_id: "W99001", source_type: "Warranty" },
      { source_id: "T4411", source_type: "TAC" }
    ]
  }
];

let SELECTED_PROJECT_ID = null;

// Table & detail references
const tableBody = document.querySelector("#projectsTable tbody");
const detailContent = document.getElementById("detailContent");

// ------------------------------------------------------------------------
// Utility helpers
// ------------------------------------------------------------------------
function statusClass(status) {
  switch (status) {
    case "Containment": return "status-containment";
    case "Corrective": return "status-corrective";
    case "Closed": return "status-closed";
    default: return "status-open";
  }
}

function severityClass(sev) {
  return "sev-" + sev;
}

function getProjectById(pid) {
  return PROJECTS.find(p => p.project_id === pid) || null;
}

function audit(entity_type, entity_id, action, before, after) {
  AUDIT_LOG.push({
    entity_type,
    entity_id,
    actor: CURRENT_ROLE,
    action,
    before: JSON.stringify(before),
    after: JSON.stringify(after),
    timestamp: new Date().toISOString()
  });
}

// ------------------------------------------------------------------------
// Filters & KPIs
// ------------------------------------------------------------------------
function getFilteredProjects() {
  const term = document.getElementById("searchInput").value.trim().toLowerCase();
  const statusFilter = document.getElementById("filterStatus").value;
  const modelFilter = document.getElementById("filterModel").value;
  const marketFilter = document.getElementById("filterMarket").value;

  return PROJECTS.filter(p => {
    const haystack = (p.project_id + " " + (p.vin || "") + " " + (p.part_no || "") + " " + (p.title || "")).toLowerCase();
    if (term && !haystack.includes(term)) return false;
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (modelFilter !== "ALL" && p.model !== modelFilter) return false;
    if (marketFilter !== "ALL" && p.market !== marketFilter) return false;
    return true;
  });
}

function updateKpis(filtered) {
  const total = filtered.length;
  const openStatuses = ["Ready", "Active", "Containment", "Corrective", "Monitoring"];
  const openCount = filtered.filter(p => openStatuses.includes(p.status)).length;
  const containmentCount = filtered.filter(p => p.status === "Containment").length;
  const correctiveCount = filtered.filter(p => p.status === "Corrective").length;
  const avgBin = filtered.length
    ? Math.round(filtered.reduce((acc, p) => acc + (p.bin_coverage_ratio || 0), 0) / filtered.length * 100)
    : 0;

  document.getElementById("kpiTotal").textContent = total;
  document.getElementById("kpiOpen").textContent = openCount;
  document.getElementById("kpiContainment").textContent = containmentCount;
  document.getElementById("kpiCorrective").textContent = correctiveCount;
  document.getElementById("kpiBinCoverage").textContent = avgBin + "%";
}

function populateFilters() {
  const models = new Set();
  const markets = new Set();
  PROJECTS.forEach(p => {
    models.add(p.model);
    markets.add(p.market);
  });

  const modelSel = document.getElementById("filterModel");
  const marketSel = document.getElementById("filterMarket");

  models.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    modelSel.appendChild(opt);
  });

  markets.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    marketSel.appendChild(opt);
  });
}

// ------------------------------------------------------------------------
// Table & detail rendering
// ------------------------------------------------------------------------
function setSelectedRow(projectId) {
  const rows = tableBody.querySelectorAll("tr");
  rows.forEach(row => {
    row.classList.toggle("selected", row.dataset.projectId === projectId);
  });
  SELECTED_PROJECT_ID = projectId;
}

function renderTable(filtered) {
  tableBody.innerHTML = "";
  filtered.forEach(p => {
    const tr = document.createElement("tr");
    tr.dataset.projectId = p.project_id;
    tr.innerHTML = `
      <td>${p.project_id}</td>
      <td title="${p.description || ""}">${p.title}</td>
      <td>${p.model}</td>
      <td>${p.market}</td>
      <td><span class="status-pill ${statusClass(p.status)}">${p.status}</span></td>
      <td><span class="severity-pill ${severityClass(p.severity)}">S${p.severity}</span></td>
      <td>${p.age_days}</td>
      <td>${p.sources.length}</td>
    `;
    tr.addEventListener("click", () => {
      setSelectedRow(p.project_id);
      renderDetail(p);
    });
    tableBody.appendChild(tr);
  });

  document.getElementById("tableCountText").textContent = `${filtered.length} project(s)`;
}

function renderAudit(project_id) {
  const evs = AUDIT_LOG
    .filter(e => e.entity_id === project_id && e.entity_type === "Project")
    .slice()
    .reverse();

  if (!evs.length) {
    return "<div class='hint'>No changes recorded yet (mock).</div>";
  }

  return `
    <div class="audit-list">
      ${evs.map(ev => `
        <div class="audit-item">
          <div><strong>${ev.action}</strong> by ${ev.actor}</div>
          <div>${new Date(ev.timestamp).toLocaleString()}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderDetail(p) {
  if (!p) {
    detailContent.innerHTML = "<p class='hint'>Select a project in the table to view details.</p>";
    return;
  }

  const labelsHtml = p.labels && p.labels.length
    ? p.labels.map(l => `<span class="label-chip">${l}</span>`).join("")
    : "<span class='hint'>No labels yet.</span>";

  const sourcesHtml = p.sources && p.sources.length
    ? p.sources.map(s => `<span class="sources-pill">${s.source_type} ${s.source_id}</span>`).join("")
    : "<span class='hint'>No sources linked yet.</span>";

  const canEditWorkflow = [ROLE_TAC, ROLE_QUALITY, ROLE_ADMIN].includes(CURRENT_ROLE);
  const canBin = [ROLE_TAC, ROLE_QUALITY, ROLE_ADMIN].includes(CURRENT_ROLE);
  const canExport = [ROLE_QUALITY, ROLE_ADMIN].includes(CURRENT_ROLE);

  const auditHtml = renderAudit(p.project_id);

  detailContent.innerHTML = `
    <div class="banner">
      <span>${p.status}</span>
      <span class="banner-chip">S${p.severity}</span>
      <span class="banner-chip">${p.model} · ${p.market}</span>
    </div>
    <div class="detail-id">${p.project_id}</div>
    <div class="detail-title">${p.title}</div>
    <p class="hint">${p.description || ""}</p>

    <div class="meta-grid">
      <div>
        <div class="meta-label">Market / Region</div>
        <div>${p.market} · ${p.region || "-"}</div>
      </div>
      <div>
        <div class="meta-label">Platform</div>
        <div>${p.platform || "-"}</div>
      </div>
      <div>
        <div class="meta-label">Part / Symptom</div>
        <div>${p.part_no || "-"} · ${p.symptom_code || "-"}</div>
      </div>
      <div>
        <div class="meta-label">Age / Created</div>
        <div>${p.age_days} days · ${p.created_at}</div>
      </div>
    </div>

    <div class="section-title-small">Labels</div>
    <div class="labels-row">${labelsHtml}</div>

    <div class="section-title-small">Linked sources (1:1 binning)</div>
    <div class="sources-list">${sourcesHtml}</div>

    <div class="section-title-small">Workflow (F3 / UR-6)</div>
    <div class="mini-form">
      <select id="statusSelect" class="mini-select">
        <option value="Ready">Ready</option>
        <option value="Active">Active</option>
        <option value="Containment">Containment</option>
        <option value="Corrective">Corrective</option>
        <option value="Monitoring">Monitoring</option>
        <option value="Closed">Closed</option>
      </select>
      <button id="statusBtn" class="mini-btn" ${canEditWorkflow ? "" : "disabled"}>Set Status</button>
      ${!canEditWorkflow ? "<span class='hint'>Only TAC / Quality / Admin can move workflow (AC-3).</span>" : ""}
    </div>

    <div class="section-title-small">Bin Source (F2 / UR-7)</div>
    <div class="mini-form">
      <input id="binSourceId" class="mini-input" placeholder="Source ID e.g. S12345" />
      <select id="binSourceType" class="mini-select">
        <option value="SSNW">SSNW</option>
        <option value="Warranty">Warranty</option>
        <option value="TAC">TAC</option>
      </select>
      <button id="binBtn" class="mini-btn" ${canBin ? "" : "disabled"}>Bin → ${p.project_id}</button>
    </div>
    ${!canBin ? "<div class='hint'>Only TAC / Quality / Admin can bin SSNW/Warranty/TAC to a project.</div>" : ""}

    <div class="section-title-small">Audit log (UR-11 / SR-11)</div>
    ${auditHtml}

    <div class="section-title-small">Export portfolio (UR-9 / SR-9)</div>
    <div class="mini-form">
      <button id="exportBtn" class="mini-btn" ${canExport ? "" : "disabled"}>Download CSV (mock)</button>
      ${!canExport ? "<span class='hint'>Export reserved for Quality / Admin.</span>" : ""}
    </div>
  `;

  // Status button
  const statusBtn = document.getElementById("statusBtn");
  if (statusBtn && canEditWorkflow) {
    statusBtn.onclick = () => {
      const newStatus = document.getElementById("statusSelect").value;
      updateStatus(p.project_id, newStatus);
    };
  }

  // Bin button
  const binBtn = document.getElementById("binBtn");
  if (binBtn && canBin) {
    binBtn.onclick = () => {
      const sid = document.getElementById("binSourceId").value.trim();
      const stype = document.getElementById("binSourceType").value;
      if (!sid) {
        alert("Enter a source ID");
        return;
      }
      binSource(sid, stype, p.project_id);
    };
  }

  // Export button
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn && canExport) {
    exportBtn.onclick = () => exportCsv();
  }
}

// ------------------------------------------------------------------------
// Actions
// ------------------------------------------------------------------------
function updateStatus(project_id, newStatus) {
  if (!["Ready", "Active", "Containment", "Corrective", "Monitoring", "Closed"].includes(newStatus)) {
    alert("Invalid status");
    return;
  }
  const p = getProjectById(project_id);
  if (!p) return;
  const before = { ...p };
  p.status = newStatus;
  audit("Project", project_id, "UPDATE_STATUS", before, p);
  refreshAll();
  renderDetail(getProjectById(project_id));
}

function binSource(source_id, source_type, project_id) {
  // enforce 1 source → 1 project (SR-7 / AC-2)
  for (const p of PROJECTS) {
    for (const s of p.sources) {
      if (s.source_id === source_id && s.source_type === source_type) {
        if (p.project_id !== project_id) {
          alert(`Source already linked to ${p.project_id} (AC-2).`);
          return;
        }
      }
    }
  }
  const p = getProjectById(project_id);
  if (!p) return;
  const before = { ...p };
  p.sources.push({ source_id, source_type });
  p.bin_coverage_ratio = Math.min(1, p.bin_coverage_ratio + 0.02);
  audit("Project", project_id, "BIN_SOURCE", before, p);
  refreshAll();
  renderDetail(p);
}

function generateProjectId() {
  const ids = PROJECTS.map(p => Number(p.project_id.replace("ACD", "")));
  const max = ids.length ? Math.max(...ids) : 0;
  const next = max + 1;
  return "ACD" + next.toString().padStart(6, "0");
}

function createProject() {
  if (![ROLE_TAC, ROLE_QUALITY, ROLE_ADMIN].includes(CURRENT_ROLE)) {
    alert("Only TAC / Quality / Admin can create projects (UR-4).");
    return;
  }
  const title = prompt("Title:");
  if (!title) return;
  const symptom = prompt("Symptom code (e.g. NS-01):") || "";
  const market = prompt("Market (e.g. UK):") || "UK";
  const model = prompt("Model (e.g. MG4):") || "MG4";
  const source_id = prompt("Initial source ID (SSNW/Warranty/TAC):") || "";
  const source_type = prompt("Source type (SSNW/Warranty/TAC):") || "SSNW";

  const pid = generateProjectId();
  const proj = {
    project_id: pid,
    title,
    description: "",
    market,
    region: "EU",
    model,
    platform: "",
    part_no: "",
    vin: "",
    symptom_code: symptom,
    severity: 3,
    status: "Ready",
    labels: [],
    created_by: CURRENT_ROLE,
    created_at: new Date().toISOString().slice(0, 10),
    age_days: 0,
    bin_coverage_ratio: source_id ? 0.2 : 0,
    sources: source_id ? [{ source_id, source_type }] : []
  };
  PROJECTS.push(proj);
  audit("Project", pid, "CREATE", {}, proj);
  populateFilters();
  refreshAll();
  setSelectedRow(pid);
  renderDetail(proj);
}

function exportCsv() {
  const filtered = getFilteredProjects();
  const lines = ["project_id,title,market,model,status,severity,created_at,vin,part_no"];
  filtered.forEach(p => {
    const line = [
      p.project_id,
      (p.title || "").replace(/,/g, " "),
      p.market || "",
      p.model || "",
      p.status || "",
      p.severity,
      p.created_at || "",
      p.vin || "",
      p.part_no || ""
    ].join(",");
    lines.push(line);
  });
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "projects.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ------------------------------------------------------------------------
// Role handling
// ------------------------------------------------------------------------
function updateRole(role) {
  CURRENT_ROLE = role;
  const info = document.getElementById("roleInfo");
  let desc = "";
  if (role === ROLE_RM) desc = "Role: RM – View projects, no workflow / binning.";
  if (role === ROLE_TAC) desc = "Role: TAC – Create projects, set Ready, limited workflow.";
  if (role === ROLE_QUALITY) desc = "Role: Quality – Full edit, workflow, binning, export.";
  if (role === ROLE_ADMIN) desc = "Role: Admin – Full control; like Quality + config.";
  info.textContent = desc;
  refreshAll();
  if (SELECTED_PROJECT_ID) {
    const p = getProjectById(SELECTED_PROJECT_ID);
    renderDetail(p);
  } else {
    renderDetail(null);
  }
}

// ------------------------------------------------------------------------
// Global refresh & boot
// ------------------------------------------------------------------------
function refreshAll() {
  const filtered = getFilteredProjects();
  updateKpis(filtered);
  renderTable(filtered);

  if (filtered.length && !SELECTED_PROJECT_ID) {
    setSelectedRow(filtered[0].project_id);
    renderDetail(filtered[0]);
  }
  if (!filtered.length) {
    SELECTED_PROJECT_ID = null;
    renderDetail(null);
  }
}

function boot() {
  populateFilters();
  refreshAll();

  document.getElementById("searchInput").addEventListener("input", refreshAll);
  document.getElementById("filterStatus").addEventListener("change", refreshAll);
  document.getElementById("filterModel").addEventListener("change", refreshAll);
  document.getElementById("filterMarket").addEventListener("change", refreshAll);

  document.getElementById("resetFiltersBtn").addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    document.getElementById("filterStatus").value = "ALL";
    document.getElementById("filterModel").value = "ALL";
    document.getElementById("filterMarket").value = "ALL";
    refreshAll();
  });

  document.getElementById("roleSelect").addEventListener("change", e => {
    updateRole(e.target.value);
  });

  document.getElementById("newProjectBtn").addEventListener("click", createProject);
}

window.addEventListener("DOMContentLoaded", boot);

