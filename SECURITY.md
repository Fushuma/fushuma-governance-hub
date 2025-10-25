# Security Policy

## Supported Versions

We actively support the following versions of Fushuma Governance Hub:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Fushuma Governance Hub seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please email us at: **security@fushuma.com**

### What to Include

Please include the following information in your report:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability
- Suggested fix (if available)

### Response Timeline

- **Initial Response**: Within 48 hours of receiving your report
- **Status Update**: Within 7 days with our assessment and planned actions
- **Resolution**: We aim to release a fix within 30 days for critical vulnerabilities

### Disclosure Policy

- Please give us reasonable time to address the vulnerability before public disclosure
- We will acknowledge your contribution in our security advisories (unless you prefer to remain anonymous)
- We may request a coordinated disclosure timeline

## Security Best Practices

When deploying Fushuma Governance Hub:

1. **Environment Variables**: Never commit `.env` files to version control
2. **JWT Secret**: Use a strong, randomly generated secret (minimum 32 characters)
3. **Database**: Use strong passwords and restrict network access
4. **HTTPS**: Always use HTTPS in production
5. **Updates**: Keep dependencies up to date
6. **Monitoring**: Enable logging and monitoring for security events
7. **Backups**: Implement regular automated backups
8. **Rate Limiting**: Configure appropriate rate limits for your use case

## Known Security Considerations

- The application uses Web3 wallet connections - users are responsible for their private key security
- Smart contract interactions should be audited before production use
- Admin privileges are controlled via the `OWNER_OPEN_ID` environment variable

## Security Updates

Security updates will be released as patch versions and announced via:

- GitHub Security Advisories
- Release notes
- Email to registered administrators

Thank you for helping keep Fushuma Governance Hub secure!

