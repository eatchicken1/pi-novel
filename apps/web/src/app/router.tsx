export type AppRoute = "home" | "library" | "studio";

export function routeFromPath(pathname: string): AppRoute {
	if (pathname.startsWith("/library")) return "library";
	if (pathname.startsWith("/studio")) return "studio";
	return "home";
}

export function pathForRoute(route: AppRoute): string {
	return route === "home" ? "/" : `/${route}`;
}
