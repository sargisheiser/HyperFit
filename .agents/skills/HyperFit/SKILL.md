```markdown
# HyperFit Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches you the core development patterns, coding conventions, and common workflows used in the HyperFit codebase. HyperFit is a Python-based backend project (with some frontend utilities) for fitness-related features, using SQLAlchemy for ORM, Pydantic for schemas, and Alembic for migrations. It follows conventional commit messages, emphasizes test-driven development (TDD), and enforces code quality via CI.

## Coding Conventions

**File Naming**
- Python files use `camelCase` (e.g., `userModel.py`, `workoutService.py`).
- Test files: `test_*.py` for backend, `*.test.js` for frontend.

**Import Style**
- Relative imports are preferred within the backend.
  ```python
  from .models import UserModel
  from ..schemas import WorkoutSchema
  ```

**Export Style**
- Mixed: both explicit `__all__` and implicit exports are used.

**Commit Messages**
- Follows [Conventional Commits](https://www.conventionalcommits.org/):  
  Prefixes: `feat`, `fix`  
  Example:  
  ```
  feat: add subscription model and endpoints
  fix: correct workout duration calculation
  ```

## Workflows

### Add New Backend Feature (TDD)
**Trigger:** When adding a new backend feature or domain (e.g., subscriptions, workout tracking).  
**Command:** `/new-backend-feature`

1. **Create or update SQLAlchemy models**  
   `backend/models/*.py`
   ```python
   class Subscription(Base):
       __tablename__ = "subscriptions"
       id = Column(Integer, primary_key=True)
       user_id = Column(Integer, ForeignKey("users.id"))
       plan = Column(String, nullable=False)
   ```
2. **Update model imports**  
   `backend/models/__init__.py`
   ```python
   from .subscriptionModel import Subscription
   ```
3. **Add or update Pydantic schemas**  
   `backend/schemas/*.py`
   ```python
   class SubscriptionSchema(BaseModel):
       user_id: int
       plan: str
   ```
4. **Implement business logic**  
   `backend/services/*.py`
5. **Add or update API routers**  
   `backend/api/subscription_router.py`
6. **Write or update tests**  
   `backend/tests/test_subscription.py`
7. **Update config/database if needed**  
   `backend/core/config.py`, `backend/core/database.py`
8. **Add Alembic migration**  
   `alembic/versions/*.py`

---

### Add Database Table or Model
**Trigger:** When introducing a new persistent entity in the database.  
**Command:** `/new-table`

1. **Create or update SQLAlchemy model**  
   `backend/models/*.py`
2. **Update model imports**  
   `backend/models/__init__.py`
3. **Update related models if relationships needed**  
   `backend/models/related_model.py`
4. **Generate Alembic migration**  
   `alembic/versions/*.py`
5. **Update DB logic if needed**  
   `backend/core/database.py`
6. **Update/add Pydantic schemas**  
   `backend/schemas/*.py`
7. **Update/add tests**  
   `backend/tests/test_*.py`

---

### Add API Endpoint
**Trigger:** When exposing a new REST API endpoint.  
**Command:** `/new-endpoint`

1. **Create or update router**  
   `backend/api/<feature>_router.py`
   ```python
   @router.post("/subscriptions/")
   def create_subscription(subscription: SubscriptionSchema):
       ...
   ```
2. **Update router imports**  
   `backend/api/__init__.py`
3. **Implement or update service logic**  
   `backend/services/*.py`
4. **Update/add Pydantic schemas**  
   `backend/schemas/*.py`
5. **Write/update tests**  
   `backend/tests/test_*.py`

---

### Backend CI: Lint, Typecheck, Security
**Trigger:** When enforcing code quality and security in backend CI.  
**Command:** `/setup-backend-ci`

1. **Add/update CI workflow**  
   `.github/workflows/backend-ci.yml`
2. **Configure tools**  
   `pyproject.toml` (for ruff, mypy, bandit)
3. **Update requirements**  
   `requirements.txt`
4. **Fix codebase issues**  
   `backend/**/*.py`

---

### Frontend Refactor: Utility Replacement
**Trigger:** When standardizing or upgrading a frontend utility or pattern.  
**Command:** `/refactor-utility`

1. **Implement new utility**  
   `frontend/src/utils/logger.js`
2. **Replace usages**  
   `frontend/src/components/**/*.jsx`, etc.
   ```js
   // Before
   console.log("Message");
   // After
   logger.info("Message");
   ```
3. **Update/add ESLint rules**  
   `frontend/.eslintrc.cjs`
4. **Add eslint-disable comments if needed**
5. **Update/add tests**  
   `frontend/src/__tests__/**/*.js`

---

### Dependency Bump and Compatibility Fix
**Trigger:** When resolving dependency conflicts or updating for compatibility/security.  
**Command:** `/bump-dependencies`

1. **Update requirements**  
   `requirements.txt`
2. **Test for compatibility**  
   Run tests, check CI
3. **Fix breaking changes**  
   `backend/**/*.py`

---

## Testing Patterns

- **Backend:**  
  - Tests in `backend/tests/test_*.py`
  - Use pytest style, fixtures in `backend/tests/conftest.py`
  - Example:
    ```python
    def test_create_subscription(client):
        response = client.post("/subscriptions/", json={"user_id": 1, "plan": "pro"})
        assert response.status_code == 201
    ```

- **Frontend:**  
  - Uses [Vitest](https://vitest.dev/)  
  - Test files: `*.test.js`
  - Example:
    ```js
    import { render } from '@testing-library/react';
    import SubscriptionForm from '../SubscriptionForm';

    test('renders form', () => {
      render(<SubscriptionForm />);
      // assertions...
    });
    ```

## Commands

| Command              | Purpose                                                      |
|----------------------|--------------------------------------------------------------|
| /new-backend-feature | Scaffold a new backend feature/domain with TDD workflow      |
| /new-table           | Add a new database table/model and related migrations        |
| /new-endpoint        | Add a new API endpoint with router, service, and tests       |
| /setup-backend-ci    | Setup or update backend CI for linting, type, security       |
| /refactor-utility    | Refactor frontend to use a new or standardized utility       |
| /bump-dependencies   | Update backend dependencies and fix compatibility issues     |
```