import app.notifications as n


def test_send_email_mock_mode_when_use_smtp_false(monkeypatch, capsys):
    """
    When USE_SMTP is False (default), send_email should NOT use SMTP
    and should instead print a mock email to stdout.
    """

    # Force mock mode
    monkeypatch.setattr(n, "USE_SMTP", False)
    # Clear SMTP settings to prove it still works in mock mode
    monkeypatch.setattr(n, "SMTP_HOST", None)
    monkeypatch.setattr(n, "SMTP_USER", None)
    monkeypatch.setattr(n, "SMTP_PASS", None)
    monkeypatch.setattr(n, "SMTP_FROM", None)

    n.send_email(
        to="to@example.com",
        subject="Subject",
        body="Body",
        from_address="from@example.com",
    )

    out = capsys.readouterr().out
    assert "=== MOCK EMAIL ===" in out
    assert "From: from@example.com" in out
    assert "To: to@example.com" in out
    assert "Subject: Subject" in out
    assert "Body:\nBody" in out


def test_send_email_real_smtp_uses_override_from(monkeypatch):
    """
    When USE_SMTP is True and SMTP settings are present, send_email should:
    - use smtplib.SMTP_SSL
    - log in with SMTP_USER / SMTP_PASS
    - send exactly one message
    - respect the from_address override.
    """

    # Enable real SMTP path
    monkeypatch.setattr(n, "USE_SMTP", True)

    # Provide fake but non-empty SMTP config so we pass the guard
    monkeypatch.setattr(n, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(n, "SMTP_PORT", 465)
    monkeypatch.setattr(n, "SMTP_USER", "smtp_user@example.com")
    monkeypatch.setattr(n, "SMTP_PASS", "smtp_password")
    monkeypatch.setattr(n, "SMTP_FROM", "default_from@example.com")

    # Dummy server to capture behavior
    class DummyServer:
        def __init__(self, host, port):
            self.host = host
            self.port = port
            self.logged_in = False
            self.login_args = None
            self.sent_messages = []

        def login(self, user, password):
            self.logged_in = True
            self.login_args = (user, password)

        def send_message(self, msg):
            self.sent_messages.append(msg)

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            pass

    dummy_container = {}

    # Patch smtplib.SMTP_SSL to use DummyServer
    def fake_smtp_ssl(host, port):
        server = DummyServer(host, port)
        dummy_container["server"] = server
        return server

    monkeypatch.setattr(n.smtplib, "SMTP_SSL", fake_smtp_ssl)

    # Call the function under test
    n.send_email(
        to="recipient@example.com",
        subject="Test Subject",
        body="Hello from SickNote!",
        from_address="override_from@example.com",
    )

    # Ensure our fake server was used
    server = dummy_container["server"]
    assert server.host == "smtp.example.com"
    assert server.port == 465
    assert server.logged_in is True
    assert server.login_args == ("smtp_user@example.com", "smtp_password")

    # Exactly one message sent
    assert len(server.sent_messages) == 1
    msg = server.sent_messages[0]

    assert msg["To"] == "recipient@example.com"
    # from_address override should be used instead of SMTP_FROM
    assert msg["From"] == "override_from@example.com"
    assert msg["Subject"] == "Test Subject"
    assert "Hello from SickNote!" in msg.get_content()