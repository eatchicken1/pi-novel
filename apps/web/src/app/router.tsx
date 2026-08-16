import { createBrowserRouter, Navigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell, useAppShellContext } from "./AppShell.tsx";
import { LibraryPage } from "../features/library/LibraryPage.tsx";
import { StudioPage } from "../features/studio/StudioPage.tsx";
import { WorkspaceHome } from "../features/workspace/WorkspaceHome.tsx";
import { ForgePage } from "../features/forge/ForgePage.tsx";

export const router = createBrowserRouter([
	{
		path: "/",
		element: <AppShell />,
		children: [
			{ index: true, element: <HomeRoute /> },
			{ path: "library", element: <LibraryRoute /> },
			{ path: "forge/:sessionId", element: <ForgePage /> },
			{ path: "project/:projectId/manuscript/:chapterId?", element: <ProjectRoute /> },
			{ path: "project/:projectId/structure", element: <ProjectRoute /> },
			{ path: "project/:projectId/canon", element: <ProjectRoute /> },
			{ path: "project/:projectId/review", element: <ProjectRoute /> },
			{ path: "project/:projectId/history", element: <ProjectRoute /> },
			{ path: "settings", element: <Navigate replace to="/" /> },
			{ path: "studio", element: <LegacyStudioRedirect /> },
			{ path: "*", element: <Navigate replace to="/" /> },
		],
	},
]);

function HomeRoute() {
	const context = useAppShellContext();
	return <WorkspaceHome overview={context.overview} onNavigate={context.onNavigate} onOpenProject={context.onOpenProject} onRescan={context.onRescan} onCreateForgeSession={context.onCreateForgeSession} />;
}

function LibraryRoute() {
	const context = useAppShellContext();
	return <LibraryPage overview={context.overview} onOpenProject={context.onOpenProject} onRescan={context.onRescan} />;
}

function ProjectRoute() {
	const { projectId } = useParams();
	const { overview } = useAppShellContext();
	const project = overview.projects.find((entry) => entry.projectId === projectId) ?? null;
	return <StudioPage project={project} />;
}

function LegacyStudioRedirect() {
	const [searchParams] = useSearchParams();
	const projectId = searchParams.get("projectId");
	return projectId ? <Navigate replace to={`/project/${encodeURIComponent(projectId)}/manuscript`} /> : <Navigate replace to="/" />;
}
