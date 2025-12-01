from __future__ import annotations
python
from datetime import datetime
from functools import wraps

from flask import (
    Flask,
    jsonify,
    request,
    session,
    abort,
)
from flask_sqlalchemy import SQLAlchemy

# ---------------------------------------------------------------------
# Flask + DB setup
# ---------------------------------------------------------------------

# static_folder='.' serves index.html, css/, js/ directly
app = Flask(__name__, static_folder=".", static_url_path="")
app.config["SECRET_KEY"] = "CHANGE_ME_IN_REAL_LIFE"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///acd.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


# ---------------------------------------------------------------------
# Models: Project, SourceLink, AuditEvent
# ---------------------------------------------------------------------

class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.String(16), unique=True, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    market = db.Column(db.String(64), nullable=False)
    region = db.Column(db.String(64), nullable=True)
    model = db.Column(db.String(64), nullable=False)
    platform = db.Column(db.String(64), nullable=True)
    part_no = db.Column(db.String(64), nullable=True)
    vin = db.Column(db.String(64), nullable=True)
    symptom_code = db.Column(db.String(64), nullable=True)
    severity = db.Column(db.Integer, nullable=False, default=3)
    status = db.Column(db.String(32), nullable=False, default="Ready")
    labels = db.Column(db.String(255), nullable=True)  # comma-separated
    created_by = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    bin_coverage_ratio = db.Column(db.Float, nullable=False, default=0.0)

    def to_dict(self):
        return {
            "project_id": self.project_id,
            "title": self.title,
            "description": self.description,
            "market": self.market,
            "region": self.region,
            "model": self.model,
            "platform": self.platform,
            "part_no": self.part_no,
            "vin": self.vin,
            "symptom_code": self.symptom_code,
            "severity": self.severity,
            "status": self.status,
            "labels": self.labels.split(",") if self.labels else [],
            "created_by": self.created_by,
            "created_at": self.created_at.date().isoformat(),
            "age_days": (datetime.utcnow().date() - self.created_at.date()).days,
            "bin_coverage_ratio": self.bin_coverage_ratio,
            "sources": [s.to_dict() for s in self.sources],
        }


class SourceLink(db.Model):
    __tablename__ = "source_links"

    id = db.Column(db.Integer, primary_key=True)
    source_id = db.Column(db.String(64), nullable=False)
    source_type = db.Column(db.String(32), nullable=False)  # SSNW | Warranty | TAC
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    linked_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    linked_by = db.Column(db.String(64), nullable=True)

    project = db.relationship("Project", backref=db.backref("sources", lazy="dynamic"))

    __table_args__ = (
        # enforce 1 source → 1 project (SR-7 / AC-2)
        db.UniqueConstraint("source_id", "source_type", name="uq_source_unique"),
    )

    def to_dict(self):
        return {
            "source_id": self.source_id,
            "source_type": self.source_type,
        }


class AuditEvent(db.Model):
    __tablename__ = "audit_events"

    id = db.Column(db.Integer, primary_key=True)
    entity_type = db.Column(db.String(64), nullable=False)  # Project, SourceLink
    entity_id = db.Column(db.String(64), nullable=False)    # project_id or source key
    actor_role = db.Column(db.String(32), nullable=False)
    action = db.Column(db.String(64), nullable=False)
    before = db.Column(db.Text, nullable=True)
    after = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "actor_role": self.actor_role,
            "action": self.action,
            "before": self.before,
            "after": self.after,
            "timestamp": self.timestamp.isoformat(),
        }


# ---------------------------------------------------------------------
# RBAC helpers (session stores current role)
# ---------------------------------------------------------------------

ROLE_RM = "RM"
ROLE_TAC = "TAC"
ROLE_QUALITY = "Quality"
ROLE_ADMIN = "Admin"


def current_role() -> str:
    return session.get("role", ROLE_RM)


def require_role(allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            role = current_role()
            if role not in allowed_roles:
                abort(403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def audit(entity_type: str, entity_id: str, action: str, before: str, after: str):
    ev = AuditEvent(
        entity_type=entity_type,
        entity_id=entity_id,
        actor_role=current_role(),
        action=action,
        before=before,
        after=after,
    )
    db.session.add(ev)
    db.session.commit()


# ---------------------------------------------------------------------
# Init DB with seed data (one time on first request)
# ---------------------------------------------------------------------

def seed_if_empty():
    if Project.query.count() > 0:
        return

    # Seed a couple of projects matching your HTML mock
    p1 = Project(
        project_id="ACD000001",
        title="HV battery contactor weld – MG4 UK",
        description="Intermittent no-start, DTC P0AA1, contactor weld suspected in cold soak.",
        market="UK",
        region="EU",
        model="MG4",
        platform="MSP",
        part_no="12345678",
        vin="LSJWH4090PN100001",
        symptom_code="NS-01",
        severity=1,
        status="Containment",
        labels="HV,Battery,Safety,EV",
        created_by="quality.eu",
        created_at=datetime(2025, 9, 1),
        bin_coverage_ratio=0.96,
    )
    db.session.add(p1)
    db.session.flush()
    db.session.add(SourceLink(source_id="S12345", source_type="SSNW", project_id=p1.id))
    db.session.add(SourceLink(source_id="W99887", source_type="Warranty", project_id=p1.id))

    p2 = Project(
        project_id="ACD000002",
        title="ICE misfire – HS 1.5T APAC",
        description="Customer complaints of rough idle and MIL, usually warm restarts.",
        market="Australia",
        region="APAC",
        model="HS",
        platform="SSA",
        part_no="87654321",
        vin="LSJWH4097PN065724",
        symptom_code="MI-03",
        severity=2,
        status="Active",
        labels="ICE,Engine,Drivability",
        created_by="tac.au",
        created_at=datetime(2025, 10, 10),
        bin_coverage_ratio=0.84,
    )
    db.session.add(p2)
    db.session.flush()
    db.session.add(SourceLink(source_id="S22334", source_type="SSNW", project_id=p2.id))
    db.session.add(SourceLink(source_id="W66789", source_type="Warranty", project_id=p2.id))

    db.session.commit()


@app.before_first_request
def init_db():
    db.create_all()
    seed_if_empty()


# ---------------------------------------------------------------------
# Static index (serves your existing index.html / css / js)
# ---------------------------------------------------------------------

@app.route("/")
def index():
    return app.send_static_file("index.html")


# ---------------------------------------------------------------------
# Auth / role endpoint – driven from the role dropdown in the UI
# ---------------------------------------------------------------------

@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json() or {}
    role = data.get("role")
    if role not in [ROLE_RM, ROLE_TAC, ROLE_QUALITY, ROLE_ADMIN]:
        return jsonify({"error": "Invalid role"}), 400
    session["role"] = role
    return jsonify({"role": role})


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def generate_project_id() -> str:
    last = Project.query.order_by(Project.id.desc()).first()
    if not last:
        return "ACD000001"
    numeric = int(last.project_id.replace("ACD", "")) + 1
    return f"ACD{numeric:06d}"


def get_project_or_404(pid: str) -> Project:
    p = Project.query.filter_by(project_id=pid).first()
    if not p:
        abort(404)
    return p


# ---------------------------------------------------------------------
# API: list/search projects (UR-1 / SR-1)
# ---------------------------------------------------------------------

@app.route("/api/projects", methods=["GET"])
def api_list_projects():
    q = request.args.get("q", "").strip().lower()
    status = request.args.get("status")
    model = request.args.get("model")
    market = request.args.get("market")

    query = Project.query

    if status:
        query = query.filter(Project.status == status)
    if model:
        query = query.filter(Project.model == model)
    if market:
        query = query.filter(Project.market == market)

    if q:
        like = f"%{q}%"
        query = query.filter(
            db.or_(
                Project.project_id.ilike(like),
                Project.vin.ilike(like),
                Project.part_no.ilike(like),
                Project.title.ilike(like),
            )
        )

    projects = query.order_by(Project.created_at.desc()).all()
    return jsonify({"projects": [p.to_dict() for p in projects]})


# ---------------------------------------------------------------------
# API: create project (UR-4, F1, SR-4)
# ---------------------------------------------------------------------

@app.route("/api/projects", methods=["POST"])
@require_role([ROLE_TAC, ROLE_QUALITY, ROLE_ADMIN])
def api_create_project():
    data = request.get_json() or {}
    required = ["title", "symptom_code", "market", "model"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    pid = generate_project_id()
    labels = ",".join(data.get("labels", []))

    p = Project(
        project_id=pid,
        title=data["title"],
        description=data.get("description", ""),
        market=data["market"],
        region=data.get("region"),
        model=data["model"],
        platform=data.get("platform"),
        part_no=data.get("part_no"),
        vin=data.get("vin"),
        symptom_code=data["symptom_code"],
        severity=int(data.get("severity", 3)),
        status="Ready",  # F1
        labels=labels,
        created_by=current_role(),
    )
    db.session.add(p)
    db.session.flush()

    # optional initial source
    source_id = data.get("source_id")
    source_type = data.get("source_type")
    if source_id and source_type:
        db.session.add(
            SourceLink(
                source_id=source_id,
                source_type=source_type,
                project_id=p.id,
                linked_by=current_role(),
            )
        )
        p.bin_coverage_ratio = 0.2

    db.session.commit()
    audit("Project", p.project_id, "CREATE", "{}", str(p.to_dict()))
    return jsonify(p.to_dict()), 201


# ---------------------------------------------------------------------
# API: update status (UR-6, F3, AC-3)
# ---------------------------------------------------------------------

@app.route("/api/projects/<project_id>/status", methods=["POST"])
@require_role([ROLE_TAC, ROLE_QUALITY, ROLE_ADMIN])
def api_update_status(project_id):
    p = get_project_or_404(project_id)
    data = request.get_json() or {}
    new_status = data.get("status")
    if not new_status:
        return jsonify({"error": "Missing status"}), 400

    before = str(p.to_dict())
    p.status = new_status
    db.session.commit()
    audit("Project", p.project_id, "UPDATE_STATUS", before, str(p.to_dict()))
    return jsonify(p.to_dict())


# ---------------------------------------------------------------------
# API: bin source (UR-7, SR-7, F2, AC-2)
# ---------------------------------------------------------------------

@app.route("/api/bin", methods=["POST"])
@require_role([ROLE_TAC, ROLE_QUALITY, ROLE_ADMIN])
def api_bin_source():
    data = request.get_json() or {}
    source_id = data.get("source_id")
    source_type = data.get("source_type")
    project_id = data.get("project_id")
    if not source_id or not source_type or not project_id:
        return jsonify({"error": "source_id, source_type, project_id required"}), 400

    target = get_project_or_404(project_id)

    existing = SourceLink.query.filter_by(
        source_id=source_id, source_type=source_type
    ).first()
    if existing and existing.project_id != target.id:
        existing_project = Project.query.get(existing.project_id)
        return (
            jsonify(
                {
                    "error": "Source already linked",
                    "existing_project_id": existing_project.project_id,
                }
            ),
            409,
        )

    before = str(target.to_dict())

    if not existing:
        link = SourceLink(
            source_id=source_id,
            source_type=source_type,
            project_id=target.id,
            linked_by=current_role(),
        )
        db.session.add(link)
    else:
        existing.project_id = target.id
        existing.linked_by = current_role()

    # bump coverage a bit for demo
    target.bin_coverage_ratio = min(1.0, target.bin_coverage_ratio + 0.02)
    db.session.commit()

    audit_key = f"{source_type}:{source_id}"
    audit("SourceLink", audit_key, "BIN", "{}", f"project_id={target.project_id}")
    audit("Project", target.project_id, "BIN_SOURCE", before, str(target.to_dict()))

    return jsonify(target.to_dict())


# ---------------------------------------------------------------------
# API: export CSV (UR-9, SR-9, AC-5)
# ---------------------------------------------------------------------

@app.route("/api/export", methods=["GET"])
@require_role([ROLE_QUALITY, ROLE_ADMIN])
def api_export():
    status = request.args.get("status")
    model = request.args.get("model")
    market = request.args.get("market")

    query = Project.query
    if status:
        query = query.filter(Project.status == status)
    if model:
        query = query.filter(Project.model == model)
    if market:
        query = query.filter(Project.market == market)

    projects = query.order_by(Project.created_at.desc()).all()

    lines = ["project_id,title,market,model,status,severity,created_at,vin,part_no"]
    for p in projects:
        line = ",".join(
            [
                p.project_id,
                (p.title or "").replace(",", " "),
                p.market or "",
                p.model or "",
                p.status or "",
                str(p.severity),
                p.created_at.date().isoformat(),
                p.vin or "",
                p.part_no or "",
            ]
        )
        lines.append(line)

    csv_data = "\n".join(lines)
    return app.response_class(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=projects.csv"},
    )


# ---------------------------------------------------------------------
# API: audit log per project (UR-11, SR-11)
# ---------------------------------------------------------------------

@app.route("/api/audit/<project_id>", methods=["GET"])
def api_project_audit(project_id):
    events = (
        AuditEvent.query.filter_by(entity_type="Project", entity_id=project_id)
        .order_by(AuditEvent.timestamp.desc())
        .all()
    )
    return jsonify({"events": [e.to_dict() for e in events]})


# ---------------------------------------------------------------------
# Main entrypoint
# ---------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True)
