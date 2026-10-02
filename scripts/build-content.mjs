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
  "home": *[_id == "homeHeroBlock"][0]{
    heroTitle, heroBody,
    "tornadoPortrait": tornadoPortrait.asset->url,
    tornadoCards[]{alt, "src": image.asset->url}
  },
  "aboutHero": *[_id == "aboutHeroBlock"][0]{
    heroHeading, heroLede, heroDetail1, heroDetail2,
    "portrait": portrait.asset->url
  },
  "timeline": *[_id == "timelineBlock"][0].timeline[]{year, title, "image": image.asset->url, alt, body, ctaLabel, ctaHref},
  "awards": *[_id == "awardsBlock"][0].awards[]{year, title, body},
  "logos": *[_id == "logosBlock"][0].logos[]{alt, "src": image.asset->url},
  "contact": *[_id == "contactBlock"][0]{intro},
  "projectsIntro": *[_id == "projectsPage"][0].intro,
  "footer": *[_id == "footer"][0]{email, instagramUrl, linkedinUrl},
  "cta": *[_id == "ctaBlock"][0]{
    "roles": ctaRoles[]{word, "image": image.asset->url},
    "suffix": ctaSuffix,
    "body": ctaBody
  },
  "general": *[_id == "siteSettings"][0]{
    "favicon": favicon.asset->url,
    "nav": navigation[]{page, label}
  },
  "pages": {
    "home": *[_id == "homePage"][0].blocks[]->_type,
    "about": *[_id == "aboutPage"][0].blocks[]->_type,
    "contact": *[_id == "contactPage"][0].blocks[]->_type
  }
}`;

const PROJECTS_QUERY = `*[_type == "project"] | order(order asc){
  "slug": slug.current, title,
  "cover": cover.asset->url,
  "hero": coalesce(hero.asset->url, cover.asset->url),
  "heroVideo": heroVideo.asset->url,
  alt, description, deliverables, websiteUrl,
  gallery[]{type, device, "src": images[]{"url": asset->url, "isVideo": _type == "video"}, heading, body, badgeLabel, "video": video.asset->url}
}`;

// Same gallery projection as PROJECTS_QUERY above, on purpose — the
// store's product page reuses the exact same galleryBlock schema and
// renderGalleryBlocks() frontend function as a project's "view more"
// (Evy: "use the same layout block that i use in the cases... so if i
// change this layout somewhere it changes everywhere").
const PRODUCTS_QUERY = `*[_type == "product"] | order(order asc){
  "slug": slug.current, title, category, price,
  "cover": cover.asset->url,
  alt, shortDescription, buyUrl,
  gallery[]{type, device, "src": images[]{"url": asset->url, "isVideo": _type == "video"}, heading, body, badgeLabel, "video": video.asset->url}
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

const [site, projects, products] = await Promise.all([
  runQuery(SITE_QUERY),
  runQuery(PROJECTS_QUERY),
  runQuery(PRODUCTS_QUERY),
]);

const home = site.home || {};
const aboutHero = site.aboutHero || {};
const contact = site.contact || {};
const footer = site.footer || {};
const general = site.general || {};

const settings = {
  homeHeroTitle: home.heroTitle,
  homeHeroBody: home.heroBody,
  tornadoPortrait: home.tornadoPortrait,
  tornadoCards: home.tornadoCards,
  aboutHeroHeading: aboutHero.heroHeading,
  aboutHeroLede: aboutHero.heroLede,
  aboutHeroDetail1: aboutHero.heroDetail1,
  aboutHeroDetail2: aboutHero.heroDetail2,
  aboutPortrait: aboutHero.portrait,
  awards: site.awards,
  timeline: site.timeline,
  logos: site.logos,
  contactIntro: contact.intro,
  projectsIntro: site.projectsIntro,
  email: footer.email,
  instagramUrl: footer.instagramUrl,
  linkedinUrl: footer.linkedinUrl,
  favicon: general.favicon,
  cta: site.cta,
};

// Block order per page (a page's `blocks` references, in order) and the
// menu order — see studio/schemaTypes/blocks.ts. A page whose list is
// null/empty is left exactly as its HTML has it.
const pages = site.pages || {};
const nav = general.nav || [];

const fs = await import("node:fs/promises");
const path = await import("node:path");
const outPath = path.join(import.meta.dirname, "..", "content.json");
await fs.writeFile(outPath, JSON.stringify({settings, projects, products, pages, nav}, null, 2));

console.log(`Wrote ${outPath}`);

// sitemap.xml — always points at the production domain regardless of
// which domain actually serves this build (staging's own robots.txt
// blocks every crawler anyway, so it never matters there). Store/
// store-item are deliberately left out for now — Evy: "nog niet de
// store" — add them back in once Store is live on production.
// Project pages use ?slug=, so <loc> carries the query string; that's
// unusual but correct for this site's own shared-template routing.
const SITE_URL = "https://evydiepenbroek.nl";
const STATIC_PAGES = ["", "about", "projects", "contact"];
const today = new Date().toISOString().slice(0, 10);
const urlEntries = [
  ...STATIC_PAGES.map(
    (p) => `  <url>\n    <loc>${SITE_URL}/${p}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`,
  ),
  ...projects.map(
    (p) =>
      `  <url>\n    <loc>${SITE_URL}/project?slug=${encodeURIComponent(p.slug)}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`,
  ),
].join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`;
const sitemapPath = path.join(import.meta.dirname, "..", "sitemap.xml");
await fs.writeFile(sitemapPath, sitemap);
console.log(`Wrote ${sitemapPath}`);

// llms.txt — a plain-English summary for AI crawlers/agents that
// don't execute JavaScript (this site's actual page content is
// rendered client-side from Sanity, which those crawlers never see —
// this file is the one place a non-JS crawler gets real, accurate
// content regardless). Loosely follows the emerging llms.txt
// convention (plain markdown, not guaranteed to be read by anything
// in particular yet, but costs nothing and only helps).
const llmsProjects = projects
  .map((p) => `- [${p.title}](${SITE_URL}/project?slug=${encodeURIComponent(p.slug)})${p.description ? ": " + p.description.replace(/\s+/g, " ").slice(0, 200) : ""}`)
  .join("\n");
const llmsTxt = `# Evy Diepenbroek

> ${settings.aboutHeroLede || "Graphic designer working across brand identity, UX/UI, editorial and motion design."}

Evy is based in Rotterdam and Breda (the Netherlands) and works with clients across the Netherlands, including Amsterdam.

Most of Evy's client work was produced at design agencies and can't be shown publicly here (see /projects) — the personal/independent projects below are her own.

## Pages

- [Home](${SITE_URL}/)
- [About](${SITE_URL}/about)
- [Projects](${SITE_URL}/projects)
- [Contact](${SITE_URL}/contact)

## Projects

${llmsProjects}

## Contact

${settings.email ? "Email: " + settings.email : ""}
`;
const llmsPath = path.join(import.meta.dirname, "..", "llms.txt");
await fs.writeFile(llmsPath, llmsTxt);
console.log(`Wrote ${llmsPath}`);
