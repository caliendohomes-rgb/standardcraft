(function () {
  const resources = window.STANDARDCRAFT_RESOURCES || [];
  const state = {
    query: "",
    subject: "All",
    gradeBand: "All",
    lockedSlug: "",
    billing: "monthly"
  };

  const storageKeys = {
    users: "standardcraft.users",
    currentEmail: "standardcraft.currentEmail"
  };
  const totalResources = resources.length;

  const subjects = ["All", ...Array.from(new Set(resources.map((resource) => resource.subject)))];
  const gradeBands = ["All", ...Array.from(new Set(resources.map((resource) => resource.gradeBand)))];

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function readUsers() {
    try {
      return JSON.parse(localStorage.getItem(storageKeys.users) || "{}");
    } catch {
      return {};
    }
  }

  function writeUsers(users) {
    localStorage.setItem(storageKeys.users, JSON.stringify(users));
  }

  function currentUser() {
    const email = normalizeEmail(localStorage.getItem(storageKeys.currentEmail));
    return email ? readUsers()[email] || null : null;
  }

  function updateCurrentUser(nextUser) {
    const users = readUsers();
    users[normalizeEmail(nextUser.email)] = nextUser;
    writeUsers(users);
    localStorage.setItem(storageKeys.currentEmail, normalizeEmail(nextUser.email));
  }

  function signOut() {
    localStorage.removeItem(storageKeys.currentEmail);
    navigate("/claim-free");
  }

  function navigate(path) {
    window.history.pushState({}, "", path);
    render();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function html(strings, ...values) {
    return strings.reduce((result, string, index) => result + string + (values[index] ?? ""), "");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function active(path) {
    return window.location.pathname === path ? 'aria-current="page"' : "";
  }

  function layout(content) {
    const user = currentUser();
    return html`
      <header class="site-header">
        <a class="brand" href="/" data-link>
          <span class="brand-mark">SC</span>
          <span><strong>StandardCraft</strong><small>NYS-aligned classroom resources</small></span>
        </a>
        <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>
        <nav id="site-nav" class="site-nav" aria-label="Primary navigation">
          <a href="/free-resource-library" ${active("/free-resource-library")} data-link>Resources</a>
          <a href="/pricing" ${active("/pricing")} data-link>Pricing</a>
          <a href="/school-inquiry" ${active("/school-inquiry")} data-link>Schools</a>
          ${user ? `<a href="/dashboard" ${active("/dashboard")} data-link>Dashboard</a><button class="text-button" data-action="sign-out">Sign out</button>` : `<a href="/sign-in" ${active("/sign-in")} data-link>Sign in</a>`}
          <a class="button small" href="/claim-free" data-link>Start free</a>
        </nav>
      </header>
      ${content}
      <footer class="site-footer">
        <div>
          <strong>StandardCraft</strong>
          <p>Original classroom resources built from publicly available New York State standards and teacher-centered planning routines.</p>
        </div>
        <div>
          <a href="/pricing" data-link>Pricing</a>
          <a href="/school-inquiry" data-link>Schools</a>
          <a href="/contact" data-link>Contact</a>
          <a href="/claim-free" data-link>Claim your free resource</a>
        </div>
        <div>
          <a href="/privacy" data-link>Privacy</a>
          <a href="/terms" data-link>Terms</a>
          <a href="/data-security" data-link>Data security</a>
          <a href="/refunds" data-link>Refunds</a>
        </div>
        <p class="disclaimer">StandardCraft is independent from and not affiliated with the New York State Education Department (NYSED). StandardCraft supports classroom planning and does not replace district curriculum, local requirements, or teacher professional judgment.</p>
      </footer>
    `;
  }

  function homePage() {
    const samples = resources.slice(2, 5).map(resourceCard).join("");
    return layout(html`
      <main id="main">
        <section class="hero">
          <div class="hero-copy">
            <p class="eyebrow">Built for New York classrooms</p>
            <h1>NYS-aligned planning support teachers can use tomorrow.</h1>
            <p class="lead">StandardCraft is a classroom-ready resource library for New York educators. Browse ${totalResources} resources with alignment notes, SDI support ideas, and MLL/ELL scaffolds, then download one free with your signup credit.</p>
            <div class="hero-actions">
              <a class="button" href="/claim-free" data-link>Claim my free resource</a>
              <a class="button secondary" href="/free-resource-library" data-link>View NYS sample resources</a>
            </div>
            <p class="microcopy">No payment required. No student data required. One signup credit unlocks one download.</p>
          </div>
          <div class="hero-panel" aria-label="StandardCraft resource preview">
            <span class="panel-label">Public preview example</span>
            <h2>Grade 3-5 ELA</h2>
            <p>Main Idea Evidence Ladder</p>
            <ul>
              <li>Alignment note included</li>
              <li>SDI and MLL/ELL support visible before download</li>
              <li>Downloadable file after account credit</li>
            </ul>
          </div>
        </section>

        <section class="trust-strip" aria-label="Trust and compliance">
          <span>Original resources</span>
          <span>Built from publicly available NYS standards</span>
          <span>Alignment notes included</span>
          <span>No student data required</span>
          <span>Independent from NYSED</span>
        </section>

        <section class="section">
          <div class="section-heading">
            <p class="eyebrow">How it works</p>
            <h2>Create an account, browse widely, download intentionally.</h2>
          </div>
          <div class="steps">
            ${["Create a free account without a card", `Browse ${totalResources} NYS-aligned resources`, "Preview alignment and learner supports", "Download one with your free credit"].map((step, index) => `<article><span>${index + 1}</span><h3>${step}</h3></article>`).join("")}
          </div>
        </section>

        <section class="section tinted">
          <div class="section-heading">
            <p class="eyebrow">Sample resources</p>
            <h2>Designed to feel useful before the bell rings.</h2>
          </div>
          <div class="card-grid">${samples}</div>
          <div class="center"><a class="button" href="/claim-free" data-link>Claim your free resource</a></div>
        </section>

        <section class="section two-column">
          <div>
            <p class="eyebrow">Why teachers trust StandardCraft</p>
            <h2>Clear alignment without pretending to be your curriculum.</h2>
            <p>Each resource includes a plain-language alignment note, a practical classroom use case, and preview content so teachers can decide quickly whether it fits the lesson in front of them.</p>
          </div>
          <div class="check-list">
            <p><strong>Teacher-centered:</strong> written for real planning constraints and mixed-readiness classrooms.</p>
            <p><strong>Transparent:</strong> standards labels and notes are visible before download.</p>
            <p><strong>Respectful:</strong> no student data is required to browse or claim the free credit.</p>
            <p><strong>Careful:</strong> support ideas help planning and do not create legal IEP documents.</p>
          </div>
        </section>

        <section class="section audience-band">
          <article>
            <p class="eyebrow">For teachers</p>
            <h2>Find a resource that fits the next lesson, not a generic worksheet.</h2>
            <p>Search by grade band, subject, resource type, and classroom use case. Preview the alignment record and learner supports before spending a credit.</p>
          </article>
          <article>
            <p class="eyebrow">For schools</p>
            <h2>A credible path for consistent, standards-backed planning support.</h2>
            <p>School conversations focus on teacher adoption, privacy, procurement fit, and resource consistency without requiring student data.</p>
            <a class="button secondary" href="/school-inquiry" data-link>Request a school quote</a>
          </article>
        </section>

        <section class="section">
          <div class="section-heading">
            <p class="eyebrow">FAQ</p>
            <h2>Straight answers before you sign up.</h2>
          </div>
          ${faq()}
        </section>
      </main>
    `);
  }

  function faq() {
    const items = [
      ["Is StandardCraft affiliated with NYSED?", "No. StandardCraft is independent from NYSED. Resources are built from publicly available standards and include transparent alignment notes."],
      ["Does this replace district curriculum?", "No. StandardCraft supports planning and classroom implementation. District curriculum, local requirements, and teacher professional judgment still come first."],
      ["Do you need student data?", "No student data is required to create a free account, browse resources, or download with a signup credit."],
      ["What are alignment notes?", "Alignment notes explain the standards connection in teacher-friendly language so you can judge fit before using a resource."],
      ["Are the resources original?", "Yes. The launch library contains original StandardCraft resources created for classroom use."],
      ["What does the free account include?", `A free account lets you browse ${totalResources} resources and download one resource with your signup credit.`],
      [`Why can I browse ${totalResources} resources but download one free?`, "The free signup credit is meant to let you try one resource before choosing whether to upgrade for more downloads."],
      ["Are all resources educator-reviewed?", "The current launch library is original StandardCraft content. Human educator review should be treated as a pilot claim only where specifically documented, not a sitewide guarantee."]
    ];
    return `<div class="faq">${items.map(([question, answer]) => `<details><summary>${question}</summary><p>${answer}</p></details>`).join("")}</div>`;
  }

  function claimPage(mode = "signup") {
    const user = currentUser();
    if (user) {
      return layout(html`
        <main id="main" class="page-shell narrow">
          <p class="eyebrow">You are signed in</p>
          <h1>Your free library is ready.</h1>
          <p>Browse ${totalResources} resources and download one free with your signup credit.</p>
          <div class="credit-card"><strong>${user.credits}</strong><span>signup ${user.credits === 1 ? "credit" : "credits"} available</span></div>
          <a class="button" href="/free-resource-library" data-link>Go to the free resource library</a>
        </main>
      `);
    }

    return layout(html`
      <main id="main" class="page-shell auth-shell">
        <section>
          <p class="eyebrow">Claim your free resource</p>
          <h1>Create a free account and choose one classroom-ready resource.</h1>
          <p>No payment required. Use a school or personal email, then browse ${totalResources} resource previews before using your one signup credit.</p>
          <div class="notice">New users receive exactly 1 signup credit, granted once per normalized email in this browser. Retrying signup will not create duplicate credits.</div>
        </section>
        <section class="auth-card">
          <div class="tab-row" role="tablist">
            <button class="${mode === "signup" ? "active" : ""}" data-auth-tab="signup" type="button">Create account</button>
            <button class="${mode === "signin" ? "active" : ""}" data-auth-tab="signin" type="button">Sign in</button>
          </div>
          <form data-auth-form="${mode}">
            <label>Name${mode === "signin" ? " (optional)" : ""}<input name="name" autocomplete="name" ${mode === "signin" ? "" : "required"}></label>
            <label>Email<input name="email" type="email" autocomplete="email" required></label>
            <label>Password<input name="password" type="password" autocomplete="${mode === "signin" ? "current-password" : "new-password"}" minlength="6" required></label>
            <p class="form-help">Use at least 6 characters. StandardCraft does not ask for student names or student data.</p>
            <button class="button full" type="submit">${mode === "signin" ? "Sign in" : "Create account and start browsing"}</button>
            <p class="form-message" role="status"></p>
          </form>
        </section>
      </main>
    `);
  }

  function libraryPage() {
    const filtered = resources.filter((resource) => {
      const queryMatch = !state.query || `${resource.title} ${resource.subject} ${resource.gradeBand} ${resource.resourceType} ${resource.shortDescription}`.toLowerCase().includes(state.query.toLowerCase());
      const subjectMatch = state.subject === "All" || resource.subject === state.subject;
      const gradeMatch = state.gradeBand === "All" || resource.gradeBand === state.gradeBand;
      return queryMatch && subjectMatch && gradeMatch;
    });

    return layout(html`
      <main id="main" class="page-shell">
        <div class="library-hero">
          <div>
            <p class="eyebrow">Free resource library</p>
            <h1>Browse ${totalResources} resources. Download one free with your signup credit.</h1>
            <p>Preview every resource before you choose. Alignment notes, SDI ideas, and MLL/ELL supports are visible before download.</p>
          </div>
          ${creditStatus()}
        </div>
        <section class="filters" aria-label="Resource filters">
          <label>Search resources<input data-filter="query" value="${escapeHtml(state.query)}" placeholder="Search subject, skill, or resource type"></label>
          <label>Subject<select data-filter="subject">${subjects.map((subject) => `<option ${subject === state.subject ? "selected" : ""}>${escapeHtml(subject)}</option>`).join("")}</select></label>
          <label>Grade band<select data-filter="gradeBand">${gradeBands.map((gradeBand) => `<option ${gradeBand === state.gradeBand ? "selected" : ""}>${escapeHtml(gradeBand)}</option>`).join("")}</select></label>
        </section>
        <p class="result-count">${filtered.length} of ${totalResources} resource cards shown.</p>
        ${filtered.length ? `<section class="card-grid library-grid">${filtered.map(resourceCard).join("")}</section>` : `<section class="empty-state"><h2>No resources match those filters.</h2><p>Try a broader subject, grade band, or keyword. The launch library currently contains ${totalResources} resources.</p></section>`}
      </main>
    `);
  }

  function creditStatus() {
    const user = currentUser();
    if (!user) {
      return `<aside class="credit-card"><strong>1</strong><span>free signup credit after account creation</span><a href="/claim-free" data-link>Start free</a></aside>`;
    }
    if (user.credits > 0) {
      return `<aside class="credit-card"><strong>${user.credits}</strong><span>free signup credit available</span></aside>`;
    }
    return `<aside class="credit-card exhausted"><strong>0</strong><span>free credits remaining</span><a href="/pricing" data-link>Upgrade for more downloads</a></aside>`;
  }

  function resourceCard(resource) {
    return html`
      <article class="resource-card">
        <div class="resource-meta"><span>${escapeHtml(resource.subject)}</span><span>${escapeHtml(resource.gradeBand)}</span></div>
        <h3>${escapeHtml(resource.title)}</h3>
        <p>${escapeHtml(resource.shortDescription)}</p>
        <dl>
          <dt>Type</dt><dd>${escapeHtml(resource.resourceType)}</dd>
          <dt>NYS label</dt><dd>${escapeHtml(resource.nysFrameworkLabel)}</dd>
        </dl>
        <div class="support-tags"><span>Alignment record</span><span>SDI support</span><span>MLL/ELL support</span></div>
        <a class="card-link" href="/resources/${resource.slug}" data-link>Open preview</a>
      </article>
    `;
  }

  function resourcePage(slug) {
    const resource = resources.find((item) => item.slug === slug);
    if (!resource) return notFoundPage();
    const user = currentUser();
    const downloaded = Boolean(user && user.downloads && user.downloads.includes(resource.slug));
    const canDownload = Boolean(user && (user.credits > 0 || downloaded));
    const buttonText = !user ? "Sign in to use your free credit" : downloaded ? "Download again" : user.credits > 0 ? "Use 1 credit and download" : "Upgrade for more downloads";

    return layout(html`
      <main id="main" class="page-shell resource-detail">
        <a class="back-link" href="/free-resource-library" data-link>Back to library</a>
        <section class="detail-header">
          <div>
            <p class="eyebrow">${escapeHtml(resource.subject)} / ${escapeHtml(resource.gradeBand)}</p>
            <h1>${escapeHtml(resource.title)}</h1>
            <p>${escapeHtml(resource.shortDescription)}</p>
          </div>
          ${creditStatus()}
        </section>
        <section class="detail-grid">
          <article class="detail-card">
            <h2>Preview</h2>
            <ul>${resource.previewContent.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </article>
          <article class="detail-card">
            <h2>Resource details</h2>
            <dl>
              <dt>Resource type</dt><dd>${escapeHtml(resource.resourceType)}</dd>
              <dt>NYS framework label</dt><dd>${escapeHtml(resource.nysFrameworkLabel)}</dd>
              <dt>Alignment note</dt><dd>${escapeHtml(resource.alignmentNote)}</dd>
              <dt>Classroom use case</dt><dd>${escapeHtml(resource.classroomUseCase)}</dd>
              <dt>SDI support idea</dt><dd>${escapeHtml(resource.sdiSupport)}</dd>
              <dt>MLL/ELL support idea</dt><dd>${escapeHtml(resource.mllEllSupport)}</dd>
            </dl>
          </article>
        </section>
        <section class="download-panel">
          <div>
            <h2>Download rule</h2>
            <p>Free accounts can browse all ${totalResources} resources and download one resource with the signup credit. Re-downloading a resource you already claimed costs 0 additional credits.</p>
            <p class="form-message" role="status" data-download-message></p>
          </div>
          <button class="button" data-download="${resource.slug}" ${state.lockedSlug === resource.slug ? "disabled" : ""}>${buttonText}</button>
          ${user && !canDownload ? `<a class="button secondary" href="/pricing" data-link>See upgrade options</a>` : ""}
        </section>
      </main>
    `);
  }

  function dashboardPage() {
    const user = currentUser();
    if (!user) return claimPage("signin");
    const downloads = resources.filter((resource) => user.downloads && user.downloads.includes(resource.slug));
    return layout(html`
      <main id="main" class="page-shell">
        <p class="eyebrow">Dashboard</p>
        <h1>Welcome, ${escapeHtml(user.name || user.email)}.</h1>
        <div class="dashboard-grid">
          ${creditStatus()}
          <article class="detail-card">
            <h2>Downloaded resources</h2>
            ${downloads.length ? downloads.map((resource) => `<p><a href="/resources/${resource.slug}" data-link>${escapeHtml(resource.title)}</a></p>`).join("") : "<p>No downloads yet. Browse the library and choose one resource with your free signup credit.</p>"}
          </article>
          <article class="detail-card">
            <h2>Subscription status</h2>
            <p><strong>Free Sampler</strong></p>
            <p>Paid checkout is not enabled in this static build. Classroom, Pro, and School access are contact-gated until Stripe environment variables and webhooks are configured.</p>
            <a class="button secondary" href="/pricing" data-link>View upgrade paths</a>
          </article>
        </div>
      </main>
    `);
  }

  function pricingPage() {
    const annual = state.billing === "annual";
    const plans = [
      {
        name: "Sampler",
        monthly: "Free",
        annual: "Free",
        equivalent: "No card required",
        credits: "1 signup only",
        perCredit: "—",
        summary: "Browse the full preview library and download one resource with your signup credit.",
        cta: "Claim my free resource",
        href: "/claim-free"
      },
      {
        name: "Classroom",
        monthly: "$29/mo",
        annual: "$210/yr",
        equivalent: "$17.50/mo equivalent",
        credits: "8/mo",
        perCredit: "~$3.63",
        savings: "Annual saves $138/yr (40%).",
        summary: "For an individual teacher who wants a steady monthly resource workflow.",
        cta: "Start Classroom",
        href: "/contact",
        featured: true
      },
      {
        name: "Pro",
        monthly: "$69/mo",
        annual: "$690/yr",
        equivalent: "$57.50/mo equivalent",
        credits: "20/mo",
        perCredit: "~$3.45",
        savings: "Annual saves $138/yr (20%).",
        summary: "For teachers, coaches, specialists, or frequent planners who need more downloads.",
        cta: "Start Pro",
        href: "/contact"
      },
      {
        name: "School",
        monthly: "$249+/mo",
        annual: "Custom / PO billing",
        equivalent: "Manual procurement path",
        credits: "Pooled",
        perCredit: "Negotiated",
        summary: "For grade teams, schools, and districts that need pooled access and onboarding.",
        cta: "Request a school quote",
        href: "/school-inquiry"
      }
    ];

    return layout(html`
      <main id="main" class="page-shell pricing-page">
        <section class="page-intro compact-intro">
          <div>
            <p class="eyebrow">Pricing</p>
            <h1>Clear credits for classroom-ready NYS resources.</h1>
            <p>Every resource costs 1 credit to download. Re-downloads are free after a resource is claimed.</p>
          </div>
          <div class="billing-toggle" role="group" aria-label="Billing period">
            <button type="button" class="${!annual ? "active" : ""}" data-billing="monthly">Monthly</button>
            <button type="button" class="${annual ? "active" : ""}" data-billing="annual">Annual</button>
          </div>
        </section>

        <section class="pricing-grid pricing-grid-four">
          ${plans.map((plan) => `
            <article class="price-card ${plan.featured ? "featured" : ""}">
              <div>
                <h2>${plan.name}</h2>
                <p class="price">${annual ? plan.annual : plan.monthly}</p>
                <p class="price-note">${annual ? plan.equivalent : plan.name === "Sampler" ? plan.equivalent : plan.annual}</p>
              </div>
              <dl class="price-facts">
                <dt>Credits</dt><dd>${plan.credits}</dd>
                <dt>Per-credit cost</dt><dd>${plan.perCredit}</dd>
              </dl>
              ${plan.savings ? `<p class="savings">${plan.savings}</p>` : ""}
              <p>${plan.summary}</p>
              <a class="button ${plan.name === "Pro" || plan.name === "School" ? "secondary" : ""}" href="${plan.href}" data-link>${plan.cta}</a>
            </article>
          `).join("")}
        </section>

        <section class="pricing-detail-grid">
          <article class="detail-card">
            <h2>Credit rules</h2>
            <ul class="dense-list">
              <li>Every resource costs <strong>1 credit</strong> to download regardless of type.</li>
              <li>Signup includes <strong>1 credit</strong> for one free download with no card required.</li>
              <li>Credits do not roll over at the end of the billing month.</li>
              <li>Re-downloads are free after a resource has been claimed.</li>
              <li>Subscription credits are granted at the start of each billing cycle.</li>
            </ul>
          </article>
          <article class="detail-card">
            <h2>Checkout readiness</h2>
            <p>Classroom and Pro pricing is shown using the required production prices. Checkout requires Stripe price IDs and server-side session creation before payment buttons can be live.</p>
            <p class="form-help">Required Stripe env names: <code>STRIPE_PRICE_CLASSROOM_MONTHLY</code>, <code>STRIPE_PRICE_CLASSROOM_ANNUAL</code>, <code>STRIPE_PRICE_PRO_MONTHLY</code>, <code>STRIPE_PRICE_PRO_ANNUAL</code>.</p>
          </article>
          <article class="detail-card">
            <h2>School plan</h2>
            <p>School access starts at $249+/mo with pooled credits and custom or PO billing. No Stripe checkout is used for schools.</p>
            <p>A school inquiry requires manual follow-up and DSA execution before onboarding school accounts under Ed Law §2-d.</p>
          </article>
        </section>
        <section class="notice pricing-note">
          Annual savings are plan-specific: Classroom saves $138/yr (40%) and Pro saves $138/yr (20%). If Pro should also save about 40%, its annual Stripe price should be about $497/yr instead of $690/yr.
        </section>
      </main>
    `);
  }

  function schoolInquiryPage(kind = "school") {
    const isContact = kind === "contact";
    return layout(html`
      <main id="main" class="page-shell auth-shell">
        <section>
          <p class="eyebrow">${isContact ? "Contact" : "School and district inquiry"}</p>
          <h1>${isContact ? "Talk with StandardCraft." : "Plan a credible school rollout."}</h1>
          <p>${isContact ? "Use this form for billing setup, support, partnership, or product questions." : "Use this form for grade-team, school, or district conversations about StandardCraft access, privacy, procurement, and classroom planning support."}</p>
          <div class="notice">StandardCraft does not require student data for teacher browsing, previews, or free resource access.</div>
        </section>
        <form class="auth-card" name="school-inquiry" method="POST" data-netlify="true" netlify-honeypot="bot-field" data-school-form>
          <input type="hidden" name="form-name" value="school-inquiry">
          <p class="hidden"><label>Do not fill this out<input name="bot-field"></label></p>
          <label>Name<input name="name" autocomplete="name" required></label>
          <label>Email<input name="email" type="email" autocomplete="email" required></label>
          <label>School or district<input name="school" required></label>
          <label>Role<input name="role" placeholder="Teacher, coach, principal, district leader"></label>
          <label>What are you hoping to support?<textarea name="message" rows="5" required></textarea></label>
          <button class="button full" type="submit">${isContact ? "Send message" : "Request a school quote"}</button>
          <p class="form-message" role="status"></p>
        </form>
      </main>
    `);
  }

  function accountPage() {
    const user = currentUser();
    if (!user) return claimPage("signin");
    return layout(html`
      <main id="main" class="page-shell narrow">
        <p class="eyebrow">Account</p>
        <h1>${escapeHtml(user.email)}</h1>
        <div class="credit-card"><strong>${user.credits}</strong><span>free credits remaining</span></div>
        <p>Your free signup credit is granted once per normalized email. ${user.credits === 0 ? "Upgrade paths are contact-gated until Stripe checkout is configured." : "Use it for the resource that best fits your next lesson."}</p>
        <div class="detail-card">
          <h2>Subscription status</h2>
          <p>Free Sampler. Paid subscriptions are not active in this static build.</p>
        </div>
        <div class="hero-actions">
          <a class="button" href="/free-resource-library" data-link>Browse resources</a>
          <a class="button secondary" href="/pricing" data-link>View pricing</a>
        </div>
      </main>
    `);
  }

  function policyPage(kind) {
    const pages = {
      privacy: ["Privacy", "Privacy and student-data posture", "StandardCraft does not require student names, student identifiers, or classroom rosters to browse previews, create a free account, or use the signup credit. Account information in this static demo is stored in browser local storage; production auth should move to a server-backed provider before paid launch."],
      terms: ["Terms", "Terms of use", "StandardCraft resources support teacher planning and classroom use. They do not replace district curriculum, local requirements, accommodations teams, or professional judgment. StandardCraft is independent from NYSED and does not imply endorsement."],
      "data-security": ["Data security", "Data security commitments", "The current static site exposes only public resource metadata and downloadable sample files. No secret keys are shipped client-side. Production billing, authentication, and download entitlements should run through server-side functions with environment-managed secrets."],
      refunds: ["Refunds", "Refunds and billing readiness", "Paid checkout is not active yet. Refund language should be finalized before Stripe production launch. Until then, Classroom and Pro requests are routed through contact rather than pretending checkout is live."]
    };
    const [eyebrow, title, body] = pages[kind] || pages.terms;
    return layout(html`
      <main id="main" class="page-shell narrow">
        <p class="eyebrow">${eyebrow}</p>
        <h1>${title}</h1>
        <p>${body}</p>
        <div class="check-list">
          <p><strong>NYS independence:</strong> StandardCraft is not affiliated with or endorsed by NYSED.</p>
          <p><strong>Teacher judgment:</strong> Resources are planning support, not a curriculum mandate.</p>
          <p><strong>Student data:</strong> No student data is required for the free browsing and download flow.</p>
        </div>
      </main>
    `);
  }

  function notFoundPage() {
    return layout(html`
      <main id="main" class="page-shell narrow">
        <p class="eyebrow">Page not found</p>
        <h1>That page is not in the StandardCraft library.</h1>
        <a class="button" href="/free-resource-library" data-link>Browse resources</a>
      </main>
    `);
  }

  function handleAuthSubmit(form) {
    const mode = form.dataset.authForm;
    const formData = new FormData(form);
    const email = normalizeEmail(formData.get("email"));
    const password = String(formData.get("password") || "");
    const name = String(formData.get("name") || "").trim();
    const message = form.querySelector(".form-message");
    const users = readUsers();

    if (!email || password.length < 6) {
      message.textContent = "Use a valid email and a password with at least 6 characters.";
      return;
    }

    if (mode === "signup") {
      if (users[email]) {
        message.textContent = "This email already has a StandardCraft account. Sign in to continue. A second free credit was not created.";
        return;
      }
      const user = {
        email,
        name,
        password,
        credits: 1,
        freeCreditGranted: true,
        downloads: [],
        createdAt: new Date().toISOString()
      };
      users[email] = user;
      writeUsers(users);
      localStorage.setItem(storageKeys.currentEmail, email);
      navigate("/free-resource-library");
      return;
    }

    if (!users[email] || users[email].password !== password) {
      message.textContent = "We could not find that email and password. Create a free account if you are new.";
      return;
    }
    localStorage.setItem(storageKeys.currentEmail, email);
    navigate("/free-resource-library");
  }

  function downloadFile(resource) {
    const anchor = document.createElement("a");
    anchor.href = resource.downloadPath;
    anchor.download = `${resource.slug}.md`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  function handleDownload(slug) {
    const resource = resources.find((item) => item.slug === slug);
    const message = document.querySelector("[data-download-message]");
    if (!resource || state.lockedSlug) return;

    let user = currentUser();
    if (!user) {
      navigate("/claim-free");
      return;
    }

    const alreadyDownloaded = user.downloads && user.downloads.includes(slug);
    if (!alreadyDownloaded && user.credits <= 0) {
      if (message) message.textContent = "You have 0 free credits remaining. Upgrade for more downloads.";
      return;
    }

    state.lockedSlug = slug;
    render();

    window.setTimeout(() => {
      user = currentUser();
      const freshDownloads = Array.isArray(user.downloads) ? [...user.downloads] : [];
      if (!freshDownloads.includes(slug)) {
        if (user.credits <= 0) {
          state.lockedSlug = "";
          render();
          return;
        }
        freshDownloads.push(slug);
        user = { ...user, credits: Math.max(0, user.credits - 1), downloads: freshDownloads };
        updateCurrentUser(user);
      }
      downloadFile(resource);
      state.lockedSlug = "";
      render();
    }, 150);
  }

  function bindEvents() {
    document.querySelectorAll("[data-link]").forEach((link) => {
      link.addEventListener("click", (event) => {
        const url = new URL(link.href);
        if (url.origin === window.location.origin) {
          event.preventDefault();
          navigate(url.pathname + url.search + url.hash);
        }
      });
    });

    const navToggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".site-nav");
    if (navToggle && nav) {
      navToggle.addEventListener("click", () => {
        const expanded = navToggle.getAttribute("aria-expanded") === "true";
        navToggle.setAttribute("aria-expanded", String(!expanded));
        nav.classList.toggle("open", !expanded);
      });
    }

    document.querySelectorAll("[data-auth-tab]").forEach((button) => {
      button.addEventListener("click", () => render(button.dataset.authTab === "signin" ? "/sign-in" : "/claim-free"));
    });

    document.querySelectorAll("[data-auth-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        handleAuthSubmit(form);
      });
    });

    document.querySelectorAll("[data-filter]").forEach((field) => {
      field.addEventListener("input", () => {
        state[field.dataset.filter] = field.value;
        render();
      });
      field.addEventListener("change", () => {
        state[field.dataset.filter] = field.value;
        render();
      });
    });

    document.querySelectorAll("[data-download]").forEach((button) => {
      button.addEventListener("click", () => handleDownload(button.dataset.download));
    });

    document.querySelectorAll("[data-action='sign-out']").forEach((button) => {
      button.addEventListener("click", signOut);
    });

    document.querySelectorAll("[data-billing]").forEach((button) => {
      button.addEventListener("click", () => {
        state.billing = button.dataset.billing;
        render();
      });
    });

    document.querySelectorAll("[data-school-form]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = form.querySelector(".form-message");
        const body = new URLSearchParams(new FormData(form)).toString();
        try {
          await fetch("/__forms.html", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body
          });
          form.reset();
          message.textContent = "Thanks. Your inquiry is ready for the StandardCraft team.";
        } catch {
          message.textContent = "Something went wrong. Please try again or email the StandardCraft team directly.";
        }
      });
    });
  }

  function render(forcedPath) {
    if (forcedPath) window.history.pushState({}, "", forcedPath);
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    let content;

    if (path === "/") content = homePage();
    else if (path === "/claim-free") content = claimPage("signup");
    else if (path === "/sign-in") content = claimPage("signin");
    else if (path === "/free-resource-library" || path === "/resources") content = libraryPage();
    else if (path === "/dashboard") content = dashboardPage();
    else if (path === "/pricing") content = pricingPage();
    else if (path === "/school-inquiry" || path === "/schools") content = schoolInquiryPage("school");
    else if (path === "/contact") content = schoolInquiryPage("contact");
    else if (["/privacy", "/terms", "/data-security", "/refunds"].includes(path)) content = policyPage(path.slice(1));
    else if (path === "/account") content = accountPage();
    else if (path.startsWith("/resources/")) content = resourcePage(path.split("/").pop());
    else content = notFoundPage();

    document.getElementById("app").innerHTML = content;
    bindEvents();
  }

  window.addEventListener("popstate", () => render());
  render();
})();
