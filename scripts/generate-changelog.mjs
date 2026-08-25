#!/usr/bin/env node
// Regenerates CHANGELOG.md from git history (Keep a Changelog format).
// Commits aren't required to follow conventional-commit prefixes; this
// falls back to categorizing by the commit subject's leading verb.
//
// Usage:
//   node scripts/generate-changelog.mjs            # rewrite the whole file
//   node scripts/generate-changelog.mjs --release 0.2.0   # cut a dated release
//
// Run via `npm run changelog`.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const CHANGELOG_PATH = new URL("../CHANGELOG.md", import.meta.url);

const CONVENTIONAL_MAP = {
  feat: "Added",
  fix: "Fixed",
  perf: "Changed",
  refactor: "Changed",
  docs: "Documentation",
  chore: "Changed",
  test: "Changed",
  style: "Changed",
  build: "Changed",
  ci: "Changed",
  revert: "Changed",
};

const VERB_MAP = [
  [/^add(ed|s)?\b/i, "Added"],
  [/^(fix|fixed|fixes)\b/i, "Fixed"],
  [/^(remove|removed|drop|dropped|delete|deleted)\b/i, "Removed"],
  [/^(document|documented|docs)\b/i, "Documentation"],
  [/^(improve|refactor|simplify|split|update|rework|clean\s?up)\b/i, "Changed"],
];

function categorize(subject) {
  const conventional = subject.match(/^([a-z]+)(\([^)]+\))?!?:\s*(.+)/i);
  if (conventional && CONVENTIONAL_MAP[conventional[1].toLowerCase()]) {
    return {
      category: CONVENTIONAL_MAP[conventional[1].toLowerCase()],
      text: conventional[3],
    };
  }
  for (const [re, category] of VERB_MAP) {
    if (re.test(subject)) return { category, text: subject };
  }
  return { category: "Changed", text: subject };
}

function getCommits(range) {
  const raw = execFileSync(
    "git",
    ["log", range, "--no-merges", "--format=%H%x1f%s%x1f%ad", "--date=short"],
    { encoding: "utf8" },
  ).trim();
  if (!raw) return [];
  return raw.split("\n").map((line) => {
    const [hash, subject, date] = line.split("\x1f");
    return { hash: hash.slice(0, 7), subject, date };
  });
}

function lastTag() {
  try {
    return execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

function render(sections, heading) {
  const order = ["Added", "Changed", "Fixed", "Removed", "Documentation"];
  let out = `## ${heading}\n\n`;
  for (const category of order) {
    const items = sections[category];
    if (!items?.length) continue;
    out += `### ${category}\n\n`;
    for (const item of items) {
      out += `- ${item.text} (${item.hash})\n`;
    }
    out += "\n";
  }
  return out;
}

function main() {
  const releaseIdx = process.argv.indexOf("--release");
  const releaseVersion = releaseIdx !== -1 ? process.argv[releaseIdx + 1] : null;

  const tag = lastTag();
  const range = tag ? `${tag}..HEAD` : "HEAD";
  const commits = getCommits(range);

  const sections = {};
  for (const commit of commits) {
    const { category, text } = categorize(commit.subject);
    (sections[category] ??= []).push({ text, hash: commit.hash });
  }

  const heading = releaseVersion
    ? `[${releaseVersion}] - ${new Date().toISOString().slice(0, 10)}`
    : "[Unreleased]";
  const newSection = render(sections, heading);

  const existing = existsSync(CHANGELOG_PATH)
    ? readFileSync(CHANGELOG_PATH, "utf8")
    : "# Changelog\n\nAll notable changes to this project are documented here.\nFormat based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).\n\n";

  const marker = "\n## [Unreleased]";
  const markerIdx = existing.indexOf(marker);
  let body;
  if (markerIdx === -1) {
    body = existing.trimEnd() + "\n\n" + newSection;
  } else if (releaseVersion) {
    // Cutting a release: replace the Unreleased header with the new version.
    const before = existing.slice(0, markerIdx);
    const after = existing.slice(markerIdx + marker.length);
    body = before + "\n" + newSection + "## [Unreleased]\n" + after;
  } else {
    const before = existing.slice(0, markerIdx);
    const restStart = existing.indexOf("\n## [", markerIdx + marker.length);
    const after = restStart === -1 ? "" : existing.slice(restStart);
    body = before + "\n" + newSection.trimEnd() + "\n" + after;
  }

  writeFileSync(CHANGELOG_PATH, body.trimEnd() + "\n");
  console.log(`Wrote ${commits.length} commit(s) into CHANGELOG.md`);
}

main();
