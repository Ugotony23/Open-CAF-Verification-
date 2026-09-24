"""Data Redactor for Open CAF.
Ensures zero-trust client/server-side PII, IP address, and credential sanitization
for UK public sector cyber security and safety before text touches any LLM.
"""
import re
from typing import Tuple, Dict, Any


class DataRedactor:
    """
    Sanitizes raw assessment evidence, pentest reports, and audit logs.
    Redacts:
    - IPv4 and IPv6 addresses -> [REDACTED_IP]
    - Internal council hostnames/domains (*.gov.uk, server01.internal, *.local) -> [REDACTED_HOST]
    - UK National Insurance numbers, staff emails, phone numbers -> [REDACTED_PII]
    - Passwords, API tokens, Private keys, Bearer tokens -> [REDACTED_SECRET]
    """

    # --- Regular Expression Patterns ---

    # 1. Private keys & secrets
    PATTERN_PRIVATE_KEY = re.compile(
        r"-----BEGIN [A-Z\s]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z\s]+ PRIVATE KEY-----",
        re.MULTILINE,
    )

    # JWT tokens
    PATTERN_JWT = re.compile(
        r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}\b"
    )

    # Credentials / Passwords / Tokens in key-value pairs (e.g. password=Secret123, api_key: "abc...")
    PATTERN_CREDENTIALS = re.compile(
        r"(?i)\b(?P<key>password|passwd|pwd|api[_-]?key|secret[_-]?key|client[_-]?secret|auth[_-]?token|access[_-]?token|bearer[_-]?token|db[_-]?pass)\s*(?P<sep>[:=])\s*['\"]?(?P<val>[^\s'\";,]+)['\"]?"
    )

    # 2. Staff Emails (e.g. david.cameron@borsetshire.gov.uk)
    PATTERN_EMAIL = re.compile(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
    )

    # 3. UK National Insurance numbers (e.g. QQ 12 34 56 C, NR 65 43 21 A)
    PATTERN_UK_NINO = re.compile(
        r"\b[A-Za-z]{2}\s?[0-9]{2}\s?[0-9]{2}\s?[0-9]{2}\s?[A-Za-z]\b"
    )

    # 4. UK Phone numbers (e.g. +44 7911 123456, +44 7700 900123, +44 20 7946 0192, 07123 456789)
    PATTERN_UK_PHONE = re.compile(
        r"(?:\+44\s?(?:\(0\)\s?)?|0)[1-9](?:[\s-]?\d){8,11}\b"
    )

    # 5. Internal council hostnames/domains (*.gov.uk, server01.internal, *.local, *.lan, *.corp)
    # Must NOT match general words ending with 'internal'
    PATTERN_INTERNAL_HOST = re.compile(
        r"\b(?:[a-zA-Z0-9_-]+\.)+(?:gov\.uk|internal|local|lan|corp|localdomain|priv|intra)\b",
        re.IGNORECASE,
    )

    # 6. IPv4 Addresses (with optional port)
    PATTERN_IPV4 = re.compile(
        r"\b(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(?::\d{1,5})?\b"
    )

    # 7. IPv6 Addresses
    PATTERN_IPV6 = re.compile(
        r"\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}:|::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}\b|\bfe80::[0-9a-fA-F:]{1,24}\b",
        re.IGNORECASE,
    )

    @classmethod
    def redact_secrets(cls, text: str) -> Tuple[str, int]:
        """Redacts private keys, JWTs, and credential key-value assignments."""
        count = 0

        # Private keys
        text, n = cls.PATTERN_PRIVATE_KEY.subn("[REDACTED_SECRET]", text)
        count += n

        # JWT tokens
        text, n = cls.PATTERN_JWT.subn("[REDACTED_SECRET]", text)
        count += n

        # Key-value password/token assignments
        def _replace_cred(match):
            key = match.group("key")
            sep = match.group("sep")
            return f"{key}{sep} [REDACTED_SECRET]"

        text, n = cls.PATTERN_CREDENTIALS.subn(_replace_cred, text)
        count += n

        return text, count

    @classmethod
    def redact_pii(cls, text: str) -> Tuple[str, int]:
        """Redacts emails, UK National Insurance numbers, and phone numbers."""
        count = 0

        # Emails
        text, n = cls.PATTERN_EMAIL.subn("[REDACTED_PII]", text)
        count += n

        # UK National Insurance Number
        text, n = cls.PATTERN_UK_NINO.subn("[REDACTED_PII]", text)
        count += n

        # UK Phone Numbers
        text, n = cls.PATTERN_UK_PHONE.subn("[REDACTED_PII]", text)
        count += n

        return text, count

    @classmethod
    def redact_hostnames(cls, text: str) -> Tuple[str, int]:
        """Redacts internal hostnames and *.gov.uk council domains."""
        text, n = cls.PATTERN_INTERNAL_HOST.subn("[REDACTED_HOST]", text)
        return text, n

    @classmethod
    def redact_ips(cls, text: str) -> Tuple[str, int]:
        """Redacts IPv4 and IPv6 addresses."""
        count = 0
        text, n = cls.PATTERN_IPV6.subn("[REDACTED_IP]", text)
        count += n

        text, n = cls.PATTERN_IPV4.subn("[REDACTED_IP]", text)
        count += n

        return text, count

    @classmethod
    def redact(cls, text: str) -> str:
        """
        Executes full sequential redaction pipeline in protective order:
        1. Secrets & Credentials -> [REDACTED_SECRET]
        2. Emails & Personal Identifiers -> [REDACTED_PII]
        3. Internal Domains & Hostnames -> [REDACTED_HOST]
        4. IP Addresses (v4/v6) -> [REDACTED_IP]
        """
        if not text:
            return ""

        redacted, _ = cls.redact_with_stats(text)
        return redacted

    @classmethod
    def redact_with_stats(cls, text: str) -> Tuple[str, Dict[str, int]]:
        """
        Performs redaction and returns sanitized text along with counts
        of sanitized entities.
        """
        if not text:
            return "", {"secrets": 0, "pii": 0, "hosts": 0, "ips": 0, "total": 0}

        text, n_secrets = cls.redact_secrets(text)
        text, n_pii = cls.redact_pii(text)
        text, n_hosts = cls.redact_hostnames(text)
        text, n_ips = cls.redact_ips(text)

        stats = {
            "secrets": n_secrets,
            "pii": n_pii,
            "hosts": n_hosts,
            "ips": n_ips,
            "total": n_secrets + n_pii + n_hosts + n_ips,
        }
        return text, stats
