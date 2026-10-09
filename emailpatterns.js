// Email formats by firm. Tokens: first, last, f (first initial), m (middle initial), l (last initial).
// When a firm has more than one format, the first one is tried first and the rest show as alternatives.
// Add or override firms in Settings > Email formats.

const EMAIL_PATTERNS = [
  // Bulge bracket
  ["J.P. Morgan", ["jpmorgan", "jpmchase"], ["first.last@jpmorgan.com", "first.m.last@jpmorgan.com"]],
  ["Goldman Sachs", ["goldman"], ["first.last@gs.com"]],
  ["Bank of America", ["bankofamerica", "bofa"], ["first.last@bofa.com", "first.m.last@bofa.com"]],
  ["Morgan Stanley", ["morganstanley"], ["first.last@morganstanley.com"]],
  ["Citi", ["citigroup", "citi"], ["first.last@citi.com"]],
  ["Barclays", ["barclays", "barcap"], ["first.last@barclays.com", "first.last@barclayscapital.com", "first.last@barcap.com"]],
  ["Deutsche Bank", ["deutsche"], ["first.last@db.com"]],
  ["UBS", ["ubs"], ["first.last@ubs.com"]],
  ["Credit Suisse", ["creditsuisse"], ["first.last@credit-suisse.com"]],
  ["Wells Fargo", ["wellsfargo"], ["first.last@wellsfargo.com"]],

  // Elite and other boutiques
  ["Evercore", ["evercore"], ["first.last@evercore.com"]],
  ["Centerview Partners", ["centerview"], ["flast@centerviewpartners.com", "flast@centerview.com"]],
  ["Perella Weinberg", ["perella", "pwpartners"], ["first.last@pwpartners.com", "flast@pwpartners.com"]],
  ["Lazard", ["lazard"], ["first.last@lazard.com"]],
  ["Moelis", ["moelis"], ["first.last@moelis.com"]],
  ["PJT Partners", ["pjt"], ["first.last@pjtpartners.com"]],
  ["Guggenheim", ["guggenheim"], ["first.last@guggenheimpartners.com", "first.last@guggenheimcm.com"]],
  ["Qatalyst", ["qatalyst"], ["first.last@qatalyst.com"]],
  ["Allen & Company", ["allenandcompany", "allenandco", "allenco"], ["flast@allenco.com"]],
  ["LionTree", ["liontree"], ["flast@liontree.com"]],
  ["Raine Group", ["raine"], ["flast@raine.com"]],
  ["Greenhill", ["greenhill"], ["first.last@greenhill.com"]],
  ["FT Partners", ["ftpartners", "financialtechnologypartners"], ["first.last@ftpartners.com"]],
  ["Solomon Partners", ["solomonpartners"], ["first.last@solomonpartners.com"]],
  ["Union Square Advisors", ["unionsquareadvisors"], ["first.last@usadvisors.com"]],
  ["TAP Advisors", ["tapadvisors"], ["flast@tapadvisors.com"]],
  ["MTS Health Partners", ["mtshealth"], ["last@mtspartners.com"]],
  ["BDO Capital", ["bdocapital"], ["flast@bdocap.com"]],
  ["Ardea Partners", ["ardea"], ["first@ardeapartners.com"]],
  ["DBO Partners", ["dbopartners"], ["first.last@dbopartners.com"]],
  ["DC Advisory", ["dcadvisory"], ["first.last@dcadvisory.com"]],
  ["Miller Buckfire", ["millerbuckfire"], ["first.last@millerbuckfire.com"]],
  ["Rothschild", ["rothschild"], ["first.last@rothschildandco.com"]],

  // Middle market
  ["Jefferies", ["jefferies"], ["flast@jefferies.com"]],
  ["Houlihan Lokey", ["houlihan"], ["flast@hl.com"]],
  ["William Blair", ["williamblair"], ["flast@williamblair.com"]],
  ["Baird", ["baird"], ["flast@rwbaird.com"]],
  ["Harris Williams", ["harriswilliams"], ["flast@harriswilliams.com"]],
  ["Lincoln International", ["lincolninternational"], ["flast@lincolninternational.com"]],
  ["Piper Sandler", ["piper"], ["first.last@psc.com"]],
  ["KeyBanc", ["keybanc", "keybank", "keycorp"], ["flast@key.com", "flast@keybanccm.com"]],
  ["Truist", ["truist", "suntrust"], ["first.last@truist.com", "first.last@suntrust.com"]],
  ["Raymond James", ["raymondjames"], ["first.last@raymondjames.com"]],
  ["Leerink", ["leerink"], ["first.last@svbleerink.com"]],
  ["Cantor Fitzgerald", ["cantor"], ["first.last@cantor.com", "flast@cantor.com"]],
  ["Canaccord Genuity", ["canaccord"], ["first.last@canaccord.com", "flast@cgf.com"]],
  ["Oppenheimer", ["oppenheimer"], ["first.last@opco.com"]],
  ["BMO", ["bmo"], ["first.last@bmo.com"]],
  ["RBC Capital Markets", ["rbc", "royalbankofcanada"], ["first.last@rbccm.com"]],
  ["Cain Brothers", ["cainbrothers"], ["f.last@cainbrothers.com"]],
  ["Stifel", ["stifel"], ["flast@stifel.com", "lastf@stifel.com"]],
  ["Citizens", ["citizens"], ["first.last@citizensbank.com"]],
  ["Intrepid", ["intrepid"], ["flast@intrepidib.com"]],
  ["TripleTree", ["tripletree"], ["flast@triple-tree.com"]],
  ["Duff & Phelps", ["duffandphelps"], ["first.last@duffandphelps.com"]],
  ["Macquarie", ["macquarie"], ["first.last@macquarie.com"]],
  ["Cowen", ["cowen"], ["first.last@cowen.com"]],
  ["Needham", ["needham"], ["flast@needhamco.com"]],
  ["KBW", ["keefe", "kbw"], ["flast@kbw.com"]],
  ["Janney", ["janney"], ["flast@janney.com"]],
  ["B. Riley", ["briley"], ["flast@brileyfin.com"]],
  ["C.L. King", ["clking"], ["flast@clking.com"]],
  ["Imperial Capital", ["imperialcapital"], ["flast@imperialcapital.com", "first.last@imperialcapital.com"]],
  ["Lake Street", ["lakestreet"], ["first.last@lakestreetcm.com"]],
  ["Northland", ["northland"], ["flast@northlandcapitalmarkets.com"]],
  ["Roth Capital", ["rothcapital"], ["flast@roth.com"]],
  ["Stephens", ["stephens"], ["flast@stephens.com", "first.last@stephens.com"]],
  ["Wedbush", ["wedbush"], ["first.last@wedbush.com"]],
  ["ThinkEquity", ["thinkequity"], ["fl@think-equity.com"]],

  // International banks
  ["ABN AMRO", ["abnamro"], ["first.last@abnamro.com"]],
  ["BNP Paribas", ["bnp"], ["first.last@americas.bnpparibas.com"]],
  ["BNY", ["bnymellon", "bny"], ["first.last@bnymellon.com"]],
  ["HSBC", ["hsbc"], ["first.last@us.hsbc.com"]],
  ["Mizuho", ["mizuho"], ["first.last@mizuhogroup.com"]],
  ["MUFG", ["mufg", "mitsubishi"], ["first.last@mufgsecurities.com", "first.last@us.mufg.jp"]],
  ["Nomura", ["nomura"], ["first.last@nomura.com"]],
  ["NatWest / RBS", ["rbsinternational", "royalbankofscotland"], ["first.last@rbsint.com"]],
  ["Societe Generale", ["societegenerale", "socgen", "sgcib"], ["first.last@sgcib.com"]],
  ["Standard Chartered", ["standardchartered"], ["first.last@sc.com"]],

  // Regional boutiques
  ["Black Arch Partners", ["blackarch"], ["last@blackarchpartners.com"]],
  ["Covington Partners", ["covingtonpartners"], ["flast@covllc.com"]],
  ["Edgemont Partners", ["edgemont"], ["flast@edgemont.com"]],
  ["Clearsight Advisors", ["clearsight"], ["flast@clearsightadvisors.com"]],
  ["Fortitude Advisors", ["fortitudeadvisors"], ["flast@fortitudeadvisors.com"]],
  ["Northborne Partners", ["northborne"], ["flast@northborne.com"]],
  ["Critical Point Partners", ["criticalpoint"], ["flast@criticalpointpartners.com"]],
  ["Farlie Turner", ["farlieturner"], ["flast@farlieturner.com"]],
  ["Cascade Partners", ["cascadepartners"], ["firstl@cascade-partners.com"]],
  ["ThreeSixtySeven Advisors", ["threesixtyseven"], ["flast@threesixtyseven.com"]],
  ["Delancey Street Partners", ["delancey"], ["flast@delanceyllc.com"]],
  ["Corum Group", ["corum"], ["firstl@corumgroup.com"]],
  ["Fairmount Partners", ["fairmount"], ["first.last@fairmountpartners.com"]],
  ["P&M Corporate Finance", ["pandmcorporate", "pmcf"], ["first.last@pmcf.com"]]
];

function normFirm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

// "Firm name = first.last@firm.com, flast@firm.com" per line, from Settings
function parseCustomPatterns(text) {
  return (text || "").split("\n").map((line) => {
    const i = line.search(/[=:]/); // "Firm = pattern" or "Firm: pattern"
    if (i < 1) return null;
    const name = line.slice(0, i).trim();
    const patterns = line.slice(i + 1).split(/[,;\s]+/).map((p) => p.trim()).filter((p) => p.includes("@"));
    const key = normFirm(name);
    return key && patterns.length ? [name, [key], patterns] : null;
  }).filter(Boolean);
}

function findFirmPatterns(firm, customText) {
  const f = normFirm(firm);
  if (!f) return null;
  // Your own lines win, then the longest matching key (so "citizens" beats "citi")
  for (const entry of parseCustomPatterns(customText)) {
    if (f.includes(entry[1][0]) || entry[1][0].includes(f)) return entry;
  }
  let best = null, bestLen = 0;
  for (const entry of EMAIL_PATTERNS) {
    for (const key of entry[1]) {
      if (f.includes(key) && key.length > bestLen) { best = entry; bestLen = key.length; }
    }
  }
  return best;
}

const NAME_JUNK = new Set(["jr", "sr", "ii", "iii", "iv", "cfa", "cpa", "mba", "phd", "dr", "mr", "ms", "mrs", "caia", "frm"]);

function splitName(full) {
  const cleaned = (full || "")
    .replace(/\(.*?\)/g, " ")
    .split(",")[0]
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const parts = cleaned.split(/\s+/)
    .map((p) => p.toLowerCase().replace(/[^a-z-]/g, ""))
    .filter((p) => p && !NAME_JUNK.has(p));
  if (parts.length < 2) return null;
  return { first: parts[0], last: parts[parts.length - 1], middle: parts.length > 2 ? parts[1] : "" };
}

function fillPattern(pattern, nm) {
  const at = pattern.indexOf("@");
  if (at < 1) return null;
  const local = pattern.slice(0, at).toLowerCase().trim();
  const domain = pattern.slice(at + 1).toLowerCase().trim();
  const vals = { first: nm.first, last: nm.last, f: nm.first[0], l: nm.last[0], m: nm.middle[0] || "" };
  let out = "", i = 0;
  while (i < local.length) {
    const tok = ["first", "last", "f", "l", "m"].find((t) => local.startsWith(t, i));
    if (tok) {
      if (!vals[tok]) return null; // e.g. pattern needs a middle initial we don't have
      out += vals[tok];
      i += tok.length;
    } else if (".-_".includes(local[i])) {
      out += local[i++];
    } else {
      return null;
    }
  }
  return out + "@" + domain;
}

// Returns { firm, emails: [best guess, ...alternatives] } or null
function guessEmails(firm, fullName, customText) {
  const entry = findFirmPatterns(firm, customText);
  const nm = splitName(fullName);
  if (!entry || !nm) return null;
  const names = [nm];
  if (nm.last.includes("-")) names.push({ ...nm, last: nm.last.replace(/-/g, "") });
  const emails = [];
  names.forEach((n) => entry[2].forEach((p) => {
    const e = fillPattern(p, n);
    if (e && !emails.includes(e)) emails.push(e);
  }));
  return emails.length ? { firm: entry[0], emails } : null;
}

// Find a known firm in free text (like the top of a LinkedIn profile).
// Matches whole words or runs of up to 4 words, so "ubs" never matches "subsidiary".
function detectFirm(text, customText, skipWords = []) {
  const skip = new Set(skipWords.map((w) => normFirm(w)).filter(Boolean));
  const words = (text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .split(/[^a-z0-9.']+/)
    .map((w) => w.replace(/[.']/g, ""))
    .filter((w) => w && !skip.has(w));
  const entries = [...parseCustomPatterns(customText), ...EMAIL_PATTERNS];
  const keyToFirm = new Map();
  entries.forEach((e) => e[1].forEach((k) => { if (!keyToFirm.has(k)) keyToFirm.set(k, e[0]); }));
  for (let i = 0; i < words.length; i++) {
    let joined = "";
    for (let n = 0; n < 4 && i + n < words.length; n++) {
      joined += words[i + n];
      if (keyToFirm.has(joined)) return keyToFirm.get(joined);
    }
  }
  return "";
}
