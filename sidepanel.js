const $ = (id) => document.getElementById(id);
const VIEWS = ["viewSetup", "viewEmpty", "viewReady", "viewLoading", "viewResult"];

// current = { key, type, emailType, notes, profile, result, selected, edits, deep, to, toNote }
let current = null;

function show(view) {
  VIEWS.forEach((v) => ($(v).hidden = v !== view));
}

function showError(msg) {
  $("errorBox").textContent = msg || "";
  $("errorBox").hidden = !msg;
}

function profileKey(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("linkedin.com")) return null;
    const m = u.pathname.match(/^\/in\/([^/]+)/);
    return m ? "p:" + decodeURIComponent(m[1]).toLowerCase() : null;
  } catch {
    return null;
  }
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function save() {
  if (current?.key) chrome.storage.session.set({ [current.key]: current });
}

function setBusy(btn, text) {
  btn.dataset.label = btn.textContent;
  btn.textContent = text;
  btn.disabled = true;
}

function clearBusy(btn) {
  if (btn.dataset.label) btn.textContent = btn.dataset.label;
  delete btn.dataset.label;
  btn.disabled = false;
}

// ---------------- Which view to show ----------------

async function refresh() {
  const s = await getSettings();
  if (!s.apiKey || !s.template.trim()) {
    current = null;
    return show("viewSetup");
  }

  const tab = await activeTab();
  const key = tab && profileKey(tab.url || "");
  if (!key) {
    current = null;
    showError("");
    return show("viewEmpty");
  }
  if (current && current.key === key) return; // already showing this person

  showError("");
  const cached = (await chrome.storage.session.get(key))[key];
  if (cached?.result) {
    current = cached;
    return renderResult();
  }

  const name = (tab.title || "")
    .replace(/^\(\d+\)\s*/, "")
    .replace(/\s*\|\s*LinkedIn.*$/i, "")
    .trim();
  current = {
    key,
    notes: cached?.notes || "",
    type: cached?.type || "cold",
    to: cached?.to || "",
    toNote: cached?.toNote || "",
    guesses: cached?.guesses || [],
    guessed: !!cached?.guessed
  };
  setTypeUI();
  $("readyName").textContent = name || "This profile";
  $("notesReady").value = current.notes;
  renderTo();
  show("viewReady");
  if (!current.guessed) previewEmail(tab, s, name);
}

// ---------------- Email preview before writing (free, no Claude or Apollo) ----------------

async function readTopCard(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const main = document.querySelector("main") || document.body;
      const aria = document.querySelector('[aria-label^="Current company"]')?.getAttribute("aria-label") || "";
      return {
        name: (main.querySelector("h1")?.innerText || "").trim(),
        company: aria.replace(/^Current company:\s*/i, "").split(/\.\s*Click/i)[0].trim(),
        top: main.innerText.slice(0, 1500)
      };
    }
  });
  return result || {};
}

async function previewEmail(tab, s, titleName) {
  const key = current?.key;
  $("toReadyNote").textContent = "";
  // LinkedIn loads the page in pieces, so try a few times
  for (let attempt = 0; attempt < 4; attempt++) {
    if (current?.key !== key || current.result) return;
    let card = {};
    try {
      card = await readTopCard(tab.id);
    } catch {
      break;
    }
    const name = card.name || titleName;
    const nameWords = (name || "").split(/\s+/);
    const firm = card.company || detectFirm(card.top, s.emailPatterns, nameWords);
    if (firm && name) {
      const g = guessEmails(firm, name, s.emailPatterns);
      if (current?.key !== key || current.result) return;
      if (g) {
        current.to = current.to || g.emails[0];
        current.guesses = g.emails;
        current.toNote = `Guessed from ${g.firm.endsWith("s") ? g.firm + "'" : g.firm + "'s"} usual format. Not verified, so check it before sending.`;
        current.guessed = true;
      } else {
        current.toNote = `No saved email format for ${firm}. Type it in, or add the firm in Settings.`;
      }
      renderTo();
      save();
      return;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (current?.key === key && !current.to) {
    current.toNote = "Couldn't spot their firm on the page. Type their email, or it will be filled in after you write the email.";
    renderTo();
  }
}

// Keeps the To box on both screens in sync
function renderTo() {
  if (!current) return;
  ["toReady", "toField"].forEach((id) => ($(id).value = current.to || ""));
  ["toReadyNote", "toNote"].forEach((id) => ($(id).textContent = current.toNote || ""));
  renderGuesses();
}

// ---------------- Reading the page ----------------

async function grabProfile(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const main = document.querySelector("main") || document.body;
      return {
        url: location.href.split("?")[0],
        text: main.innerText.replace(/\n{3,}/g, "\n\n").slice(0, 20000)
      };
    }
  });
  if (!result || result.text.length < 200) {
    throw new Error("Couldn't read this profile. Let the page finish loading, then try again.");
  }
  return result;
}

// ---------------- Writing emails ----------------

async function analyze(fromDeepBtn = false) {
  showError("");
  const s = await getSettings();
  // Search the web on Dig deeper, or on every cold email if that's turned on in Settings
  const type0 = current?.type || "cold";
  const deep = fromDeepBtn || (s.searchByDefault === true && type0 === "cold");
  const tab = await activeTab();
  const key = profileKey(tab?.url || "");
  if (!key) return refresh();

  const hadResult = current?.key === key && current.result;
  const started = Date.now();
  let stage = "Reading the profile";
  const tick = () => {
    $("loadingText").textContent = `${stage}... ${Math.round((Date.now() - started) / 1000)}s`;
  };
  tick();
  const ticker = setInterval(tick, 1000);
  const notes = current?.key === key ? (current.notes || "").trim() : "";
  const type = current?.key === key ? current.type || "cold" : "cold";
  if (fromDeepBtn) {
    setBusy($("deepBtn"), "Searching...");
  } else {
    show("viewLoading");
  }

  try {
    const profile = await grabProfile(tab.id);
    console.log("[Cold Email Writer] Read profile:", profile.text.length, "characters in", Date.now() - started, "ms");
    stage = deep ? "Searching the web and writing your email" : "Waiting for Claude to write your email";
    tick();
    const result = await callClaude(
      s,
      buildSystemPrompt(s, deep, type),
      buildUserPrompt(s, profile, notes, type),
      deep
    );
    if (!Array.isArray(result.hooks) || result.hooks.length === 0) {
      throw new Error("The response didn't include any emails. Try again.");
    }

    // If the hook repeats a word the template already uses ("love" twice), rephrase just the hook
    const hook = result.hooks[0];
    const repeats = findRepeats(hook.body);
    if (repeats.length && hook.line && hook.body.includes(hook.line)) {
      try {
        stage = "Polishing the wording";
        tick();
        const fix = await callClaude(
          s,
          buildRepeatFixSystem(s),
          `Full email:\n${hook.body}\n\nWords used more than once: ${repeats.join(", ")}\n\nRewrite only this personalized text so none of those words appear in it:\n${hook.line}`
        );
        const newLine = (fix.line || "").trim();
        if (newLine && findRepeats(hook.body.replace(hook.line, newLine)).length < repeats.length) {
          hook.body = hook.body.replace(hook.line, newLine);
          hook.line = newLine;
        }
      } catch (err) {
        console.warn("[Cold Email Writer] Repeat fix skipped:", err.message);
      }
    }

    const state = {
      key,
      type,
      emailType: type,
      notes,
      profile,
      result,
      selected: 0,
      edits: result.hooks.slice(0, 1).map((h) => ({ subject: h.subject || "", body: h.body || "" })),
      simple: false,
      to: current?.key === key ? current.to || "" : "",
      toNote: current?.key === key ? current.toNote || "" : "",
      guesses: current?.key === key ? current.guesses || [] : [],
      guessed: current?.key === key ? !!current.guessed : false,
      deep
    };
    await chrome.storage.session.set({ [key]: state });

    // Only draw it if you're still on the same profile
    const nowKey = profileKey((await activeTab())?.url || "");
    if (nowKey === key) {
      current = state;
      renderResult();
    }
  } catch (err) {
    if (!fromDeepBtn) show(hadResult ? "viewResult" : "viewReady");
    showError(err.message);
  } finally {
    clearInterval(ticker);
    console.log("[Cold Email Writer] Finished in", Date.now() - started, "ms");
    const deepBtn = $("deepBtn");
    delete deepBtn.dataset.label;
    deepBtn.disabled = false;
    deepBtn.textContent = current?.deep ? "Search again" : "Dig deeper";
  }
}

async function applyTweak() {
  const instruction = $("tweakField").value.trim();
  if (!instruction || !current?.result) return;
  showError("");
  const s = await getSettings();
  const edit = current.edits[current.selected];
  setBusy($("tweakBtn"), "Applying...");
  try {
    const r = await callClaude(
      s,
      buildTweakSystem(s),
      `Current subject: ${edit.subject}\n\nCurrent email:\n${edit.body}\n\nRequested change: ${instruction}`
    );
    edit.subject = r.subject || edit.subject;
    edit.body = r.body || edit.body;
    fillEditor();
    save();
    $("tweakField").value = "";
  } catch (err) {
    showError(err.message);
  } finally {
    clearBusy($("tweakBtn"));
  }
}

// ---------------- Rendering ----------------

function updateCount() {
  const text = $("bodyField").value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  $("wordCount").textContent = `${words} words`;
  $("wordCount").classList.toggle("over", words > 150);
  // Grow the box to fit the email so it never needs its own scrollbar
  const box = $("bodyField");
  box.style.height = "auto";
  box.style.height = box.scrollHeight + 2 + "px";
}

function fillEditor() {
  if (!current?.edits) return;
  const edit = current.edits[current.selected];
  $("subjectField").value = edit.subject;
  $("bodyField").value = edit.body;
  updateCount();
}

function renderResult() {
  const { result } = current;
  const p = result.person || {};

  $("pName").textContent = p.name || "Unknown";
  $("pRole").textContent = [p.title, p.firm].filter(Boolean).join(" at ");
  $("notesResult").value = current.notes || "";
  $("notesDetails").open = !!(current.notes || "").trim() || current.emailType === "thanks";
  const loc = (p.location || "").trim();
  let locText = loc ? `Based in ${loc}` : "Location not listed";
  const d = result.decisions || {};
  if (current.emailType !== "thanks" && (d.meeting === "call_only" || result.in_nyc_area === false)) {
    const why = d.meeting_reason || "not in the NYC area";
    locText += `. Call only, no coffee (${why}). If that's wrong, type "add the coffee line back" below.`;
  }
  $("pLocation").textContent = locText;

  const chips = $("pConnections");
  chips.replaceChildren();
  (result.connections || []).filter(Boolean).forEach((c) => {
    const li = document.createElement("li");
    li.textContent = c;
    chips.appendChild(li);
  });
  chips.hidden = chips.children.length === 0;

  updateSimpleBtn();
  setTypeUI();
  $("simpleBtn").hidden = current.emailType === "thanks";
  $("toField").value = current.to || "";
  $("toNote").textContent = current.toNote || "";
  renderGuesses();
  getSettings().then((s) => {
    $("apolloBtn").hidden = !s.apolloKey;
    autoGuessEmail(s);
  });

  $("grammarBox").hidden = true;
  fillEditor();

  const sources = (result.sources || []).filter((s) => s && s.url);
  const sourceList = $("sourceList");
  sourceList.replaceChildren();
  sources.forEach((src) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = src.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = src.title || src.url;
    li.appendChild(a);
    sourceList.appendChild(li);
  });
  $("sourcesBox").hidden = sources.length === 0;
  $("deepBtn").textContent = current.deep ? "Search again" : "Dig deeper";

  show("viewResult");
}

// ---------------- Email guessing from firm formats ----------------

function autoGuessEmail(s) {
  if (!current?.result || current.to || current.guessed) return;
  current.guessed = true;
  const p = current.result.person || {};
  const g = guessEmails(p.firm, p.name, s.emailPatterns);
  if (g) {
    current.to = g.emails[0];
    current.guesses = g.emails;
    current.toNote = `Guessed from ${g.firm.endsWith("s") ? g.firm + "'" : g.firm + "'s"} usual format. Not verified, so check it before sending.`;
  } else {
    current.guesses = [];
    current.toNote = p.firm ? `No saved email format for ${p.firm}. You can add one in Settings.` : "";
  }
  renderTo();
  save();
}

function renderGuesses() {
  const others = (current?.guesses || []).filter((e) => e !== current.to);
  ["readyAlts", "guessAlts"].forEach((boxId) => {
    const box = $(boxId);
    box.replaceChildren();
    box.hidden = others.length === 0;
    if (!others.length) return;
    const label = document.createElement("span");
    label.textContent = "Other formats:";
    box.appendChild(label);
    others.forEach((email) => {
      const b = document.createElement("button");
      b.className = "text-btn";
      b.textContent = email;
      b.addEventListener("click", () => {
        current.to = email;
        renderTo();
        save();
      });
      box.appendChild(b);
    });
  });
}

// ---------------- Buttons ----------------

$("settingsBtn").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("setupBtn").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("writeBtn").addEventListener("click", () => analyze(false));
$("notesBtn").addEventListener("click", () => analyze(false));
["notesReady", "notesResult"].forEach((id) =>
  $(id).addEventListener("input", (e) => {
    if (!current) return;
    current.notes = e.target.value;
    save();
  })
);
$("deepBtn").addEventListener("click", () => analyze(true));
$("tweakBtn").addEventListener("click", applyTweak);
$("tweakField").addEventListener("keydown", (e) => {
  if (e.key === "Enter") applyTweak();
});

$("subjectField").addEventListener("input", (e) => {
  if (!current?.edits) return;
  current.edits[current.selected].subject = e.target.value;
  save();
});
$("bodyField").addEventListener("input", (e) => {
  if (!current?.edits) return;
  current.edits[current.selected].body = e.target.value;
  updateCount();
  save();
});

const NOTE_HINTS = {
  cold: "Add how you know them or anything you want mentioned. If you've met or heard them speak, the email is written as a follow-up instead of a cold email.",
  thanks: "Say where you met and what you talked about. The email is built around these notes, so the more specific, the better."
};
const NOTE_PLACEHOLDERS = {
  cold: "Example: Heard her speak at the Rutgers finance speaker series on Sept 18. She talked about moving from audit into M&A.",
  thanks: "Example: Talked after the Jefferies Controllers info session at Rutgers last week. He spoke about changes in the field and the firm's culture over his 18 years there."
};

function setTypeUI() {
  const type = current?.type || "cold";
  document.querySelectorAll('input[name="typeReady"], input[name="typeResult"]').forEach((r) => {
    r.checked = r.value === type;
  });
  $("notesHint").textContent = NOTE_HINTS[type];
  $("notesReady").placeholder = NOTE_PLACEHOLDERS[type];
  $("notesResult").placeholder = NOTE_PLACEHOLDERS[type];
  $("writeBtn").textContent = type === "thanks" ? "Write keep in touch email" : "Write email";
}

document.querySelectorAll('input[name="typeReady"], input[name="typeResult"]').forEach((r) =>
  r.addEventListener("change", () => {
    if (!current) return;
    current.type = r.value;
    setTypeUI();
    save();
  })
);

function simpleLine() {
  const firm = (current.result.person?.firm || "").trim() || "your firm";
  return `I came across your profile and wanted to reach out to learn more about your journey and experiences at ${firm}.`;
}

function updateSimpleBtn() {
  $("simpleBtn").textContent = current.simple ? "Use personalized line" : "Keep it simple";
}

$("simpleBtn").addEventListener("click", async () => {
  if (!current?.result) return;
  showError("");
  const edit = current.edits[current.selected];
  const personal = current.result.hooks[current.selected]?.line || "";
  const simple = simpleLine();
  const from = current.simple ? simple : personal;
  const to = current.simple ? personal : simple;

  if (from && edit.body.includes(from)) {
    // Instant swap, no API call
    edit.body = edit.body.replace(from, to);
  } else if (!current.simple) {
    // Couldn't find the exact line (for example after edits), so ask Claude to swap it
    const s = await getSettings();
    setBusy($("simpleBtn"), "Simplifying...");
    try {
      const r = await callClaude(
        s,
        buildTweakSystem(s),
        `Current subject: ${edit.subject}\n\nCurrent email:\n${edit.body}\n\nRequested change: Replace the personalized sentence or sentences in the first paragraph (everything after the student introduces themselves) with exactly this sentence, word for word: "${simple}" Change nothing else, and keep the subject the same.`
      );
      edit.body = r.body || edit.body;
    } catch (err) {
      showError(err.message);
      clearBusy($("simpleBtn"));
      return;
    }
    clearBusy($("simpleBtn"));
  } else {
    showError("Couldn't find the simple line to swap back. Click Rewrite with these notes for a fresh personalized version.");
    return;
  }

  current.simple = !current.simple;
  fillEditor();
  updateSimpleBtn();
  save();
});

let beforeGrammar = null;

$("grammarBtn").addEventListener("click", async () => {
  if (!current?.edits) return;
  showError("");
  const s = await getSettings();
  const edit = current.edits[current.selected];
  setBusy($("grammarBtn"), "Checking...");
  try {
    const r = await callClaude(s, buildGrammarSystem(), `Subject: ${edit.subject}\n\nEmail:\n${edit.body}`);
    const changes = Array.isArray(r.changes) ? r.changes.filter(Boolean) : [];
    if (changes.length && r.body) {
      beforeGrammar = { subject: edit.subject, body: edit.body };
      edit.subject = r.subject || edit.subject;
      edit.body = r.body;
      fillEditor();
      save();
      $("grammarText").textContent = "Fixed: " + changes.join("; ") + ".";
      $("grammarUndo").hidden = false;
    } else {
      $("grammarText").textContent = "No spelling or grammar issues found.";
      $("grammarUndo").hidden = true;
    }
    $("grammarBox").hidden = false;
  } catch (err) {
    showError(err.message);
  } finally {
    clearBusy($("grammarBtn"));
  }
});

$("grammarUndo").addEventListener("click", () => {
  if (!current?.edits || !beforeGrammar) return;
  Object.assign(current.edits[current.selected], beforeGrammar);
  beforeGrammar = null;
  fillEditor();
  save();
  $("grammarBox").hidden = true;
});

["toField", "toReady"].forEach((id) => $(id).addEventListener("input", (e) => {
  if (!current) return;
  current.to = e.target.value.trim();
  current.guessed = true; // you typed it, so don't overwrite it
  renderGuesses();
  save();
}));

$("apolloBtn").addEventListener("click", async () => {
  if (!current?.profile) return;
  showError("");
  const s = await getSettings();
  setBusy($("apolloBtn"), "Searching...");
  try {
    const found = await findEmailWithApollo(s.apolloKey, current.profile.url);
    if (found) {
      current.to = found.email;
      current.guesses = [];
      current.toNote = found.status === "verified"
        ? "Verified by Apollo."
        : `Found by Apollo${found.status ? ` (marked ${found.status})` : ""}. Double-check it before sending.`;
    } else {
      current.toNote = "Apollo doesn't have an email for this person. You'll need to find it another way.";
    }
    $("toField").value = current.to || "";
    $("toNote").textContent = current.toNote;
      save();
  } catch (err) {
    showError(err.message);
  } finally {
    clearBusy($("apolloBtn"));
  }
});

$("gmailBtn").addEventListener("click", async () => {
  if (!current?.edits) return;
  const s = await getSettings();
  const edit = current.edits[current.selected];
  const params = [
    "view=cm",
    "fs=1",
    "to=" + encodeURIComponent($("toField").value.trim()),
    "su=" + encodeURIComponent(edit.subject),
    "body=" + encodeURIComponent(edit.body)
  ];
  if (s.gmailAccount) params.push("authuser=" + encodeURIComponent(s.gmailAccount));
  chrome.tabs.create({ url: "https://mail.google.com/mail/?" + params.join("&") });
});

$("copyBtn").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("bodyField").value);
  const btn = $("copyBtn");
  btn.textContent = "Copied";
  setTimeout(() => (btn.textContent = "Copy email"), 1500);
});

// ---------------- Keep in sync with the browser ----------------

chrome.tabs.onActivated.addListener(refresh);
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (tab.active && (info.url || info.status === "complete")) refresh();
});
getSettings().then((s) => fillModelSelect($("modelPick"), s.model, true));
$("modelPick").addEventListener("change", (e) => {
  chrome.storage.local.set({ model: e.target.value });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.model) $("modelPick").value = changes.model.newValue;
  if (changes.apolloKey) $("apolloBtn").hidden = !changes.apolloKey.newValue;
  // Switching models shouldn't reset what's on screen
  if (Object.keys(changes).every((k) => k === "model")) return;
  // Changing other settings keeps an email that's already written on screen
  if (current?.result) return;
  current = null;
  refresh();
});

refresh();
