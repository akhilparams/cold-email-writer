const FIELDS = ["template", "thanksTemplate", "persona", "targetSchools", "styleNotes", "examples", "emailPatterns", "gmailAccount", "apiKey", "apolloKey", "model"];
const $ = (id) => document.getElementById(id);

(async () => {
  const s = await getSettings();
  fillModelSelect($("model"), s.model, false);
  FIELDS.filter((f) => f !== "model").forEach((f) => ($(f).value = s[f]));
  $("searchByDefault").checked = s.searchByDefault === true;
})();

$("saveBtn").addEventListener("click", async () => {
  const data = {};
  FIELDS.forEach((f) => (data[f] = $(f).value.trim()));
  if (!data.model) data.model = DEFAULTS.model;
  data.searchByDefault = $("searchByDefault").checked;

  const missing = [];
  if (!data.apiKey) missing.push("an API key");
  if (!data.template) missing.push("a template");

  await chrome.storage.local.set(data);
  $("saveStatus").textContent = missing.length
    ? `Saved. Add ${missing.join(" and ")} before writing emails.`
    : "Saved.";
});
