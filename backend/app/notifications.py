import os
import smtplib
from email.message import EmailMessage

# environment variables for SMTP account
SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASS = os.environ.get("SMTP_PASS")
SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER)
USE_SMTP = os.environ.get("USE_SMTP", "false").lower() == "true"


def send_email(
    to: str,
    subject: str,
    body: str,
    from_address: str | None = None,
) -> None:
    """
    if USE_SMTP=true and SMTP env vars are set, send a real email.
    Otherwise, prints a mock email to the console.
    """

    if not USE_SMTP or not (SMTP_HOST and SMTP_USER and SMTP_PASS and SMTP_FROM):
        # mock mode
        print("=== MOCK EMAIL ===")
        print(f"From: {from_address or SMTP_FROM or 'sicknote@example.com'}")
        print(f"To: {to}")
        print(f"Subject: {subject}")
        print("Body:")
        print(body)
        print("==================")
        return

    # Real SMTP sending
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_address or SMTP_FROM
    msg["To"] = to
    msg.set_content(body)

    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)