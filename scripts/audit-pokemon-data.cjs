#!/usr/bin/env node
"use strict";
/* Offline structural audit and source-evidence accounting. Never rewrites game data. */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ROOT = path.resolve(__dirname, "..");
const STAT = ["hp", "attack", "defense", "spAttack", "spDefense", "speed"];
const COMMON = ["name", "dex", "genderRate", "growth", "baseExp", "evolvesFrom", "evolutionChain"];
const FORM = ["types", ...STAT.map(s => "base." + s), "abilities", "baseExp"];
const PRIORITY = ["champions", 9, 8, 7, 6, 5, 4, 3, 2, 1];
const STATES = new Set(["unverified", "verified", "mismatch", "unavailable", "not_applicable"]);
function loadCatalog(root = ROOT) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const file of ["game/data/national-catalog.js", "game/data/species.js", "game/data/provenance.js"])
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), sandbox, {filename:file});
  return sandbox.window;
}
function key(species, form, field) { return JSON.stringify([species, form ?? null, field]); }
function sourceRank(version) {
  const x = version === "champions" ? "champions" : Number(version);
  const i = PRIORITY.indexOf(x);
  return i < 0 ? Infinity : i;
}
function audit(data, evidence) {
  const errors = [], warnings = [], required = new Map(), validated = new Map();
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.records))
    throw Error("Invalid verification records format");
  const national = evidence.POKE_NATIONAL_CATALOG;
  const catalog = national?.species;
  const effective = evidence.POKE_SPECIES;
  if (!catalog || !effective) throw Error("National catalog or resolved species missing");
  const speciesIds = Object.keys(catalog);
  const dexes = new Map();
  let formCount = 0, cosmeticFormCount = 0, evolutionRowCount = 0;
  const add = (species, form, field) => required.set(key(species,form,field), {species, form, field});
  for (const id of speciesIds) {
    const s = catalog[id], e = effective[id];
    if (!e) errors.push(id + ": missing resolved species");
    if (!Number.isInteger(s.dex) || s.dex < 1 || s.dex > 1025) errors.push(id + ": invalid dex");
    if (dexes.has(s.dex)) errors.push(id + ": duplicate dex " + s.dex);
    dexes.set(s.dex,id);
    if (typeof s.name !== "string" || !s.name.trim()) errors.push(id + ": missing name");
    for (const f of COMMON) add(id,null,f);
    if (!s.forms || !Object.keys(s.forms).length) errors.push(id + ": missing forms");
    for (const [formId, form] of Object.entries(s.forms || {})) {
      formCount++;
      for (const f of FORM) add(id,formId,f);
      if (!Array.isArray(form.types) || form.types.length < 1 || form.types.length > 2 ||
        form.types.some(t => typeof t !== "string" || !t))
        errors.push(id + "/" + formId + ": invalid types");
      for (const stat of STAT) {
        const value = form.base?.[stat];
        if (!Number.isInteger(value) || value < 1) errors.push(id + "/" + formId + ": invalid " + stat);
      }
      if (!Array.isArray(form.abilities)) errors.push(id + "/" + formId + ": missing abilities list");
      if (form.baseExp !== null && (!Number.isInteger(form.baseExp) || form.baseExp < 0))
        errors.push(id + "/" + formId + ": invalid baseExp");
    }
    for (const row of national.cosmeticForms?.[id] || []) {
      cosmeticFormCount++;
      for (const field of ["identifier","battleForm","formIdentifier","name","formPokemonName","battleOnly","mega","default"])
        add(id,"cosmetic:"+row.id,"cosmetic."+field);
      if (row.battleForm && !s.forms?.[row.battleForm]) errors.push(id + ": cosmetic form missing battle-form reference");
    }
    for (const row of national.evolution?.[id] || []) {
      evolutionRowCount++;
      const target="evolution:"+row.id;
      for(const field of Object.keys(row)) if(field!=="id") add(id,target,"evolution."+field);
    }
    if (s.evolvesFrom !== null && s.evolvesFrom !== undefined && !catalog[s.evolvesFrom])
      errors.push(id + ": broken evolvesFrom");
  }
  if (speciesIds.length !== 1025) errors.push("species count != 1025: " + speciesIds.length);
  for (let dex=1;dex<=1025;dex++) if (!dexes.has(dex)) errors.push("missing dex " + dex);
  const seen=new Set();
  for (const rec of data.records) {
    const k=key(rec.species, rec.form ?? null, rec.field);
    if (!required.has(k)) {errors.push("unknown field target: " + k);continue;}
    if (seen.has(k)) {errors.push("duplicate evidence: " + k);continue;}
    seen.add(k);
    if (!STATES.has(rec.status) || typeof rec.checked !== "boolean") {errors.push("invalid status: " + k);continue;}
    if ((rec.status === "verified" || rec.status === "mismatch" || rec.status === "not_applicable") !== rec.checked) {
      errors.push("checked/status conflict: " + k);continue;
    }
    if (rec.checked) {
      if (!rec.source || !rec.reference || !/^https?:\/\//.test(rec.reference) ||
          sourceRank(rec.version) === Infinity) {
        errors.push("verified evidence lacks source/version/reference: " + k);continue;
      }
    }
    if (!rec.checked && rec.status === "unverified" && (rec.source || rec.reference))
      warnings.push("unverified with source hint: " + k);
    validated.set(k,rec);
  }
  let verified=0,mismatch=0,unavailable=0,notApplicable=0;
  for (const r of validated.values()) {
    if(r.status==="verified") verified++;
    else if(r.status==="mismatch") mismatch++;
    else if(r.status==="unavailable") unavailable++;
    else if(r.status==="not_applicable") notApplicable++;
  }
  return {
    schemaVersion:1,
    sourceRevision:evidence.POKE_NATIONAL_CATALOG.source?.revision ?? null,
    speciesCount:speciesIds.length, formCount, cosmeticFormCount, evolutionRowCount,
    totalFields:required.size,
    verified, mismatch, unavailable, notApplicable,
    unverified:required.size-verified-mismatch-unavailable-notApplicable,
    evidenceRecords:data.records.length,
    errors,warnings
  };
}
function main() {
  const records=JSON.parse(fs.readFileSync(path.join(ROOT,"data-audit/verification-records.json"),"utf8"));
  const report=audit(records,loadCatalog());
  if(process.argv.includes("--write")) {
    fs.writeFileSync(path.join(ROOT,"data-audit/verification-report.json"),JSON.stringify(report,null,2)+"\n");
  }
  console.log(JSON.stringify(report,null,2));
  if(report.errors.length) process.exitCode=1;
}
if(require.main===module) main();
module.exports={audit,loadCatalog,key,sourceRank,PRIORITY};
