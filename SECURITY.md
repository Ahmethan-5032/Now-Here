# Security Policy

## Supported Versions

This project is currently maintained through the latest version of the `main` branch.

| Version | Supported |
| ------- | --------- |
| main    | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please do not open a public GitHub issue.

Instead, report it privately by contacting:

**ahmethan5032@gmail.com**

Please include the following information in your report:

- A clear description of the vulnerability
- Steps to reproduce the issue
- The affected part of the application
- Possible impact
- Screenshots, logs, or proof of concept if available

I will review the report and try to respond as soon as possible.

## Security Scope

The following areas are considered in scope:

- Authentication and authorization
- Backend API endpoints
- Database-related security issues
- Environment variable and secret handling
- User data handling
- Deployment configuration
- Frontend security issues that may affect users

## Out of Scope

The following are generally considered out of scope:

- Social engineering
- Physical attacks
- Denial-of-service attacks
- Spam or automated abuse
- Issues caused by third-party services outside this project
- Reports without clear reproduction steps

## Sensitive Data

This repository should not contain sensitive files or credentials such as:

- `.env`
- API keys
- MongoDB connection strings
- JWT secrets
- Private tokens
- Service credentials

If any sensitive information is accidentally committed, it should be removed from the repository and the exposed credential should be rotated immediately.
