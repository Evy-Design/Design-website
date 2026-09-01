// Fetches the site's content from Sanity and writes it to content.json.
// This site has no runtime build step (see sanity-client.js) — content.json
// is loaded via a same-origin synchronous XHR, so it has to exist as a real
// file rather than being fetched live from Sanity in the browser (a
// cross-origin *synchronous* XHR is disallowed by browsers outright, CORS
// config or not — that's the whole reason this script exists).
//
// Run after editing content in the Studio, then redeploy:
//   npm run build-content

const PROJECT_ID = "16akn05z";
const DATASET = "production";
const API_VERSION = "2026-08-26";

const SITE_SETTINGS_QUERY = `*[_id == "siteSettings"][0]{
  homeHeroTitle, homeHeroBody,
  aboutHeroHeading, aboutHeroLede, aboutHeroDetail1, aboutHeroDetail2,
  "aboutPortrait": aboutPortrait.asset->url,
  contactIntro,
  "cta": {
    "roles": ctaRoles[]{word, "image": image.asset->url},
    "suffix": ctaSuffix,
    "body": ctaBody
  },
  awards[]{year, title, body},
  timeline[]{year, title, "image": image.asset->url, alt, body, ctaLabel, ctaHref},
  email, instagramUrl, linkedinUrl
}`;

const PROJECTS_QUERY = `*[_type == "project"] | order(order asc){
  "slug": slug.current, title,
  "cover": cover.asset->url,
  "hero": coalesce(hero.asset->url, cover.asset->url),
  "heroVideo": heroVideo.asset->url,
  alt, description, deliverables, websiteUrl,
  gallery[]{type, "src": images[]{"url": asset->url, "isVideo": _type == "video"}, heading, body, badgeLabel, "video": video.asset->url}
}`;

function queryUrl(groq) {
  return (
    `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}` +
    `?query=${encodeURIComponent(groq)}`
  );
}

async function runQuery(groq) {
  const res = await fetch(queryUrl(groq));
  if (!res.ok) throw new Error(`Sanity query failed (${res.status}): ${groq}`);
  const {result} = await res.json();
  return result;
}

const [settings, projects] = await Promise.all([
  runQuery(SITE_SETTINGS_QUERY),
  runQuery(PROJECTS_QUERY),
]);

const fs = await import("node:fs/promises");
const path = await import("node:path");
const outPath = path.join(import.meta.dirname, "..", "content.json");
await fs.writeFile(outPath, JSON.stringify({settings, projects}, null, 2));

console.log(`Wrote ${outPath}`);
