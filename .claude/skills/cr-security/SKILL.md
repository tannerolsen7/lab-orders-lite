---
name: cr-security
description: |
  Security-focused multi-pass review for changes touching authentication,
  access policies, public endpoints, or data boundaries. Pass 3 defers backend-specific
  deep checks to the project's database-safety adapter skill; a scope-gated Pass 4
  red-teams auth/payments/public-endpoint diffs into concrete proof-of-concept exploit
  paths. Every finding is MUST FIX. Auto-fixes with Opus after review. Triggers on changes
  to auth, middleware, public-path config, access policies, server actions, payments,
  share tokens, or cross-tenant isolation.
---

# /cr-security — Security review

Opt-in. Run manually before committing any change touching:
- Authentication or middleware/route guards
- Public unauthenticated handlers (e.g. share-token routes, callback routes)
- Access policies or data-access boundaries
- Cross-tenant isolation (anything that could return another tenant's data)
- Share tokens or any public/unauthenticated RPC/endpoint
- Server actions (verify auth check present)
- New database functions (privileged-execution / grant check)

---

## Presenting decisions to the human

Every place below where the human is asked to decide, approve, or confirm
something must do three things. The goal is not to dumb the information
down — it's to make it as easy as possible to read, understand, and decide
on:

1. **Full context first.** State what's being decided and why it matters, in
   one message. Don't make the human scroll back through the conversation to
   piece it together.
2. **Plain words — teachable, not dumbed down.** 8th/9th-grade English. If a
   technical term really is the clearest word, say the plain-English effect
   *before* using the term — never name a mechanism and assume it's
   understood (see `~/.claude/CLAUDE.md` → "Communication voice"). "If two
   people click pay at the same time, the client could get charged twice"
   beats "race condition." The bar: could the human explain this back to a
   colleague and answer a follow-up question about it, confidently? If not,
   simplify the language further — never cut real information to get there.
3. **Leave the door open.** Close with something like "ask me to explain any
   part of this before you decide." A summary the human can't question is a
   rubber stamp, not a decision.

**Choosing how to ask.** For a small set of discrete choices — approve
vs. reject, pick one of a few options — use `AskUserQuestion`; it renders as
clickable options and already has a built-in escape hatch (the human can
always answer "Other" with free text instead of picking a preset). For
anything the human needs to actually read before deciding — a vulnerable
code snippet, an RLS policy, a full findings list — present it as prose or
a document; a structured question can't hold that much content.

This applies to Step 4 — every finding here is MUST FIX and gets presented
to the human raw unless it's translated first. Terms like "RLS policy gap,"
"TOCTOU," and "privilege escalation" mean nothing cold; say what an attacker
could actually do before naming the mechanism.

---

## Step 1 — Gather context

- Run `git diff HEAD` or `git diff main..HEAD`
- Read AGENTS.md → routing table and access-policy strategy
- Note every file touching auth, middleware, or data access

---

## Step 2 — Spawn the review agents IN PARALLEL

Every finding is MUST FIX — no SUGGESTION tier.

Passes 1–3 always run. Pass 4 is **scope-gated** (see its own header) — it runs only for diffs that touch
auth, payments, or a public/unauthenticated endpoint, and stays inert otherwise so ordinary `/cr-security`
runs do not carry it.

### Pass 1 — Security & Auth (Sonnet)

- Auth checks only on the client that could be bypassed by a direct server request
- Server actions / handlers missing the project's auth + tenant guard
- Queries that could return another tenant's data if the tenant/owner param is omitted or swapped
- Unsanitized user input reaching DB queries, redirects, or logs
- Hardcoded secrets, API keys, or tokens in code
- Environment variables exposed to the client bundle (client-exposed/`NEXT_PUBLIC_`-style vars)
- Redirect targets built from user input — use only a resolved pathname, never raw query/hash
- Public-path allowlist additions that still sit behind a route-group/layout auth gate (gate still fires)

### Pass 2 — Data Boundary Integrity (Sonnet)

- Backend/data-store SDK called outside the project's data-access layer — only that layer may touch it
- Public/unauthenticated RPC or endpoint: enforce a security allowlist — no sensitive fields (internal ids,
  tokens, timestamps, contact/PII fields) exposed beyond the documented allowlist
- Every mutation in the data-access layer takes the tenant/owner scope as an argument and uses it in the query
- New tables/resources: access policies enabled and scoped to the tenant/owner
- New database functions: privileged execution revoked from public where not intended
- Privileged (definer-rights) functions: only the intended public access, no blanket exposure

### Pass 3 — Backend Security Checklist (Sonnet) — via the project's DB-safety adapter

The harness does not hardcode a backend. Invoke **this project's database-safety skill** (its backend
adapter, named in the project's config) and run its security checklist against the diff. That adapter owns
the backend-specific form of these universal classes:

- Privilege escalation via user-controlled metadata used in authorization decisions
- Auth-claim staleness used in authorization without accounting for token refresh
- User deletion without session/credential revocation
- Service-role / admin secret reachable from client code or client-exposed env vars
- Policy bypass: views or owner-rights that read around row-level access controls
- Missing companion policies (e.g. an UPDATE policy with no matching SELECT — silent no-op)
- Privileged functions in an exposed namespace without an explicit execution revoke
- Storage/object access policies incomplete for upload flows (e.g. INSERT without SELECT/UPDATE)

If the project declares no DB-safety adapter and the diff touches the database, that is a MUST FIX routing
gap (see the routing-assertion gate) — surface it.

### Pass 4 — Red-team active exploit (Opus) — SCOPE-GATED

**Scope gate (check this first — Pass 4 is INERT unless it fires):** run Pass 4 ONLY if the diff (from Step 1)
touches **authentication, payments, or a public/unauthenticated endpoint**. If it touches none of those three
surfaces, SKIP Pass 4 and state "Pass 4 inert — diff touches no auth/payments/public-endpoint surface." Do not
run it on ordinary diffs — Pass 4 must not make every `/cr-security` run heavier.

Passes 1–3 spot the issue classes. On the gated surfaces, Pass 4 goes further: **build the exploit, don't just
name the risk.** Take the attacker's seat and construct a concrete proof-of-concept path. For each finding, walk
the attacker's steps end to end:

- **What they send** — the exact request, payload, token, or sequence (e.g. the swapped tenant/owner id, the
  forged or stale claim, the omitted scope param, the replayed or forged webhook signature, the negative /
  overflow / wrong-currency amount).
- **What guard they bypass** — the specific check in the diff that fails to stop it, and why (missing,
  client-only, checked-after-fetch, trusts user-controlled metadata, wrong order of checks).
- **What they get** — the concrete impact (another tenant's row, a free or underpriced charge, acting as
  another user, an unauthenticated read of sensitive fields).

A risk you cannot turn into a step-by-step path is not yet a Pass 4 finding — keep building the path or drop it.
Every Pass 4 finding is MUST FIX, same as the others. Do not re-list the Pass 1–3 issue classes here; Pass 4
adds the worked exploit path, it does not restate the spot-checks.

---

## Step 3 — Auto-fix (Opus)

Compile all MUST FIX → spawn one Opus agent.
Fix only the listed items. Minimum changes.
Flag NEEDS HUMAN if fix requires architectural redesign or intent is ambiguous.

After fixes: run the project's test suite (e.g. `npx vitest run`). Surface failures without retry.

---

## Step 4 — Surface NEEDS HUMAN items

Every unresolved item must be addressed before the commit lands.

**Translate before you present.** Findings from Passes 1–4 are written for
an engineering audience and will use terms like "RLS policy gap," "TOCTOU,"
"privilege escalation," or "tenant isolation." Before surfacing anything to
the human, rewrite each finding in plain words: what an attacker could
actually do and why it matters, in a sentence a non-engineer could picture
("someone could edit another vendor's proposal by changing the id in the
URL" beats "missing tenant scoping check"). State the plain-English impact
before the technical label — if a term needs a definition to land, that's
the sign to cut the term, not add the definition. Close by inviting the
human to ask about any item before they act on it.
