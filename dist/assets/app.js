(function () {
  const resources = window.STANDARDCRAFT_RESOURCES || [];
  const state = {
    query: "",
    subject: "All",
    gradeBand: "All",
    lockedSlug: ""
  };

  const storageKeys = {
    users: "standardcraft.users",
    currentEmail: "standardcraft.currentEmail"
  };

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
          <a href="/school-inquiry" data-link>School inquiry</a>
          <a href="/claim-free" data-link>Claim your free resource</a>
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
            <h1>Warm, practical resources for standards-aligned teaching days.</h1>
            <p class="lead">Browse 50 resources and download one free with your signup credit. StandardCraft helps teachers move from standards to usable classroom materials without the heavy lift.</p>
            <div class="hero-actions">
              <a class="button" href="/claim-free" data-link>Start free</a>
              <a class="button secondary" href="/free-resource-library" data-link>Preview the library</a>
            </div>
            <p class="microcopy">Browse 50 resources. Download one free with your signup credit. No payment required.</p>
          </div>
          <div class="hero-panel" aria-label="StandardCraft resource preview">
            <span class="panel-label">Teacher planning card</span>
            <h2>Grade 3-5 ELA</h2>
            <p>Main Idea Evidence Ladder</p>
            <ul>
              <li>Alignment note included</li>
              <li>Classroom use case included</li>
              <li>Ready-to-download file</li>
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
            ${["Create a free account", "Browse 50 NYS-aligned resources", "Download one with your free credit", "Upgrade when you need more"].map((step, index) => `<article><span>${index + 1}</span><h3>${step}</h3></article>`).join("")}
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
          </div>
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
      ["What does the free account include?", "A free account lets you browse 50 resources and download one resource with your signup credit."],
      ["Why can I browse 50 resources but download one free?", "The free signup credit is meant to let you try one resource before choosing whether to upgrade for more downloads."]
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
          <p>Browse 50 resources and download one free with your signup credit.</p>
          <div class="credit-card"><strong>${user.credits}</strong><span>signup ${user.credits === 1 ? "credit" : "credits"} available</span></div>
          <a class="button" href="/free-resource-library" data-link>Go to the free resource library</a>
        </main>
      `);
    }

    return layout(html`
      <main id="main" class="page-shell auth-shell">
        <section>
          <p class="eyebrow">Claim your free resource</p>
          <h1>Browse 50 resources and download one free with your signup credit.</h1>
          <p>No payment required. Use a school or personal email, then choose the resource that fits your next lesson.</p>
          <div class="notice">New users receive exactly 1 signup credit, granted once per normalized email in this browser.</div>
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
            <h1>Browse 50 resources. Download one free with your signup credit.</h1>
            <p>Preview every resource before you choose. Your account credit unlocks one download, and upgrade options are available when you need more.</p>
          </div>
          ${creditStatus()}
        </div>
        <section class="filters" aria-label="Resource filters">
          <label>Search resources<input data-filter="query" value="${escapeHtml(state.query)}" placeholder="Search subject, skill, or resource type"></label>
          <label>Subject<select data-filter="subject">${subjects.map((subject) => `<option ${subject === state.subject ? "selected" : ""}>${escapeHtml(subject)}</option>`).join("")}</select></label>
          <label>Grade band<select data-filter="gradeBand">${gradeBands.map((gradeBand) => `<option ${gradeBand === state.gradeBand ? "selected" : ""}>${escapeHtml(gradeBand)}</option>`).join("")}</select></label>
        </section>
        <p class="result-count">${filtered.length} of 50 resource cards shown.</p>
        <section class="card-grid library-grid">${filtered.map(resourceCard).join("")}</section>
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
            </dl>
          </article>
        </section>
        <section class="download-panel">
          <div>
            <h2>Download rule</h2>
            <p>Free accounts can browse all 50 resources and download one resource with the signup credit.</p>
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
        </div>
      </main>
    `);
  }

  function pricingPage() {
    return layout(html`
      <main id="main" class="page-shell">
        <p class="eyebrow">Pricing</p>
        <h1>Start free, then upgrade when the library becomes part of your planning rhythm.</h1>
        <section class="pricing-grid">
          <article class="price-card">
            <h2>Free</h2>
            <p class="price">$0</p>
            <p>Browse 50 resources and download one free with your signup credit.</p>
            <a class="button" href="/claim-free" data-link>Start free</a>
          </article>
          <article class="price-card featured">
            <h2>Teacher</h2>
            <p class="price">$9/mo</p>
            <p>More downloads for individual teachers who want ongoing planning support.</p>
            <a class="button" href="/account" data-link>Upgrade from account</a>
          </article>
          <article class="price-card">
            <h2>School</h2>
            <p class="price">Custom</p>
            <p>Shared access and planning support for grade teams, departments, and schools.</p>
            <a class="button secondary" href="/school-inquiry" data-link>Request school pricing</a>
          </article>
        </section>
      </main>
    `);
  }

  function schoolInquiryPage() {
    return layout(html`
      <main id="main" class="page-shell auth-shell">
        <section>
          <p class="eyebrow">School inquiry</p>
          <h1>Tell us what your teachers need.</h1>
          <p>Use this form for grade-team, school, or district conversations about StandardCraft access and classroom planning support.</p>
        </section>
        <form class="auth-card" name="school-inquiry" method="POST" data-netlify="true" netlify-honeypot="bot-field" data-school-form>
          <input type="hidden" name="form-name" value="school-inquiry">
          <p class="hidden"><label>Do not fill this out<input name="bot-field"></label></p>
          <label>Name<input name="name" autocomplete="name" required></label>
          <label>Email<input name="email" type="email" autocomplete="email" required></label>
          <label>School or district<input name="school" required></label>
          <label>Role<input name="role" placeholder="Teacher, coach, principal, district leader"></label>
          <label>What are you hoping to support?<textarea name="message" rows="5" required></textarea></label>
          <button class="button full" type="submit">Send inquiry</button>
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
        <p>Your free signup credit is granted once per normalized email. ${user.credits === 0 ? "Upgrade when you need more downloads." : "Use it for the resource that best fits your next lesson."}</p>
        <div class="hero-actions">
          <a class="button" href="/free-resource-library" data-link>Browse resources</a>
          <a class="button secondary" href="/pricing" data-link>View pricing</a>
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
          message.textContent = "Something went wrong. Please try again.";
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
    else if (path === "/free-resource-library") content = libraryPage();
    else if (path === "/dashboard") content = dashboardPage();
    else if (path === "/pricing") content = pricingPage();
    else if (path === "/school-inquiry") content = schoolInquiryPage();
    else if (path === "/account") content = accountPage();
    else if (path.startsWith("/resources/")) content = resourcePage(path.split("/").pop());
    else content = notFoundPage();

    document.getElementById("app").innerHTML = content;
    bindEvents();
  }

  window.addEventListener("popstate", () => render());
  render();
})();
