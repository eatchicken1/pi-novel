# Pi-Novel Runtime Controls Design QA

## Source visual truth

- Source: `C:/Users/23127/Desktop/327493a8-fca6-41db-b665-c8aa1623af93.png`
- Source pixels: 1536 × 1024
- Source role: overall desktop application direction; the sample copy and records are not treated as product data.

## Rendered implementation

- Home screenshot: `D:/Dev/workspace/pi-novel/design-qa-home.png`
- Studio screenshot: `D:/Dev/workspace/pi-novel/design-qa-studio.png`
- Provider login screenshot: `D:/Dev/workspace/pi-novel/design-qa-auth.png`
- Model selector screenshot: `D:/Dev/workspace/pi-novel/design-qa-models.png`
- Combined comparison: `D:/Dev/workspace/pi-novel/design-qa-comparison.png`
- CSS viewport: 1536 × 1024
- Implementation pixels: 1536 × 1024
- Density normalization: none; the source and browser capture use the same pixel dimensions. The browser capture is JPEG-encoded by the browser tool; the comparison sheet converts it to PNG without resizing.

## State

- Workspace initialized at the existing local `novels` directory.
- Home state contains one scanned Legacy project.
- Studio state is `/studio?projectId=ninth-year-claim`, with the real Legacy read-only indicator visible.
- The implementation removes the reference's large dark top bar and replaces it with a light workspace toolbar that keeps author authority, current model, and provider login visible without consuming a full-width dark band.
- Runtime settings expose 7 OAuth-capable providers from the shared CLI catalog and a searchable model catalog. The Web layer does not fake token state; it provides the exact CLI login command and refresh guidance.
- The source is a multi-section panorama while the implementation is a live shell; content density and records are intentionally not identical.

## Evidence and review

- Full-view comparison: `design-qa-comparison.png` compares the source panorama and live Home screen at the same viewport.
- Focused comparisons: `design-qa-studio.png` checks the Studio composition; `design-qa-auth.png` checks the provider list, connection state, CLI handoff card, and copy action; `design-qa-models.png` checks provider counts, search affordance, model metadata badges, and selected-model state.
- Primary interactions tested: Workspace initialization, Home → Library navigation, project filtering, Legacy project opening, Studio tab switching, chapter-node selection, draft text input, refresh/rescan, URL project-id persistence, refresh restoration, provider login tab switching, CLI command copy feedback, model search/list rendering, model selection, and selected-model toolbar persistence.
- Console errors checked: none.

## Findings

- No actionable P0, P1, or P2 visual findings.
- P3 follow-up: the source panorama contains additional Story Graph, Canon, History, and Review panels below the main Studio surface. The current shell reserves those panels for later vertical slices; adding them now would exceed the current architecture slice.
- P3 follow-up: the implementation uses Lucide icons and system Chinese/Latin font fallbacks because the reference does not provide a separate logo or font asset.

## Comparison history

- Initial comparison: the visual direction, proportions, token palette, typography hierarchy, and interaction affordances were aligned; no P0/P1/P2 fix was required.
- Runtime-controls pass: the large black top bar was removed, the light toolbar was added, and the login/model controls were checked at the same 1536 × 1024 viewport. No P0/P1/P2 fix was required.
- Persistence verification was performed after the visual pass and fixed URL project-id restoration plus saved Workspace-path reopening. The final Studio capture was taken after that fix.

## Implementation checklist

- [x] Desktop shell and navigation match the reference hierarchy.
- [x] Home, Library, and Studio states are interactive.
- [x] Native and Legacy project states are visually distinct.
- [x] Legacy write protection is explicit in Studio.
- [x] Typography, spacing, color tokens, icons, copy, and responsive fallback reviewed.
- [x] Browser-rendered evidence captured at 1536 × 1024.
- [x] CLI provider parity is verified against the shared OAuth provider catalog.
- [x] Login handoff and model selection interactions are verified.

final result: passed
