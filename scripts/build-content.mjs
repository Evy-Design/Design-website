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

// Home/About/Contact/Footer/Site Settings are separate singleton
// documents in the Studio (Evy: "Zorg dat in sanity de pages ook
// apart staan net zoals projects. En ook een Footer en zulke sections
// mogen hier ook los in staan") — one combined query here, but the
// JS below still flattens the result into the SAME "settings" shape
// content.js has always consumed (window.EOD_CONTENT.settings.email,
// .awards, .timeline, ...), so none of the frontend rendering code
// needed to change for the Studio-side split.
const SITE_QUERY = `{
  "home": *[_id == "homePage"][0]{heroTitle, heroBody},
  "about": *[_id == "aboutPage"][0]{
    heroHeading, heroLede, heroDetail1, heroDetail2,
    "portrait": portrait.asset->url,
    awards[]{year, title, body},
    timeline[]{year, title, "image": image.asset->url, alt, body, ctaLabel, ctaHref}
  },
  "contact": *[_id == "contactPage"][0]{intro},
  "footer": *[_id == "footer"][0]{email, instagramUrl, linkedinUrl},
  "general": *[_id == "siteSettings"][0]{
    "favicon": favicon.asset->url,
    "cta": {
      "roles": ctaRoles[]{word, "image": image.asset->url},
      "suffix": ctaSuffix,
      "body": ctaBody
    }
  }
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

const [site, projects] = await Promise.all([
  runQuery(SITE_QUERY),
  runQuery(PROJECTS_QUERY),
]);

const home = site.home || {};
const about = site.about || {};
const contact = site.contact || {};
const footer = site.footer || {};
const general = site.general || {};

const settings = {
  homeHeroTitle: home.heroTitle,
  homeHeroBody: home.heroBody,
  aboutHeroHeading: about.heroHeading,
  aboutHeroLede: about.heroLede,
  aboutHeroDetail1: about.heroDetail1,
  aboutHeroDetail2: about.heroDetail2,
  aboutPortrait: about.portrait,
  awards: about.awards,
  timeline: about.timeline,
  contactIntro: contact.intro,
  email: footer.email,
  instagramUrl: footer.instagramUrl,
  linkedinUrl: footer.linkedinUrl,
  favicon: general.favicon,
  cta: general.cta,
};

const fs = await import("node:fs/promises");
const path = await import("node:path");
const outPath = path.join(import.meta.dirname, "..", "content.json");
await fs.writeFile(outPath, JSON.stringify({settings, projects}, null, 2));

console.log(`Wrote ${outPath}`);
