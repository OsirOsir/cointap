"""
Careers routes.

Public endpoints (no auth):
  GET  /api/careers/status     — is the form open? (lightweight poll)
  POST /api/careers/apply      — submit an application
                                  Accepts multipart/form-data so CV upload
                                  can ride along, OR application/json with
                                  no CV.

Admin endpoints (JWT + admin):
  GET    /api/admin/applications              — paginated list + filters
  GET    /api/admin/applications/<id>         — full detail
  PUT    /api/admin/applications/<id>         — update status / notes
  DELETE /api/admin/applications/<id>         — remove (cleanup)
  GET    /api/admin/applications/<id>/cv      — download CV file

Anti-abuse:
  - Rate limit 3 submissions per IP per 24 hours (in-memory ring buffer)
  - Honeypot field 'website' — bots fill it, humans never see it
  - Email-uniqueness per position (already applied → friendly 409)
  - CV size hard cap 2MB at multipart level
"""
import os
import re
import time
import uuid
from collections import defaultdict, deque
from flask import Blueprint, request, send_file, current_app, abort
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
from ..extensions import db
from ..models.job_application import JobApplication
from ..models.settings import get_settings
from ..models.user import User
from ..utils.helpers import ok, err, current_user
from datetime import datetime, timezone, timedelta

careers_bp = Blueprint("careers", __name__, url_prefix="/api/careers")
admin_careers_bp = Blueprint("admin_careers", __name__, url_prefix="/api/admin/applications")

# ─── Constants ─────────────────────────────────────────────────────
CV_UPLOAD_DIR = "/var/www/cointap/uploads/cvs"   # absolute path on VPS
# In dev (no /var/www/cointap), fall back to project-local uploads dir
DEV_FALLBACK_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads", "cvs")
CV_MAX_BYTES = 2 * 1024 * 1024  # 2 MB
ALLOWED_CV_EXTS = {"pdf", "doc", "docx"}
ALLOWED_CV_MIMES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

VALID_YEARS = {"year_1", "year_2", "year_3", "year_4", "other"}
VALID_REMOTE = {"yes", "no", "not_sure"}
VALID_EXPERIENCE = {"yes", "no", "a_little"}
VALID_STATUSES = {"new", "reviewed", "shortlisted", "contacted", "hired", "rejected"}

# Naive in-memory rate limiter (per IP, last 24h). Acceptable for single-worker
# Gunicorn setup. If we ever scale to multi-worker, move to Redis.
_rate_buckets: dict = defaultdict(lambda: deque(maxlen=10))
RATE_LIMIT_WINDOW_S = 24 * 60 * 60   # 24 hours
RATE_LIMIT_MAX = 3                    # 3 submissions per IP per 24h


def _get_upload_dir() -> str:
    """Pick upload dir based on what exists/writable."""
    for d in (CV_UPLOAD_DIR, DEV_FALLBACK_DIR):
        try:
            os.makedirs(d, exist_ok=True)
            # Quick writability test
            test_path = os.path.join(d, f".writetest_{uuid.uuid4().hex[:6]}")
            with open(test_path, "w") as fp:
                fp.write("x")
            os.remove(test_path)
            return d
        except (OSError, PermissionError):
            continue
    # Last resort — current working dir (shouldn't happen)
    return os.getcwd()


def _check_rate_limit(ip: str) -> bool:
    """Return True if allowed, False if over limit."""
    now = time.time()
    bucket = _rate_buckets[ip]
    # Drop entries older than the window
    while bucket and bucket[0] < now - RATE_LIMIT_WINDOW_S:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT_MAX:
        return False
    bucket.append(now)
    return True


def _validate_email(s: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", s or ""))


def _validate_phone(s: str) -> bool:
    """Kenyan phone formats: +254..., 254..., 07..., 01..."""
    digits = re.sub(r"\D", "", s or "")
    return 9 <= len(digits) <= 13


def _normalize_phone(s: str) -> str:
    """Normalize Kenyan phone to +254 format."""
    digits = re.sub(r"\D", "", s or "")
    if digits.startswith("254"):
        return "+" + digits
    if digits.startswith("0") and len(digits) == 10:
        return "+254" + digits[1:]
    if len(digits) == 9 and digits.startswith(("7", "1")):
        return "+254" + digits
    return s.strip()   # give up, store as-is


# ────────────────────────────────────────────────────────────────────
# PUBLIC ENDPOINTS
# ────────────────────────────────────────────────────────────────────

@careers_bp.get("/status")
def careers_status():
    """Lightweight check: are applications open? Used by /apply page on load."""
    settings = get_settings()
    return ok(
        open=bool(settings.careers_open),
        position="sales_manager",
        title="CoinTap Sales Manager",
    )


@careers_bp.post("/apply")
def apply():
    """Submit a job application. Accepts:
       - multipart/form-data (with optional CV file under 'cv')
       - application/json (no CV)
    Rate-limited and honeypot-protected.
    """
    # 1) Are applications open at all?
    settings = get_settings()
    if not settings.careers_open:
        return err("Applications are currently closed. Please follow us for updates.", 403)

    # 2) Rate limit by IP
    ip = (request.headers.get("X-Forwarded-For", "") or request.remote_addr or "").split(",")[0].strip()
    if ip and not _check_rate_limit(ip):
        return err("Too many applications from this device today. Try again tomorrow.", 429)

    # 3) Extract fields — works for both multipart and JSON
    if request.content_type and request.content_type.startswith("multipart/"):
        f = request.form
        cv_file = request.files.get("cv")
    else:
        f = request.get_json(silent=True) or {}
        cv_file = None

    # 4) Honeypot — if filled, silently accept but don't save (looks legit to bots)
    if (f.get("website") or "").strip():
        return ok(received=True)   # quiet drop

    # 5) Field-level validation
    def take(k, max_len=500):
        return (f.get(k) or "").strip()[:max_len]

    full_name = take("full_name", 200)
    whatsapp = take("whatsapp", 32)
    email = take("email", 255).lower()
    county = take("county", 80)
    school = take("school", 200)
    course = take("course", 200)
    year_of_study = take("year_of_study", 20)
    available_remote = take("available_remote", 20)
    has_experience = take("has_experience", 20)
    why_interested = take("why_interested", 2000)
    pitch_cointap = take("pitch_cointap", 2000)
    referrer = take("referrer", 500)

    errors: list[str] = []
    if len(full_name) < 3:                   errors.append("Full name is too short.")
    if not _validate_email(email):           errors.append("Please enter a valid email address.")
    if not _validate_phone(whatsapp):        errors.append("Please enter a valid WhatsApp number.")
    if len(county) < 2:                       errors.append("Please tell us your county or town.")
    if len(school) < 2:                       errors.append("Please tell us your school.")
    if len(course) < 2:                       errors.append("Please tell us your course.")
    if year_of_study not in VALID_YEARS:      errors.append("Please pick your year of study.")
    if available_remote not in VALID_REMOTE:  errors.append("Please answer the remote-work question.")
    if has_experience not in VALID_EXPERIENCE: errors.append("Please answer the experience question.")
    if len(why_interested) < 10:              errors.append("Please share a bit more about why you're interested.")
    if len(pitch_cointap) < 10:               errors.append("Please share a brief pitch for CoinTap.")
    if errors:
        return err(" ".join(errors), 400)

    # 6) Email-uniqueness per position
    position = "sales_manager"
    existing = JobApplication.query.filter_by(email=email, position=position).first()
    if existing:
        return err("You've already applied for this position. We'll be in touch soon.", 409)

    # 7) CV — optional. Validate size + type if present.
    cv_filename = None
    cv_size = None
    cv_mime = None
    if cv_file and cv_file.filename:
        original_name = secure_filename(cv_file.filename)
        ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
        if ext not in ALLOWED_CV_EXTS:
            return err("CV must be a PDF, DOC, or DOCX file.", 400)
        if cv_file.mimetype and cv_file.mimetype not in ALLOWED_CV_MIMES:
            return err("CV file type not recognised.", 400)
        # Read into memory to measure (we'll write after model commit so we
        # know the application id for the filename)
        blob = cv_file.read()
        if len(blob) > CV_MAX_BYTES:
            return err(f"CV must be under {CV_MAX_BYTES // (1024 * 1024)}MB.", 400)
        if len(blob) < 100:
            return err("CV file appears empty or corrupted.", 400)
        cv_size = len(blob)
        cv_mime = cv_file.mimetype
        # Defer writing to disk until after we have the app id
        cv_pending_blob = blob
    else:
        cv_pending_blob = None

    # 8) Create the application row
    app_row = JobApplication(
        full_name=full_name,
        whatsapp=_normalize_phone(whatsapp),
        email=email,
        county=county,
        school=school,
        course=course,
        year_of_study=year_of_study,
        available_remote=available_remote,
        has_experience=has_experience,
        why_interested=why_interested,
        pitch_cointap=pitch_cointap,
        position=position,
        status="new",
        ip_address=ip[:64] if ip else None,
        user_agent=(request.user_agent.string or "")[:500],
        referrer=referrer or None,
    )
    db.session.add(app_row)
    db.session.flush()   # assign id without committing yet

    # 9) Save CV to disk with id-based filename
    if cv_pending_blob is not None:
        upload_dir = _get_upload_dir()
        timestamp = int(time.time())
        ext = (cv_file.filename.rsplit(".", 1)[-1] or "pdf").lower()
        safe_ext = ext if ext in ALLOWED_CV_EXTS else "pdf"
        filename = f"cv_{app_row.id}_{timestamp}.{safe_ext}"
        full_path = os.path.join(upload_dir, filename)
        try:
            with open(full_path, "wb") as fp:
                fp.write(cv_pending_blob)
            app_row.cv_filename = filename
            app_row.cv_size_bytes = cv_size
            app_row.cv_mime_type = cv_mime
        except OSError as e:
            current_app.logger.error(f"Failed to save CV for app {app_row.id}: {e}")
            # Roll back, return error — application not committed
            db.session.rollback()
            return err("Could not save your CV. Please try again without it.", 500)

    db.session.commit()
    return ok(
        received=True,
        application_id=app_row.id,
        message="Thank you for applying! Shortlisted applicants will be contacted via WhatsApp or email.",
    )


# ────────────────────────────────────────────────────────────────────
# ADMIN ENDPOINTS
# ────────────────────────────────────────────────────────────────────

def _require_admin():
    u = current_user()
    if not u or not u.is_admin:
        abort(403)
    return u


@admin_careers_bp.get("/")
@jwt_required()
def list_applications():
    _require_admin()
    status = request.args.get("status", "").strip()
    search = request.args.get("q", "").strip()
    page = max(1, int(request.args.get("page", 1)))

    q = JobApplication.query
    if status and status != "all" and status in VALID_STATUSES:
        q = q.filter_by(status=status)
    if search:
        like = f"%{search}%"
        q = q.filter(
            db.or_(
                JobApplication.full_name.ilike(like),
                JobApplication.email.ilike(like),
                JobApplication.whatsapp.ilike(like),
                JobApplication.school.ilike(like),
                JobApplication.county.ilike(like),
            )
        )

    result = q.order_by(JobApplication.created_at.desc()).paginate(
        page=page, per_page=20, error_out=False
    )

    # Aggregate stats — counts by status (small table; OK to compute live)
    stats_rows = (
        db.session.query(JobApplication.status, db.func.count(JobApplication.id))
        .group_by(JobApplication.status).all()
    )
    stats = {s: 0 for s in VALID_STATUSES}
    for status_key, count in stats_rows:
        stats[status_key] = count
    stats["total"] = sum(stats[s] for s in VALID_STATUSES)

    return ok(
        applications=[a.to_dict(include_admin=True) for a in result.items],
        total=result.total,
        pages=result.pages,
        page=page,
        stats=stats,
    )


@admin_careers_bp.get("/<int:app_id>")
@jwt_required()
def application_detail(app_id):
    _require_admin()
    app_row = JobApplication.query.get_or_404(app_id)
    return ok(application=app_row.to_dict(include_admin=True))


@admin_careers_bp.put("/<int:app_id>")
@jwt_required()
def update_application(app_id):
    _require_admin()
    app_row = JobApplication.query.get_or_404(app_id)
    data = request.get_json(silent=True) or {}

    if "status" in data:
        new_status = (data["status"] or "").strip()
        if new_status not in VALID_STATUSES:
            return err(f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}", 400)
        app_row.status = new_status

    if "admin_notes" in data:
        app_row.admin_notes = (data["admin_notes"] or "")[:5000] or None

    db.session.commit()
    return ok(application=app_row.to_dict(include_admin=True))


@admin_careers_bp.delete("/<int:app_id>")
@jwt_required()
def delete_application(app_id):
    _require_admin()
    app_row = JobApplication.query.get_or_404(app_id)
    # Best-effort: also delete the CV file
    if app_row.cv_filename:
        for d in (CV_UPLOAD_DIR, DEV_FALLBACK_DIR):
            full = os.path.join(d, app_row.cv_filename)
            if os.path.exists(full):
                try: os.remove(full)
                except OSError: pass
                break
    db.session.delete(app_row)
    db.session.commit()
    return ok(deleted=True)


@admin_careers_bp.get("/<int:app_id>/cv")
@jwt_required()
def download_cv(app_id):
    _require_admin()
    app_row = JobApplication.query.get_or_404(app_id)
    if not app_row.cv_filename:
        return err("No CV uploaded for this application.", 404)
    for d in (CV_UPLOAD_DIR, DEV_FALLBACK_DIR):
        full = os.path.join(d, app_row.cv_filename)
        if os.path.exists(full):
            # Friendly download name: "CoinTap_<name>_<id>.<ext>"
            ext = app_row.cv_filename.rsplit(".", 1)[-1]
            safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", app_row.full_name)[:50]
            download_name = f"CoinTap_{safe_name}_{app_row.id}.{ext}"
            return send_file(full, as_attachment=True, download_name=download_name)
    return err("CV file not found on server.", 404)
