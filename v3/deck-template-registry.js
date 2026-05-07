/**
 * Infogr.ai v3 — Deck Template Registry (Phase 7.1A)
 *
 * Loads and caches the JSON files in `v3/deck-templates/`. All access is
 * async because the JSON files are fetched at runtime (no build step).
 *
 * Public API:
 *   loadAll()        → Promise<Record<id, template>>
 *   get(id)          → Promise<template | null>
 *   getAllSync()     → returns the cache after loadAll has resolved (or null)
 */

const TEMPLATE_IDS = [
  'executive-summary',
  'project-kickoff',
  'process-improvement-proposal',
];

let _cache = null;
let _inFlight = null;

async function _fetchOne(id) {
  // Resolve relative to this file so it works regardless of where the page
  // that imports it lives. Vercel serves static files from the GitHub root.
  const url = new URL(`./deck-templates/${id}.json`, import.meta.url).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load template ${id}: HTTP ${res.status}`);
  return res.json();
}

export async function loadAll() {
  if (_cache) return _cache;
  if (_inFlight) return _inFlight;

  _inFlight = (async () => {
    const fetched = await Promise.all(TEMPLATE_IDS.map(_fetchOne));
    const map = {};
    TEMPLATE_IDS.forEach((id, i) => { map[id] = fetched[i]; });
    _cache = map;
    _inFlight = null;
    return map;
  })();

  return _inFlight;
}

export async function get(id) {
  const all = await loadAll();
  return all[id] || null;
}

export function getAllSync() {
  return _cache;
}

export function listIds() {
  return TEMPLATE_IDS.slice();
}
