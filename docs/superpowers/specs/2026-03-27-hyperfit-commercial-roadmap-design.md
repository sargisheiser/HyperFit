# HYPERFIT Commercial Launch Roadmap

**Date:** 2026-03-27
**Author:** Solo developer + AI
**Target:** Commercial product, German market
**Timeline:** 16 weeks (4 months), 8 two-week sprints
**Approach:** Parallel Tracks (quality + features every sprint)

---

## 1. Current State Assessment

### What Works Well
- FastAPI + React 18 architecture with clean service layer separation
- 3 production-ready AI integrations: OpenAI GPT-4o-mini (vision/chat), Gemini 2.5 Flash (food recognition fallback), MediaPipe (pose estimation)
- LangChain/LangGraph assistant with 4 domain tools
- JWT auth with refresh tokens, bcrypt, rate limiting (slowapi)
- 124 backend test cases, Docker Compose prod config, GitHub Actions CI/CD
- German-language UI with cyberpunk/neon theme

### Critical Issues
| Issue | Severity | Sprint to Fix |
|-------|----------|---------------|
| MealAnalyzer.jsx is 1,657 LOC | HIGH | Sprint 2 |
| ~20% frontend test coverage | HIGH | Sprint 3, 6 |
| 144 `console.log` calls, no logging service | MEDIUM | Sprint 1 |
| Nearly zero accessibility (5 ARIA instances) | HIGH | Sprint 5 |
| No linting/type-checking in CI | MEDIUM | Sprint 1 |
| nutrition_service.py (615 LOC) needs splitting | MEDIUM | Sprint 2 |
| assistant_service.py (542 LOC) needs splitting | MEDIUM | Sprint 4 |
| Integration tests only, no unit test isolation | MEDIUM | Sprint 3 |
| Single Alembic migration (not incremental) | LOW | Sprint 4 |
| Mixed sync/async patterns in services | LOW | Sprint 4 |

### Tech Stack
- **Backend:** FastAPI, SQLAlchemy 2.0, Pydantic v2, JWT (HS256), bcrypt, slowapi
- **Frontend:** React 18, Vite, Zustand, Tailwind CSS, Framer Motion
- **AI:** OpenAI GPT-4o-mini, Gemini 2.5 Flash, MediaPipe 0.10.14, LangChain 1.2+, LangGraph 1.0+
- **DB:** SQLite (dev), PostgreSQL ready, Alembic migrations
- **Infra:** Docker Compose, GitHub Actions, gunicorn

---

## 2. Commercial Requirements

### Subscription Model
- **Free tier:** 3 AI meal analyses/day, basic workout tracking, 7-day history
- **Premium (9.99 EUR/month or 89.99 EUR/year):** Unlimited AI analysis, advanced analytics, AI assistant, recipe suggestions, data export, priority support

### Payment Infrastructure
- Stripe integration (Checkout, Customer Portal, Webhooks)
- New models: `Subscription`, `Plan`, `Payment`
- New service: `stripe_service.py`
- New router: `subscription_router.py`
- Frontend: Pricing page, Checkout flow, SubscriptionGate component

### Legal Compliance (German Market)
- **Impressum** (legally required for all commercial German websites)
- **Datenschutzerklaerung** (privacy policy, DSGVO/GDPR)
- **AGB** (terms of service)
- **Widerrufsbelehrung** (cancellation policy for subscription services)
- **Cookie consent** (if using analytics cookies)
- **BFSG accessibility statement** (Barrierefreiheitsstaerkungsgesetz, effective June 2025)
- Budget ~500-800 EUR for lawyer review of template-based legal pages

### Deployment Target
- **Hetzner Cloud** CX22 (2 vCPU, 4GB RAM, ~4.50 EUR/month) -- German data center, GDPR-compliant
- **Managed PostgreSQL** (Hetzner or Supabase free tier initially)
- **Cloudflare** for DNS, CDN, DDoS protection (free tier)
- **GitHub Actions** for CI/CD (extend existing pipelines with deployment)
- **Total infrastructure cost at launch:** ~10-20 EUR/month

---

## 3. Sprint Plan

### Sprint 1 (Weeks 1-2): Security + Payment Foundation

**Quality Track:**
- Replace all 144 `console.log` calls with a logging utility (`frontend/src/utils/logger.js` with log levels: debug, info, warn, error)
- Add `ruff` linter and `mypy` type checker to backend CI
- Add `bandit` security scanner to backend CI
- Validate `.env` handling (ensure `.env` is gitignored, `.env.example` is complete)

**Feature Track:**
- Create Stripe backend integration:
  - `backend/models/subscription.py` -- Subscription, Plan, Payment models
  - `backend/services/stripe_service.py` -- Stripe API wrapper (create customer, create checkout session, handle webhooks, manage subscriptions)
  - `backend/api/subscription_router.py` -- POST /subscribe, POST /webhook, GET /subscription, POST /cancel
  - Alembic migration for new models
- Add `stripe` to requirements.txt

**Key Files:**
- `frontend/src/utils/logger.js` (new)
- `.github/workflows/backend-ci.yml` (modify)
- `backend/models/subscription.py` (new)
- `backend/services/stripe_service.py` (new)
- `backend/api/subscription_router.py` (new)

**Done When:**
- CI pipeline runs ruff + mypy + bandit + pytest (all green)
- Zero `console.log` calls in frontend
- Stripe webhook receives test events successfully
- Subscription CRUD endpoints respond correctly

---

### Sprint 2 (Weeks 3-4): Refactoring + Subscription UI & Legal

**Quality Track:**
- Split `MealAnalyzer.jsx` (1,657 LOC) into:
  - `MealCapture.jsx` -- camera/upload interface
  - `MealScanProgress.jsx` -- loading/analysis state
  - `MealResults.jsx` -- analysis results display
  - `MealItemEditor.jsx` -- edit individual food items
  - `MealSaveConfirmation.jsx` -- save/confirm flow
  - `MealAnalyzerPage.jsx` -- page orchestrator
- Split `nutrition_service.py` (615 LOC) into:
  - `nutrition_calculator.py` -- calorie/macro math
  - `meal_crud.py` -- meal create/read/update/delete
  - `recipe_service.py` -- AI recipe suggestions
  - `nutrition_stats.py` -- aggregation and reporting

**Feature Track:**
- `frontend/src/pages/Pricing.jsx` -- tier comparison, CTA buttons
- `frontend/src/pages/Checkout.jsx` -- Stripe Elements integration
- `frontend/src/components/SubscriptionGate.jsx` -- wrap premium features, show upgrade prompt
- Legal pages (static content, linked from footer):
  - `frontend/src/pages/legal/Impressum.jsx`
  - `frontend/src/pages/legal/Datenschutz.jsx`
  - `frontend/src/pages/legal/AGB.jsx`
  - `frontend/src/pages/legal/Widerruf.jsx`

**Done When:**
- No frontend file over 400 LOC
- No backend service file over 400 LOC
- Users can complete a Stripe checkout flow (test mode)
- All legal pages render correctly with footer navigation

---

### Sprint 3 (Weeks 5-6): Testing + Onboarding Polish

**Quality Track:**
- Frontend test coverage from ~20% to 40%+:
  - Test all Zustand stores (userStore, useNutritionStore)
  - Test all custom hooks
  - Test API service layer (mock axios/fetch)
  - Test key page components (Dashboard, MealAnalyzer orchestrator)
- Backend unit test isolation:
  - Add pytest fixtures for unit tests (mock DB session)
  - Separate integration tests from unit tests in directory structure
  - Target 80%+ backend coverage

**Feature Track:**
- Polish onboarding flow (already exists in `frontend/src/pages/Onboarding.jsx`):
  - Ensure all steps complete smoothly
  - Add progress indicators
  - Validate form inputs with user-friendly German error messages
- Email verification flow:
  - `backend/api/auth_router.py` -- GET /verify-email?token=...
  - `backend/services/email_service.py` -- extend with verification email template
  - Frontend email verification page
- Welcome email after registration

**Done When:**
- Frontend coverage >= 40% (enforced in CI)
- Backend coverage >= 80% (enforced in CI)
- New user can register -> verify email -> complete onboarding -> land on dashboard

---

### Sprint 4 (Weeks 7-8): Infrastructure + AI Enhancement

**Quality Track:**
- PostgreSQL migration:
  - Test all models against PostgreSQL
  - Add PostgreSQL to CI test matrix
  - Create incremental Alembic migrations (break single migration into proper history)
- Docker production config:
  - Complete nginx configuration with SSL (Let's Encrypt/certbot)
  - Add health check endpoints to Docker compose
  - Configure gunicorn workers based on CPU count
- Error tracking:
  - Add Sentry SDK (Python + React, free tier: 5K events/month)
  - Configure error boundaries to report to Sentry
- Split `assistant_service.py` (542 LOC) into:
  - `assistant_tools.py` -- tool definitions and implementations
  - `assistant_agent.py` -- LangGraph agent setup and execution
  - `assistant_context.py` -- user context building and thread management

**Feature Track:**
- AI assistant conversation memory:
  - Store conversation history per user (new `ConversationMessage` model)
  - Load recent context when starting new conversation
  - Configurable context window (last N messages)
- New assistant tools:
  - `meal_suggestion` -- suggest meals based on remaining macros, user preferences, and logged food history
  - `workout_recommendation` -- recommend workouts based on recent history, goals, and recovery time
- Enhanced food recognition:
  - Feed user's correction history back into prompts for better accuracy
  - Cache frequent meal recognitions (hash-based lookup)

**Done When:**
- App runs on PostgreSQL in Docker with nginx/SSL
- Sentry captures and reports errors from both frontend and backend
- AI assistant remembers conversation context across sessions
- New tools respond with personalized suggestions

---

### Sprint 5 (Weeks 9-10): Accessibility + Analytics

**Quality Track:**
- Accessibility audit and fixes:
  - Add ARIA labels to all interactive elements (buttons, inputs, links, modals)
  - Implement keyboard navigation for all flows
  - Add focus management (trap focus in modals, restore focus on close)
  - Add skip-to-content link
  - Ensure color contrast meets WCAG 2.1 AA (4.5:1 for text)
  - Screen reader testing with VoiceOver
  - Add `role` attributes where semantic HTML is insufficient
  - Target: 50+ ARIA instances (up from 5)

**Feature Track:**
- User analytics dashboard:
  - `frontend/src/components/analytics/WeightTrend.jsx` -- weight over time chart (use recharts)
  - `frontend/src/components/analytics/CalorieAdherence.jsx` -- daily/weekly goal hit rate
  - `frontend/src/components/analytics/WorkoutConsistency.jsx` -- streak tracking, weekly frequency
  - `frontend/src/components/analytics/MacroBreakdown.jsx` -- protein/carb/fat distribution trends
  - `frontend/src/pages/Analytics.jsx` -- analytics page orchestrator
- Backend analytics support:
  - `backend/services/analytics_service.py` -- time-series aggregation queries
  - `backend/api/analytics_router.py` -- GET /analytics/weight, /analytics/calories, /analytics/workouts, /analytics/macros

**Done When:**
- Lighthouse accessibility score >= 80
- All forms and interactive elements have ARIA labels
- Analytics page shows 4 chart types with real user data
- Keyboard-only navigation works for all critical flows

---

### Sprint 6 (Weeks 11-12): Test Coverage + PWA

**Quality Track:**
- Frontend coverage from 40% to 60%+:
  - Test remaining page components
  - Test error boundaries
  - Test subscription gate logic
  - Test analytics components with mock data
- E2E tests for critical flows (Playwright):
  - Signup -> onboarding -> dashboard
  - Meal analysis -> save -> history
  - Subscribe -> access premium feature
  - Login -> refresh token -> continued session

**Feature Track:**
- PWA configuration:
  - Service worker for offline shell (app loads without network)
  - Web App Manifest with icons (192x192, 512x512)
  - Install prompt on mobile browsers
  - Offline fallback page
- Push notifications (optional, via Web Push API):
  - Daily meal logging reminders
  - Workout streak reminders
  - Weekly check-in prompts

**Done When:**
- Frontend coverage >= 60% (enforced in CI)
- E2E tests pass for all 4 critical flows
- Lighthouse PWA score >= 80
- App installable on mobile via "Add to Home Screen"

---

### Sprint 7 (Weeks 13-14): Beta Launch + Hardening

**Quality Track:**
- Performance optimization:
  - React lazy loading for route-level code splitting
  - Image optimization (WebP conversion, responsive sizes)
  - Bundle analysis and tree-shaking audit
  - API response time < 200ms for non-AI endpoints
  - Target: < 3s initial page load on 3G
- Fix all bugs reported by beta users
- Stress testing: verify rate limiting under load

**Feature Track:**
- Beta invite system:
  - Invite codes or waitlist signup
  - Feedback collection mechanism (in-app feedback button)
  - Beta-specific pricing (e.g., lifetime discount for early adopters)
- Privacy-friendly analytics:
  - Plausible or Umami (self-hosted, GDPR-compliant)
  - Track: signups, meal analyses, subscription conversions, retention
- Admin dashboard (minimal):
  - User count, active users, subscription metrics
  - Error rate monitoring

**Done When:**
- 20-50 beta users actively using the app
- Page load < 3s on 3G connection
- Feedback collection working
- Admin can view basic metrics

---

### Sprint 8 (Weeks 15-16): Public Launch

**Quality Track:**
- Monitoring and alerting:
  - Uptime monitoring (UptimeRobot or similar, free tier)
  - Database backup automation (daily pg_dump to object storage)
  - Disaster recovery plan documented
  - SSL certificate auto-renewal verified
- Final security audit:
  - Penetration testing basics (OWASP ZAP scan)
  - Verify no secrets in code or logs
  - Rate limiting tuned for production
  - CORS origins updated for production domain

**Feature Track:**
- Marketing landing page:
  - Hero section with app screenshots
  - Feature highlights (AI meal analysis, workout tracking, smart coaching)
  - Pricing section
  - CTA to sign up
  - SEO basics (meta tags, Open Graph, structured data)
- Production deployment:
  - DNS configuration with Cloudflare
  - Production environment variables set
  - GitHub Actions deployment pipeline (push to main -> deploy)
  - Smoke tests post-deployment
- App store preparation (if PWA):
  - Google Play listing via TWA (Trusted Web Activity)
  - Apple App Store consideration (requires native wrapper or skip for V1)

**Done When:**
- App live on production domain with SSL
- Landing page converts visitors to signups
- Automated deployment pipeline working
- Backups verified recoverable
- Product accepting real payments

---

## 4. Differentiating Features (Post-Launch Roadmap)

These features differentiate HYPERFIT from MyFitnessPal/Yazio and should be prioritized based on user feedback:

### AI Meal Memory (Month 5)
- Track frequently eaten meals per user
- "Your usual breakfast?" quick-log feature
- New model: `FrequentMeal` (user_id, meal_template, frequency, last_eaten)
- New assistant tool: `suggest_frequent_meal`

### Smart Portion Learning (Month 5)
- Learn user's plate sizes from correction history
- Improve AI portion estimates per user over time
- New model: `PortionCalibration` (user_id, food_type, typical_portion, confidence)
- Feed calibration data into vision prompts

### Workout-Nutrition Linking (Month 6)
- After logging a workout, dynamically adjust daily calorie targets
- Suggest post-workout meals from user's food repertoire
- New service: `daily_plan_service.py` connecting workout and nutrition services

### Body Recomposition Mode (Month 6)
- Cycle calories based on training/rest days
- Training days: maintenance + surplus, Rest days: deficit
- Extend `GOAL_ADJUSTMENTS` in nutrition calculator
- Unique feature vs. competitors (most only offer cut/bulk)

### Photo Progress Timeline (Month 7)
- Optional encrypted body photos
- Side-by-side comparison view across dates
- Client-side encryption before upload
- New model: `ProgressPhoto` (user_id, date, encrypted_path, body_region)

### Natural Language Meal Logging (Month 7)
- "I had two eggs and toast for breakfast" as alternative to photo
- Parse with LLM, map to nutrition data
- Faster logging for known meals

### German Food Database Integration (Month 8)
- Integrate BLS (Bundeslebensmittelschluessel) for accurate German food data
- Enhance Open Food Facts barcode scanning
- Reduce reliance on AI estimation for common German foods

---

## 5. AI Roadmap

### Phase 1: Foundation (Sprint 4)
- Conversation memory across sessions
- User context in all prompts (goals, preferences, history)
- New tools: meal_suggestion, workout_recommendation

### Phase 2: Personalization (Months 5-6)
- Feed correction data back into food recognition prompts
- Cache frequent meal recognitions (content-hash lookup)
- Weekly AI-generated nutrition reports via email

### Phase 3: Intelligence (Months 7-8)
- Natural language meal logging
- Pattern detection (eating habits, workout consistency trends)
- Proactive coaching ("You've been under protein target 3 days in a row")
- Workout form feedback improvements (expanded exercise library for MediaPipe)

### Cost Optimization
- GPT-4o-mini + Gemini 2.5 Flash is already cost-efficient
- Monitor per-user API cost, set daily limits for free tier
- Cache common food recognitions (hash-based dedup)
- Consider local model fallback for basic recognition (reduce API costs at scale)

---

## 6. Infrastructure Scaling Path

### Launch (Sprint 8)
- Single Hetzner CX22 server (2 vCPU, 4GB RAM)
- PostgreSQL on same server or managed service
- Cloudflare CDN for static assets
- ~10-20 EUR/month

### 100-500 Users (Month 5-6)
- Upgrade to CX32 (4 vCPU, 8GB RAM, ~8 EUR/month)
- Move uploads to Cloudflare R2 (S3-compatible, cheapest object storage)
- Redis for rate limiting + session caching
- ~30-50 EUR/month

### 500-2000 Users (Month 8+)
- Separate app server and database server
- Multiple gunicorn workers behind nginx load balancer
- Database read replicas for analytics queries
- CDN for all frontend assets
- ~80-150 EUR/month

### 2000+ Users
- Horizontal scaling (stateless JWT auth enables multiple app instances)
- Managed PostgreSQL with connection pooling
- Background job queue (Celery/Redis or ARQ) for AI processing
- Consider dedicated AI inference tier
- ~200-400 EUR/month

---

## 7. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Stripe integration delays | Delays revenue | LOW | Use Stripe Checkout (hosted), not custom Elements |
| AI API cost overrun | Margin erosion | MEDIUM | Free tier limits, caching, cost monitoring |
| BFSG non-compliance | Legal action | MEDIUM | Sprint 5 accessibility audit, WCAG 2.1 AA target |
| Solo developer burnout | Project stalls | MEDIUM | 2-week sprints with visible progress, AI assistance |
| MediaPipe accuracy issues | Poor UX | LOW | Already production-tested, fallback to manual entry |
| PostgreSQL migration breaks | Data loss | LOW | Test thoroughly in CI, staged rollout |
| Beta user feedback overwhelm | Scope creep | MEDIUM | Strict sprint scope, feedback triage board |

---

## 8. Success Metrics

| Metric | Target at Launch | Target at Month 6 |
|--------|-----------------|-------------------|
| Registered users | 50 (beta) | 500 |
| Paying subscribers | 5 (beta discount) | 50 |
| Monthly recurring revenue | 50 EUR | 500 EUR |
| AI meal analyses/day | 100 | 1,000 |
| App error rate | < 1% | < 0.5% |
| Page load time | < 3s | < 2s |
| Test coverage (backend) | 80% | 85% |
| Test coverage (frontend) | 60% | 70% |
| Lighthouse accessibility | 80+ | 90+ |
| Lighthouse PWA | 80+ | 90+ |
