# Digital Product Estate Standard v1.2

## Purpose

Define a reusable operating model for selected web apps, PWAs, internal tools and future commercial products without turning them into one tightly coupled system.

The primary operational problem this standard solves is version drift from downloadable HTML files. For selected apps, the product should have one stable URL that works across phone and desktop. Source code is updated centrally; users should not need to repeatedly download replacement HTML files.

## Core principle

One digital estate, independently deployable apps, shared standards.

Projects may reuse foundation packages, design patterns, release practices and governance, but they retain separate deployment, data, access and failure boundaries where appropriate.

## Selective hosting rule

Not every project needs a website.

A project should be moved to a hosted app when one or more of these are true:

- the user repeatedly receives replacement HTML files after changes
- the same app is used across phone and desktop
- more than one person needs the same current version
- data or configuration must persist across sessions/devices
- frequent updates are expected
- a stable URL materially improves the workflow

Projects that are still ideas, documents, one-off calculators, content pilots or inactive experiments may remain outside the hosted-app estate until this need appears.

## Default update path

For selected apps, use this delivery model by default:

GitHub source → preview deployment → automated checks → production deployment → same stable URL

The live URL is the product entry point. Downloaded HTML files are build/source artifacts, not the distribution mechanism.

Where the app is still a simple standalone HTML/CSS/JavaScript tool, do not rewrite it merely to host it. Put the existing source under version control, make it responsive, deploy it as a static site, and evolve the architecture only when product requirements justify it.

## Cross-device rule

A hosted app must be tested at minimum for:

- desktop browser
- common mobile viewport
- touch interaction where applicable
- responsive layout
- navigation and form usability
- installability/offline behaviour when the product is intended to be a PWA

One codebase should serve supported phone and desktop use unless there is a documented reason for platform-specific builds.

## Direct-maintenance rule

For projects whose GitHub and hosting integrations are connected and authorized:

- code changes should be made in the repository, not by generating replacement files for manual distribution
- preview deployments should be used for meaningful changes
- production should update from the approved repository state
- rollback must remain possible
- production credentials remain in the hosting/database secret stores, not in chat or source control

This allows authorized maintenance to happen through the connected development stack while keeping the deployed URL stable.


## CTO / ACE cross-project trigger rule

The user should not have to remember to ask for repositories, hosting, deployment, domains, responsive behaviour, persistence, security, monitoring or backups.

When a project discussion in any working thread shows a technical trigger, the CTO/ACE role should proactively evaluate the project and propose the smallest appropriate infrastructure change.

### Triggers

Examples include:

- a new or repeatedly updated HTML/web app
- repeated manual file downloads or version confusion
- a requirement to work from both phone and desktop
- a requirement for one shared current version across multiple users
- persistent or synced data
- login, permissions or role-based access
- API or AI integrations
- sensitive personal, business or company data
- a public/customer-facing brand
- repeated manual deployment steps
- a project that is becoming a regularly used product

### CTO response

For each triggered project, CTO/ACE should decide and record, as relevant:

- whether hosting is actually needed
- whether the app should remain static or move to a full-stack architecture
- repository and source-of-truth location
- stable URL and whether a dedicated domain is justified
- hosting platform
- database / persistence layer
- authentication / authorization
- privacy and data classification
- preview/staging and production flow
- mobile/desktop/PWA expectations
- monitoring, backup and rollback
- API/security implications
- estimated recurring infrastructure cost
- migration path from the current artifact without unnecessary rebuilding

### Cross-thread continuity

A material technical decision discovered in one project thread should update the shared project registry / technical standard so later work in another thread does not rediscover the same decision.

The shared registry is the cross-project source of truth. Individual chats remain working surfaces, not the authoritative inventory.

Do not silently modify unrelated live systems. Propose changes when approval is required, and directly maintain connected/authorized low-risk source and deployment workflows where permission already exists.

### Dedicated-link rule

When a project is actively used and repeated file distribution is causing friction, CTO/ACE should proactively recommend a stable hosted link.

Use:

- static hosting for simple HTML/CSS/JS tools
- full-stack hosting for apps needing server functions, synced persistence, authentication or sensitive data
- a dedicated branded domain only when the product/business justifies it

A dedicated link is an operational decision, not something the user should have to remember to request.

## Lifecycle

Every project moves through:

1. Discover
2. Prototype
3. Build
4. Validate
5. Production
6. Scale
7. Maintain
8. Retire

A project must not be described as production-ready unless the required runtime, deployment and security checks have actually passed.

## Project Passport

Every hosted project must maintain a small operational record covering:

- project name and purpose
- owner / accountable user
- lifecycle stage and operational status
- repository
- hosting provider and live URL
- staging / preview URL
- database / durable datastore
- domain and DNS state
- data classification
- authentication / authorization model
- integrations and APIs
- deployment method
- monitoring
- backup / restore method
- current version
- last verified date
- known issues
- next milestone
- monthly operating cost where material

Use `templates/PROJECT-PASSPORT.md` as the default template.

## Data classification

Use four baseline classes:

- Public
- Internal
- Confidential
- Highly Restricted

The classification must influence storage, access, agent permissions, logging and deployment decisions.

## Isolation rule

Do not combine unrelated sensitive datasets merely because they use the same technical stack.

Personal financial data, business data, employer/company data and independent commercial products should use separate production data boundaries by default.

Sharing libraries is encouraged. Sharing sensitive production tables by convenience is not.

## Repository rule

Public repositories may contain reusable public-safe code and documentation only.

Private business metadata, confidential user information, credentials, production secrets and internal operational records must remain outside public repositories.

## Environment rule

Production apps should have distinct development, preview/staging and production paths.

Preferred release flow:

1. create change
2. build preview
3. run tests and security checks
4. human review where required
5. promote the tested artifact
6. verify production health
7. retain rollback path

## Secrets rule

Never commit secrets to source control or ship them in browser bundles.

Use environment or secret-management facilities appropriate to the hosting platform.

## API / integration governance

Every new or materially changed integration should document:

- why it is needed
- data read
- data written
- permissions requested
- failure modes
- secret handling
- user-visible impact
- rollback / disable path

Production rollout should be blocked when the integration expands privilege without explicit approval.

## Agent permission default

Default execution pattern:

READ → ANALYSE → PROPOSE → HUMAN APPROVAL → WRITE/ACTION

Higher autonomy should be earned only by a bounded, low-risk workflow with clear verification and rollback.

## Domain policy

Do not buy a dedicated domain simply because a prototype exists.

Use an umbrella domain or provider URL while a product is experimental.

A dedicated domain is justified when the product has a real independent job, validated users, a brand requirement, or commercial/public positioning.

Registrar selection should consider renewal price, DNS control, 2FA, privacy, transferability and ownership—not only first-year promotional pricing.

## Backup and recovery

Any app storing durable user or business data must define:

- what is backed up
- backup frequency
- export format
- retention
- restore procedure
- last restore test

A backup is not considered complete until restoration is possible.

## Monitoring

Production apps must have a truthful operational state, including at minimum:

- deployment history
- build status
- runtime error visibility
- current version
- last verification date

## Cost governance

Track material recurring costs per project:

- domains
- hosting
- database
- APIs
- AI usage
- storage
- monitoring

Review dormant projects periodically and retire infrastructure that no longer serves an active goal.

## Company / employer boundary

Company-confidential data may only be deployed into infrastructure and access paths approved for that company.

A personal domain, personal cloud project or public repository is not an acceptable production destination for employer-confidential data without explicit authorization.

## Retirement

Retirement should include:

- export or disposition of retained data
- domain / DNS cleanup
- removal of unused secrets
- shutdown of deployments and databases
- archive of source and documentation
- registry status update
