/**
 * Which website URL each CMS page feeds.
 *
 * Mirrors `v1/frontend/lib/cms-pages.ts` — the website resolves a page by name
 * first and falls back to its row id, so a rename never detaches the content.
 * Kept as a copy rather than an import because the admin is a separate Vite app;
 * if you add a route there, add it here too.
 */

type WebsiteRoute = { id: number; route: string; aliases: string[] };

const WEBSITE_ROUTES: WebsiteRoute[] = [
    { id: 1, route: "/", aliases: ["home", "homepage", "landing", "main"] },
    { id: 2, route: "/about", aliases: ["about", "about us", "about_us"] },
    {
        id: 3,
        route: "/paranjothi",
        aliases: ["paranjothi", "gnanaguru paranjothi", "paranjothi subramaniam", "guru"],
    },
    { id: 4, route: "/community", aliases: ["community", "community events", "community_events"] },
    { id: 5, route: "/programs", aliases: ["program", "programs", "our programs"] },
    { id: 6, route: "/contact", aliases: ["contact", "contact us", "contact_us"] },
];

const normalize = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[\s_-]+/g, "")
        .replace(/page$/, "");

const claimedByOthers = (self: WebsiteRoute) =>
    new Set(
        WEBSITE_ROUTES.filter((r) => r !== self)
            .flatMap((r) => r.aliases)
            .map(normalize)
    );

/** The website URL this page renders on, or null when it isn't wired to one. */
export function routeForPage(page: { id: number; name: string }): string | null {
    const name = normalize(page.name);

    const byName = WEBSITE_ROUTES.find((r) => r.aliases.some((a) => normalize(a) === name));
    if (byName) return byName.route;

    // Renamed: the website falls back to the row id, so report the same binding.
    const byId = WEBSITE_ROUTES.find((r) => r.id === page.id);
    if (byId && !claimedByOthers(byId).has(name)) return byId.route;

    return null;
}
