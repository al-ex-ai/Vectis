# Contributing to Vectis

Thanks for your interest in contributing to Vectis. This guide covers everything you need to get started.

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 22+
- PostgreSQL 16+ (or Docker)

### Development Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/vectis-etl/vectis.git
   cd vectis
   ```

2. **Start the databases**

   ```bash
   cp docker/.env.example docker/.env
   # Edit docker/.env and set VECTIS_DB_PASSWORD
   cd docker && docker compose -f docker-compose.dev.yml up -d
   ```

3. **Backend**

   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your database password
   pip install -e ".[dev]"
   uvicorn vectis.app:app --reload --port 8000
   ```

4. **Frontend**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   Open http://localhost:5173. The Vite dev server proxies `/api` requests to the backend.

### Demo Account

On first startup the backend seeds a default user:

- **Email:** admin@vectis.dev
- **Password:** admin123

## Code Standards

### Frontend

- TypeScript strict mode, no `any`
- React functional components with hooks
- MUI components for UI
- Zustand for state management
- Keep files under 400 lines, functions under 50 lines

### Backend

- Python 3.12+ with type annotations everywhere
- FastAPI async endpoints
- SQLAlchemy 2.0 async ORM
- Pydantic v2 for validation
- Keep files under 400 lines, functions under 250 lines

### Linting

```bash
# Frontend
cd frontend && npm run lint

# Backend
cd backend && ruff check src/
cd backend && mypy src/
```

### Testing

```bash
# Frontend
cd frontend && npm test

# Backend
cd backend && pytest
```

Aim for 80%+ coverage on new code. All PRs must pass CI checks.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add pipeline scheduling UI
fix: handle null entity mappings in flow designer
docs: update plugin development guide
refactor: extract schema discovery into service
test: add coverage for flow execution engine
```

## Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your changes with tests
3. Run linting and tests locally
4. Open a PR with a clear title and description
5. Fill in the PR template

### PR Checklist

- [ ] Tests pass (`npm test` and `pytest`)
- [ ] Linting passes (`npm run lint` and `ruff check`)
- [ ] Type checking passes (`tsc --noEmit` and `mypy`)
- [ ] New features have tests
- [ ] Breaking changes are documented

## Reporting Bugs

Open a [GitHub Issue](https://github.com/vectis-etl/vectis/issues) with:

- Steps to reproduce
- Expected vs actual behavior
- Browser/OS/Python version
- Error messages or screenshots

## Feature Requests

Open a [GitHub Issue](https://github.com/vectis-etl/vectis/issues) with the `enhancement` label. Describe:

- The problem you're trying to solve
- Your proposed solution
- Alternatives you've considered

## License

By contributing, you agree that your contributions will be licensed under the [Apache 2.0 License](LICENSE).
