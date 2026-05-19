"use strict";

const STORE_KEY = "blessed-cv-data-v1";

const blank = () => ({
  personal: { fullName: "", title: "", email: "", phone: "", location: "", website: "", summary: "", photo: "" },
  experience: [],
  education: [],
  skills: [],
  languages: [],
  projects: [],
  certifications: [],
  awards: [],
  references: [],
  settings: { template: "classic", font: "sans", accent: "#2563eb" },
});

let cv = load();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw);
    return Object.assign(blank(), parsed, {
      settings: Object.assign(blank().settings, parsed.settings || {}),
      personal: Object.assign(blank().personal, parsed.personal || {}),
    });
  } catch {
    return blank();
  }
}

let saveTimer = null;
function save() {
  const status = document.getElementById("save-status");
  status.textContent = "Saving…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(cv));
    status.textContent = "Saved";
  }, 350);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

/* ---------- Editor ---------- */

function textField(label, value, oninput, opts = {}) {
  const f = document.createElement("div");
  f.className = "field";
  const id = "f" + Math.random().toString(36).slice(2);
  f.innerHTML = `<label for="${id}">${esc(label)}</label>` +
    (opts.area
      ? `<textarea id="${id}" rows="${opts.rows || 4}"></textarea>`
      : `<input id="${id}" type="${opts.type || "text"}" />`);
  const input = f.querySelector(opts.area ? "textarea" : "input");
  input.value = value || "";
  input.addEventListener("input", () => { oninput(input.value); save(); renderPreview(); });
  return f;
}

function makeGroup(title, open, builder) {
  const d = document.createElement("details");
  d.className = "group";
  d.open = open;
  const s = document.createElement("summary");
  s.innerHTML = `<span>${esc(title)}</span><span>▾</span>`;
  const body = document.createElement("div");
  body.className = "group-body";
  builder(body);
  d.append(s, body);
  return d;
}

function listEditor(body, arr, fields, factory) {
  arr.forEach((obj, i) => {
    const item = document.createElement("div");
    item.className = "item";

    const ctrls = document.createElement("div");
    ctrls.className = "item-ctrls";

    const up = document.createElement("button");
    up.className = "mv";
    up.textContent = "↑";
    up.title = "Move up";
    up.disabled = i === 0;
    up.onclick = () => {
      [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      save(); renderEditor(); renderPreview();
    };

    const down = document.createElement("button");
    down.className = "mv";
    down.textContent = "↓";
    down.title = "Move down";
    down.disabled = i === arr.length - 1;
    down.onclick = () => {
      [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
      save(); renderEditor(); renderPreview();
    };

    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "Delete";
    del.onclick = () => {
      if (!confirm("Delete this entry?")) return;
      arr.splice(i, 1); save(); renderEditor(); renderPreview();
    };

    ctrls.append(up, down, del);
    item.appendChild(ctrls);
    fields.forEach((fl) => {
      if (fl.row) {
        const row = document.createElement("div");
        row.className = "row2";
        fl.row.forEach((sub) =>
          row.appendChild(textField(sub.label, obj[sub.key], (v) => (obj[sub.key] = v), sub.opts))
        );
        item.appendChild(row);
      } else if (fl.check) {
        const w = document.createElement("label");
        w.className = "inline";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !!obj[fl.key];
        cb.onchange = () => { obj[fl.key] = cb.checked; save(); renderPreview(); };
        w.append(cb, document.createTextNode(fl.label));
        item.appendChild(w);
      } else {
        item.appendChild(textField(fl.label, obj[fl.key], (v) => (obj[fl.key] = v), fl.opts));
      }
    });
    body.appendChild(item);
  });
  const add = document.createElement("button");
  add.className = "add-btn";
  add.textContent = "+ Add";
  add.onclick = () => { arr.push(factory()); save(); renderEditor(); renderPreview(); };
  body.appendChild(add);
}

function photoField(p) {
  const f = document.createElement("div");
  f.className = "field photo-field";
  f.innerHTML = `<label>Photo</label>`;

  const wrap = document.createElement("div");
  wrap.className = "photo-wrap";

  const thumb = document.createElement("div");
  thumb.className = "photo-thumb";
  if (p.photo) thumb.style.backgroundImage = `url("${p.photo}")`;
  else thumb.textContent = "No photo";

  const pick = document.createElement("button");
  pick.className = "btn";
  pick.type = "button";
  pick.textContent = p.photo ? "Change" : "Upload";

  const remove = document.createElement("button");
  remove.className = "btn";
  remove.type = "button";
  remove.textContent = "Remove";
  remove.style.display = p.photo ? "" : "none";

  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/*";
  file.hidden = true;

  pick.onclick = () => file.click();
  file.onchange = () => {
    const img = file.files[0];
    if (!img) return;
    if (img.size > 3 * 1024 * 1024) { alert("Please pick an image under 3 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { p.photo = reader.result; save(); renderEditor(); renderPreview(); };
    reader.readAsDataURL(img);
  };
  remove.onclick = () => { p.photo = ""; save(); renderEditor(); renderPreview(); };

  wrap.append(thumb, pick, remove, file);
  f.appendChild(wrap);
  return f;
}

function renderEditor() {
  const root = document.getElementById("editor");
  root.innerHTML = "";
  const p = cv.personal;

  root.appendChild(
    makeGroup("Personal Info", true, (b) => {
      b.appendChild(photoField(p));
      b.appendChild(textField("Full Name", p.fullName, (v) => (p.fullName = v)));
      b.appendChild(textField("Title / Position", p.title, (v) => (p.title = v)));
      const r1 = document.createElement("div");
      r1.className = "row2";
      r1.appendChild(textField("Email", p.email, (v) => (p.email = v), { type: "email" }));
      r1.appendChild(textField("Phone", p.phone, (v) => (p.phone = v)));
      b.appendChild(r1);
      const r2 = document.createElement("div");
      r2.className = "row2";
      r2.appendChild(textField("Location", p.location, (v) => (p.location = v)));
      r2.appendChild(textField("Web / LinkedIn", p.website, (v) => (p.website = v)));
      b.appendChild(r2);
      b.appendChild(textField("Summary", p.summary, (v) => (p.summary = v), { area: true, rows: 4 }));
    })
  );

  root.appendChild(
    makeGroup("Experience", true, (b) =>
      listEditor(b, cv.experience,
        [
          { row: [{ label: "Company", key: "company" }, { label: "Position", key: "role" }] },
          { row: [{ label: "Start", key: "start" }, { label: "End", key: "end" }] },
          { check: true, label: "Currently working here", key: "current" },
          { label: "Description", key: "description", opts: { area: true, rows: 4 } },
        ],
        () => ({ company: "", role: "", start: "", end: "", current: false, description: "" })
      )
    )
  );

  root.appendChild(
    makeGroup("Education", false, (b) =>
      listEditor(b, cv.education,
        [
          { row: [{ label: "School", key: "school" }, { label: "Degree", key: "degree" }] },
          { row: [{ label: "Field", key: "field" }, { label: "GPA", key: "gpa" }] },
          { row: [{ label: "Start", key: "start" }, { label: "End", key: "end" }] },
          { label: "Description", key: "description", opts: { area: true, rows: 3 } },
        ],
        () => ({ school: "", degree: "", field: "", gpa: "", start: "", end: "", description: "" })
      )
    )
  );

  root.appendChild(
    makeGroup("Projects", false, (b) =>
      listEditor(b, cv.projects,
        [
          { row: [{ label: "Project name", key: "name" }, { label: "Link", key: "link" }] },
          { label: "Description", key: "description", opts: { area: true, rows: 3 } },
        ],
        () => ({ name: "", link: "", description: "" })
      )
    )
  );

  root.appendChild(
    makeGroup("Skills", false, (b) => {
      b.appendChild(
        textField("Skills (comma separated)", cv.skills.join(", "),
          (v) => (cv.skills = v.split(",").map((s) => s.trim()).filter(Boolean)),
          { area: true, rows: 2 }
        )
      );
    })
  );

  root.appendChild(
    makeGroup("Languages", false, (b) =>
      listEditor(b, cv.languages,
        [{ row: [{ label: "Language", key: "name" }, { label: "Level", key: "level" }] }],
        () => ({ name: "", level: "" })
      )
    )
  );

  root.appendChild(
    makeGroup("Certifications", false, (b) =>
      listEditor(b, cv.certifications,
        [
          { row: [{ label: "Name", key: "name" }, { label: "Issuer", key: "issuer" }] },
          { row: [{ label: "Year", key: "year" }, { label: "Link", key: "link" }] },
        ],
        () => ({ name: "", issuer: "", year: "", link: "" })
      )
    )
  );

  root.appendChild(
    makeGroup("Awards", false, (b) =>
      listEditor(b, cv.awards,
        [
          { row: [{ label: "Title", key: "title" }, { label: "Issuer", key: "issuer" }] },
          { row: [{ label: "Year", key: "year" }] },
          { label: "Description", key: "description", opts: { area: true, rows: 2 } },
        ],
        () => ({ title: "", issuer: "", year: "", description: "" })
      )
    )
  );

  root.appendChild(
    makeGroup("References", false, (b) =>
      listEditor(b, cv.references,
        [
          { row: [{ label: "Name", key: "name" }, { label: "Role / Company", key: "role" }] },
          { label: "Contact", key: "contact" },
        ],
        () => ({ name: "", role: "", contact: "" })
      )
    )
  );
}

/* ---------- Preview ---------- */

function dateRange(a, b, current) {
  const end = current ? "Present" : b;
  return [a, end].filter(Boolean).join(" – ");
}

function entriesHTML(arr, map) {
  return arr.map(map).join("");
}

function renderPreview() {
  const el = document.getElementById("preview");
  const s = cv.settings;
  el.dataset.tpl = s.template;
  el.className = "page font-" + s.font;
  el.style.setProperty("--accent", s.accent);
  document.documentElement.style.setProperty("--accent", s.accent);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", s.accent);

  const p = cv.personal;
  const contact = [p.email, p.phone, p.location, p.website]
    .filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join("");

  const photo = p.photo
    ? `<div class="cv-photo" style="background-image:url('${p.photo}')"></div>` : "";

  const head = `
    ${photo}
    <h1>${esc(p.fullName) || "Full Name"}</h1>
    ${p.title ? `<div class="role">${esc(p.title)}</div>` : ""}
    ${contact ? `<div class="contact">${contact}</div>` : ""}`;

  const summary = p.summary
    ? `<section><h2>Summary</h2><div class="summary">${esc(p.summary)}</div></section>` : "";

  const exp = cv.experience.length ? `<section><h2>Experience</h2>${entriesHTML(cv.experience, (e) => `
      <div class="entry">
        <div class="entry-head">
          <div><div class="entry-title">${esc(e.role) || "Position"}</div>
          <div class="entry-sub">${esc(e.company)}</div></div>
          <div class="entry-date">${esc(dateRange(e.start, e.end, e.current))}</div>
        </div>
        ${e.description ? `<div class="entry-desc">${esc(e.description)}</div>` : ""}
      </div>`)}</section>` : "";

  const edu = cv.education.length ? `<section><h2>Education</h2>${entriesHTML(cv.education, (e) => {
      const sub = [
        [e.degree, e.field].filter(Boolean).join(", "),
        e.gpa ? `GPA: ${e.gpa}` : "",
      ].filter(Boolean).map(esc).join(" · ");
      const date = [e.start, e.end].filter(Boolean).join(" – ") || e.years || "";
      return `
      <div class="entry">
        <div class="entry-head">
          <div><div class="entry-title">${esc(e.school)}</div>
          <div class="entry-sub">${sub}</div></div>
          <div class="entry-date">${esc(date)}</div>
        </div>
        ${e.description ? `<div class="entry-desc">${esc(e.description)}</div>` : ""}
      </div>`;
    })}</section>` : "";

  const proj = cv.projects.length ? `<section><h2>Projects</h2>${entriesHTML(cv.projects, (e) => `
      <div class="entry">
        <div class="entry-head">
          <div class="entry-title">${esc(e.name)}</div>
          ${e.link ? `<div class="entry-date">${esc(e.link)}</div>` : ""}
        </div>
        ${e.description ? `<div class="entry-desc">${esc(e.description)}</div>` : ""}
      </div>`)}</section>` : "";

  const skills = cv.skills.length
    ? `<section><h2>Skills</h2><div class="chips">${cv.skills.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div></section>` : "";

  const langs = cv.languages.length
    ? `<section><h2>Languages</h2><div class="langs">${cv.languages.map((l) => `<span>${esc(l.name)}${l.level ? " — " + esc(l.level) : ""}</span>`).join("")}</div></section>` : "";

  const certs = cv.certifications.length ? `<section><h2>Certifications</h2>${entriesHTML(cv.certifications, (c) => `
      <div class="entry">
        <div class="entry-head">
          <div><div class="entry-title">${esc(c.name)}</div>
          <div class="entry-sub">${esc(c.issuer)}${c.link ? ` · ${esc(c.link)}` : ""}</div></div>
          <div class="entry-date">${esc(c.year)}</div>
        </div>
      </div>`)}</section>` : "";

  const awards = cv.awards.length ? `<section><h2>Awards</h2>${entriesHTML(cv.awards, (a) => `
      <div class="entry">
        <div class="entry-head">
          <div><div class="entry-title">${esc(a.title)}</div>
          <div class="entry-sub">${esc(a.issuer)}</div></div>
          <div class="entry-date">${esc(a.year)}</div>
        </div>
        ${a.description ? `<div class="entry-desc">${esc(a.description)}</div>` : ""}
      </div>`)}</section>` : "";

  const refs = cv.references.length ? `<section><h2>References</h2>${entriesHTML(cv.references, (r) => `
      <div class="entry">
        <div class="entry-title">${esc(r.name)}</div>
        <div class="entry-sub">${[r.role, r.contact].filter(Boolean).map(esc).join(" · ")}</div>
      </div>`)}</section>` : "";

  const isEmpty = !p.fullName && !cv.experience.length && !cv.education.length;
  const hint = isEmpty ? `<p class="empty-hint">Fill in the form on the left and your CV will appear here live.</p>` : "";

  if (s.template === "modern") {
    el.innerHTML = `<div class="cv">
      <aside class="side">${head}${skills}${langs}</aside>
      <div class="main">${head}${hint}${summary}${exp}${edu}${proj}${certs}${awards}${refs}</div>
    </div>`;
  } else {
    el.innerHTML = `<div class="cv">${head}${hint}${summary}${exp}${edu}${proj}${skills}${langs}${certs}${awards}${refs}</div>`;
  }
}

/* ---------- Toolbar ---------- */

function bindToolbar() {
  const tpl = document.getElementById("tpl");
  const font = document.getElementById("font");
  const accent = document.getElementById("accent");
  tpl.value = cv.settings.template;
  font.value = cv.settings.font;
  accent.value = cv.settings.accent;

  tpl.onchange = () => { cv.settings.template = tpl.value; save(); renderPreview(); };
  font.onchange = () => { cv.settings.font = font.value; save(); renderPreview(); };
  accent.oninput = () => { cv.settings.accent = accent.value; save(); renderPreview(); };

  document.getElementById("btn-pdf").onclick = () => window.print();

  document.getElementById("btn-new").onclick = () => {
    if (!confirm("Start a new CV? This clears all current data. Tip: use 'Backup JSON' first.")) return;
    cv = blank();
    save();
    bindToolbar();
    renderEditor();
    renderPreview();
  };

  document.getElementById("btn-export").onclick = () => {
    const blob = new Blob([JSON.stringify(cv, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const name = (cv.personal.fullName || "cv").trim().replace(/\s+/g, "-").toLowerCase();
    a.download = `${name}-blessed-cv.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const fileInput = document.getElementById("file-import");
  document.getElementById("btn-import").onclick = () => fileInput.click();
  fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        cv = Object.assign(blank(), data, {
          settings: Object.assign(blank().settings, data.settings || {}),
          personal: Object.assign(blank().personal, data.personal || {}),
        });
        save();
        bindToolbar();
        renderEditor();
        renderPreview();
      } catch {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
    fileInput.value = "";
  };
}

/* ---------- Init ---------- */

bindToolbar();
renderEditor();
renderPreview();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
