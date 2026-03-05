"""Email service for sending transactional emails."""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from backend.core.config import settings

logger = logging.getLogger(__name__)


def _is_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)


def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Send a password reset email. Returns True on success, False if email is not configured."""

    if not _is_configured():
        logger.warning("SMTP not configured — skipping password reset email for %s", to_email)
        return False

    reset_link = f"{settings.frontend_url}/reset-password?token={reset_token}"
    from_email = settings.smtp_from_email or settings.smtp_user

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "HYPERFIT – Passwort zurücksetzen"
    msg["From"] = from_email
    msg["To"] = to_email

    text = (
        f"Hallo,\n\n"
        f"Du hast eine Passwort-Zurücksetzung angefordert.\n\n"
        f"Klicke auf den folgenden Link, um dein Passwort zurückzusetzen:\n"
        f"{reset_link}\n\n"
        f"Der Link ist 1 Stunde gültig.\n\n"
        f"Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.\n\n"
        f"Dein HYPERFIT Team"
    )

    html = f"""\
    <html>
    <body style="font-family: Arial, sans-serif; background: #0e0e10; color: #ffffff; padding: 40px;">
        <div style="max-width: 480px; margin: 0 auto;">
            <h2 style="color: #00FF7F;">HYPERFIT</h2>
            <p>Hallo,</p>
            <p>Du hast eine Passwort-Zurücksetzung angefordert.</p>
            <p>
                <a href="{reset_link}"
                   style="display: inline-block; padding: 12px 24px; background: #00FF7F;
                          color: #0e0e10; text-decoration: none; border-radius: 6px;
                          font-weight: bold;">
                    Passwort zurücksetzen
                </a>
            </p>
            <p style="color: #888; font-size: 14px;">Der Link ist 1 Stunde gültig.</p>
            <p style="color: #888; font-size: 14px;">
                Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.
            </p>
            <hr style="border-color: #333; margin: 24px 0;" />
            <p style="color: #555; font-size: 12px;">Dein HYPERFIT Team</p>
        </div>
    </body>
    </html>
    """

    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(from_email, to_email, msg.as_string())
        logger.info("Password reset email sent to %s", to_email)
        return True
    except Exception:
        logger.exception("Failed to send password reset email to %s", to_email)
        return False
