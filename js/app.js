// ------------------------------------------------------------------------
// Roles and state
// ------------------------------------------------------------------------
const ROLE_RM = "RM";
const ROLE_TAC = "TAC";
const ROLE_QUALITY = "Quality";
const ROLE_ADMIN = "Admin";

let CURRENT_ROLE = ROLE_RM;
let PROJECTS = [];
let SELECTED_PROJECT_ID = null;

// Table & detail references
const tableBody = document.querySelector("#projectsTable tbody");
const detailContent = document.getElementById("detailContent");

// ------------------------------------------------------------------------
// Backend helpers
// ------------------------------------------------------------------------
async function apiLogin(role) {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error("Login failed: " + txt);
  }
}

async function loadProjectsFromBackend() {
  // Apply current filters when fetching
  const term = document.getElementById("searchInput").value.trim();
  const status = document.getElementById("filterStatus").value;
  const model = document.getElementById("filterModel").value;
  const market = document.getElementById("filterMarket").value;

  const params = new URLSearchParams();
  if (term) params.set("q", term);
  if (status !== "ALL") params.set("status", status);
  if (model !== "ALL") params.set("model", model);
  if (market !== "ALL") params.set("market", market);

  const res = await fetch("/api/projects?" + params.toString());
  if (!res.ok) {
    const txt = await res.text();
    console.error("Failed to load projects:", txt);
    return;
  }
  const data = await res.json();
  PROJECTS = data.projects || [];
}

async function backendCreateProject(payload) {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error("Create failed: " + txt);
  }
  return res.json();
}

async function backendUpdateStatus(project_id, newStatus) {
  const res = await fetch(`/api/projects/${project_id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error("Status update failed: " + txt);
  }
  return res.json();
}

async function backendBinSource(source_id, source_type, project_id) {
  const res = await fetch("/api/bin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_id, source_type, project_id }),
  });
  if (res.status === 409) {
    const data = await res.json();
    alert(
      `Source already linked to ${data.existing_project_id} (AC-2).`
    );
    return null;
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error("Bin failed: " + txt);
  }
  return res.json();
}

async function backendLoadAudit(project_id) {
  const res = await fetch(`/api/audit/${project_id}`);
  if (!res.ok) {
    return { events: [] };
  }
  return res.json();
}

// ------------------------------------------------------------------------
// Utility helpers
// ------------------------------------------------------------------------
function statusClass(status) {
  switch (status) {
    case "Containment":
      return "status-containment";
    case "Corrective":
      return "status-corrective";
    case "Closed":
      return "status-closed";
    default:
      return "status-open";
  }
}

function severityClass(sev) {
  return "sev-" + sev;
}

function getProjectById(pid) {
  return PROJECTS.find((p) => p.project_id === pid) || null;
}

// ------------------------------------------------------------------------
// Filters & KPIs (filtered client-side using PROJECTS already loaded)
// ------------------------------------------------------------------------
function getFilteredProjectsFromMemory() {
  const term = document.getElementById("searchInput").value.trim().toLowerCase();
  const statusFilter = document.getElementById("filterStatus").value;
  const modelFilter = document.getElementById("filterModel").value;
  const marketFilter = document.getElementById("filterMarket").value;

  return PROJECTS.filter((p) => {
    const haystack = (
      p.project_id +
      " " +
      (p.vin || "") +
      " " +
      (p.part_no || "") +
      " " +
      (p.title || "")
    ).toLowerCase();
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
  const openCount = filtered.filter((p) => openStatuses.includes(p.status)).length;
  const containmentCount = filtered.filter((p) => p.status === "Containment").length;
  const correctiveCount = filtered.filter((p) => p.status === "Corrective").length;
  const avgBin = filtered.length
    ? Math.round(
        (filtered.reduce((acc, p) => acc + (p.bin_coverage_ratio || 0), 0) /
          filtered.length) *
          100
      )
    : 0;

  document.getElementById("kpiTotal").textContent = total;
  document.getElementById("kpiOpen").textContent = openCount;
  document.getElementById("kpiContainment").textContent = containmentCount;
  document.getElementById("kpiCorrective").textContent = correctiveCount;
  document.getElementById("kpiBinCoverage").textContent = avgBin + "%";
}

function populateFiltersFromProjects() {
  const models = new Set();
  const markets = new Set();
  PROJECTS.forEach((p) => {
    models.add(p.model);
    markets.add(p.market);
  });

  const modelSel = document.getElementById("filterModel");
  const marketSel = document.getElementById("filterMarket");

  // keep the first "ALL" option, remove others
  modelSel.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());
  marketSel.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());

  models.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    modelSel.appendChild(opt);
  });

  markets.forEach((m) => {
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
  rows.forEach((row) => {
    row.classList.toggle("selected", row.dataset.projectId === projectId);
  });
  SELECTED_PROJECT_ID = projectId;
}

function renderTable(filtered) {
  tableBody.innerHTML = "";
  filtered.forEach((p) => {
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
      <td>${(p.sources || []).length}</td>
    `;
    tr.addEventListener("click", () => {
      setSelectedRow(p.project_id);
      renderDetail(p);
    });
    tableBody.appendChild(tr);
  });

  document.getElementById("tableCountText").textContent = `${filtered.length} project(s)`;
}

async function renderAuditSection(project_id) {
  const container = document.getElementById("auditContainer");
  if (!container) return;
  container.textContent = "Loading audit…";

  try {
    const data = await backendLoadAudit(project_id);
    const events = data.events || [];
    if (!events.length) {
      container.innerHTML = "<div class='hint'>No changes recorded yet.</div>";
      return;
    }
    container.innerHTML = `
      <div class="audit-list">
        ${events
          .map(
            (ev) => `
          <div class="audit-item">
            <div><strong>${ev.action}</strong> by ${ev.actor_role}</div>
            <div>${new Date(ev.timestamp).toLocaleString()}</div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  } catch (err) {
    container.innerHTML = "<div class='hint'>Failed to load audit.</div>";
  }
}

function renderDetail(p) {
  if (!p) {
    detailContent.innerHTML =
      "<p class='hint'>Select a project in the table to view details.</p>";
    return;
  }

  const labelsHtml =
    p.labels && p.labels.length
      ? p.labels.map((l) => `<span class="label-chip">${l}</span>`).join("")
      : "<span class='hint'>No labels yet.</span>";

  const sources = p.sources || [];
  const sourcesHtml = sources.length
    ? sources
        .map(
          (s) =>
            `<span class="sources-pill">${s.source_type} ${s.source_id}</span>`
        )
        .join("")
    : "<span class='hint'>No sources linked yet.</span>";

  const canEditWorkflow = [ROLE_TAC, ROLE_QUALITY, ROLE_ADMIN].includes(
    CURRENT_ROLE
  );
  const canBin = [ROLE_TAC, ROLE_QUALITY, ROLE_ADMIN].includes(CURRENT_ROLE);
  const canExport = [ROLE_QUALITY, ROLE_ADMIN].includes(CURRENT_ROLE);

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
      <button id="statusBtn" class="mini-btn" ${
        canEditWorkflow ? "" : "disabled"
      }>Set Status</button>
      ${
        !canEditWorkflow
          ? "<span class='hint'>Only TAC / Quality / Admin can move workflow (AC-3).</span>"
          : ""
      }
    </div>

    <div class="section-title-small">Bin Source (F2 / UR-7)</div>
    <div class="mini-form">
      <input id="binSourceId" class="mini-input" placeholder="Source ID e.g. S12345" />
      <select id="binSourceType" class="mini-select">
        <option value="SSNW">SSNW</option>
        <option value="Warranty">Warranty</option>
        <option value="TAC">TAC</option>
      </select>
      <button id="binBtn" class="mini-btn" ${
        canBin ? "" : "disabled"
      }>Bin → ${p.project_id}</button>
    </div>
    ${
      !canBin
        ? "<div class='hint'>Only TAC / Quality / Admin can bin SSNW/Warranty/TAC to a project.</div>"
        : ""
    }

    <div class="section-title-small">Audit log (UR-11 / SR-11)</div>
    <div id="auditContainer" class="hint">Loading audit…</div>

    <div class="section-title-small">Export portfolio (UR-9 / SR-9)</div>
    <div class="mini-form">
      <button id="exportBtn" class="mini-btn" ${
        canExport ? "" : "disabled"
      }>Download CSV</button>
      ${
        !canExport
          ? "<span class='hint'>Export reserved for Quality / Admin.</span>"
          : ""
      }
    </div>
  `;

  // Hook status
  const statusBtn = document.getElementById("statusBtn");
  if (statusBtn && canEditWorkflow) {
    statusBtn.onclick = async () => {
      const newStatus = document.getElementById("statusSelect").value;
      try {
        const updated = await backendUpdateStatus(p.project_id, newStatus);
        // update local copy
        const idx = PROJECTS.findIndex(
          (x) => x.project_id === updated.project_id
        );
        if (idx >= 0) PROJECTS[idx] = updated;
        refreshAll();
        renderDetail(updated);
      } catch (err) {
        alert(err.message);
      }
    };
  }

  // Hook bin
  const binBtn = document.getElementById("binBtn");
  if (binBtn && canBin) {
    binBtn.onclick = async () => {
      const sid = document.getElementById("binSourceId").value.trim();
      const stype = document.getElementById("binSourceType").value;
      if (!sid) {
        alert("Enter a source ID");
        return;
      }
      try {
        const updated = await backendBinSource(sid, stype, p.project_id);
        if (!updated) return;
        const idx = PROJECTS.findIndex(
          (x) => x.project_id === updated.project_id
        );
        if (idx >= 0) PROJECTS[idx] = updated;
        refreshAll();
        renderDetail(updated);
      } catch (err) {
        alert(err.message);
      }
    };
  }

  // Export
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn && canExport) {
    exportBtn.onclick = () => {
      window.location = "/api/export";
    };
  }

  // Load audit from backend
  renderAuditSection(p.project_id);
}

// ------------------------------------------------------------------------
// Actions
// ------------------------------------------------------------------------
async function createProject() {
  if (![ROLE_TAC, ROLE_QUALITY, ROLE_ADMIN].includes(CURRENT_ROLE)) {
    alert("Only TAC / Quality / Admin can create projects (UR-4).");
    return;
  }

  const title = prompt("Title:");
  if (!title) return;
  const symptom = prompt("Symptom code (e.g. NS-01):") || "";
  const market = prompt("Market (e.g. UK):") || "UK";
  const model = prompt("Model (e.g. MG4):") || "MG4";
  const source_id =
    prompt("Initial source ID (SSNW/Warranty/TAC) – optional:") || "";
  const source_type = source_id
    ? prompt("Source type (SSNW/Warranty/TAC):") || "SSNW"
    : "";

  const payload = {
    title,
    symptom_code: symptom,
    market,
    model,
  };
  if (source_id) {
    payload.source_id = source_id;
    payload.source_type = source_type;
  }

  try {
    const created = await backendCreateProject(payload);
    PROJECTS.push(created);
    populateFiltersFromProjects();
    refreshAll();
    setSelectedRow(created.project_id);
    renderDetail(created);
  } catch (err) {
    alert(err.message);
  }
}

// ------------------------------------------------------------------------
// Role handling
// ------------------------------------------------------------------------
async function updateRole(role) {
  try {
    await apiLogin(role);
  } catch (err) {
    alert(err.message);
    return;
  }
  CURRENT_ROLE = role;
  const info = document.getElementById("roleInfo");
  let desc = "";
  if (role === ROLE_RM)
    desc = "Role: RM – View projects, no workflow / binning.";
  if (role === ROLE_TAC)
    desc = "Role: TAC – Create projects, set Ready, limited workflow.";
  if (role === ROLE_QUALITY)
    desc =
      "Role: Quality – Full edit, workflow, binning, export.";
  if (role === ROLE_ADMIN)
    desc =
      "Role: Admin – Full control; like Quality + config.";
  info.textContent = desc;

  // no need to reload projects when role changes, but we refresh KPIs/permissions
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
async function refreshAll() {
  // Filter is applied in-memory
  const filtered = getFilteredProjectsFromMemory();
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

async function boot() {
  // default to RM on first load
  try {
    await apiLogin(ROLE_RM);
  } catch (err) {
    console.error(err);
  }
  CURRENT_ROLE = ROLE_RM;

  await loadProjectsFromBackend();
  populateFiltersFromProjects();
  refreshAll();

  // wiring
  document.getElementById("searchInput").addEventListener("input", async () => {
    await loadProjectsFromBackend();
    refreshAll();
  });
  document
    .getElementById("filterStatus")
    .addEventListener("change", async () => {
      await loadProjectsFromBackend();
      refreshAll();
    });
  document
    .getElementById("filterModel")
    .addEventListener("change", async () => {
      await loadProjectsFromBackend();
      refreshAll();
    });
  document
    .getElementById("filterMarket")
    .addEventListener("change", async () => {
      await loadProjectsFromBackend();
      refreshAll();
    });

  document
    .getElementById("resetFiltersBtn")
    .addEventListener("click", async () => {
      document.getElementById("searchInput").value = "";
      document.getElementById("filterStatus").value = "ALL";
      document.getElementById("filterModel").value = "ALL";
      document.getElementById("filterMarket").value = "ALL";
      await loadProjectsFromBackend();
      refreshAll();
    });

  document
    .getElementById("roleSelect")
    .addEventListener("change", (e) => {
      updateRole(e.target.value);
    });

  document
    .getElementById("newProjectBtn")
    .addEventListener("click", createProject);
}

window.addEventListener("DOMContentLoaded", boot);
