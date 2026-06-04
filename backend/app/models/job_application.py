"""
JobApplication — applications submitted via the public /apply page.

Designed to handle high-volume mass-recruitment (campus students applying
from flyers and QR codes). Anti-spam built in via rate limits at route
level, honeypot field, and email-uniqueness per position.

Status lifecycle:
  new → reviewed → shortlisted → contacted → (hired | rejected)

CV upload is optional. When present, the file is stored on disk at
/var/www/cointap/uploads/cvs/<filename> and the path is referenced here.
"""
from ..extensions import db
from datetime import datetime, timezone


class JobApplication(db.Model):
    __tablename__ = "job_applications"

    id = db.Column(db.Integer, primary_key=True)

    # Personal
    full_name = db.Column(db.String(200), nullable=False)
    whatsapp = db.Column(db.String(32), nullable=False, index=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    county = db.Column(db.String(80), nullable=False)

    # Education
    school = db.Column(db.String(200), nullable=False)
    course = db.Column(db.String(200), nullable=False)
    year_of_study = db.Column(db.String(20), nullable=False)  # 'year_1' .. 'year_4' | 'other'

    # Role interest
    available_remote = db.Column(db.String(20), nullable=False)   # 'yes' | 'no' | 'not_sure'
    has_experience = db.Column(db.String(20), nullable=False)     # 'yes' | 'no' | 'a_little'
    why_interested = db.Column(db.Text, nullable=False)           # short answer
    pitch_cointap = db.Column(db.Text, nullable=False)            # how would you convince someone

    # CV — optional. Stores filesystem path relative to uploads/cvs dir.
    cv_filename = db.Column(db.String(255), nullable=True)
    cv_size_bytes = db.Column(db.Integer, nullable=True)
    cv_mime_type = db.Column(db.String(80), nullable=True)

    # Position — extensible to multi-role later. Default for this campaign.
    position = db.Column(db.String(40), default="sales_manager", nullable=False, index=True)

    # Workflow state
    # new | reviewed | shortlisted | contacted | hired | rejected
    status = db.Column(db.String(20), default="new", nullable=False, index=True)
    admin_notes = db.Column(db.Text, nullable=True)

    # Audit / anti-abuse
    ip_address = db.Column(db.String(64), nullable=True)
    user_agent = db.Column(db.String(500), nullable=True)
    referrer = db.Column(db.String(500), nullable=True)   # e.g. 'qr-flyer', 'whatsapp', ...

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self, include_admin=False):
        """Public dict (post-submit acknowledgement) by default.
        Pass include_admin=True for full admin payload.
        """
        public = {
            "id": self.id,
            "full_name": self.full_name,
            "position": self.position,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if not include_admin:
            return public

        return {
            **public,
            "whatsapp": self.whatsapp,
            "email": self.email,
            "county": self.county,
            "school": self.school,
            "course": self.course,
            "year_of_study": self.year_of_study,
            "available_remote": self.available_remote,
            "has_experience": self.has_experience,
            "why_interested": self.why_interested,
            "pitch_cointap": self.pitch_cointap,
            "cv_filename": self.cv_filename,
            "cv_size_bytes": self.cv_size_bytes,
            "cv_mime_type": self.cv_mime_type,
            "has_cv": bool(self.cv_filename),
            "admin_notes": self.admin_notes,
            "ip_address": self.ip_address,
            "referrer": self.referrer,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
