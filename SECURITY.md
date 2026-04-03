# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Vectis, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, email **alex.husniddinov@gmail.com** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Timeline

- **Acknowledgment:** within 48 hours
- **Initial assessment:** within 1 week
- **Fix timeline:** depends on severity, typically 1-4 weeks

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Security Best Practices

When deploying Vectis:

- Set a strong `VECTIS_SECRET_KEY` (use `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
- Set a strong `VECTIS_DB_PASSWORD`
- Set `VECTIS_DEBUG=false` in production
- Use HTTPS with a reverse proxy (Nginx, Caddy)
- Bind services to `127.0.0.1`, not `0.0.0.0`, unless behind a reverse proxy
- Keep PostgreSQL accessible only from the application server
