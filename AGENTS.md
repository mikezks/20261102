You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- Pass AXE checks; report the optional `page-has-heading-one` recommendation separately for the intentional routed-page H2 structure.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.
- Use real `h2` elements for routed page/card titles. Do not imitate a heading level with `h1`/`h2` typography classes.
- Put standalone page titles in a Paper `page-title-card` with `card-header`, `h2.card-title` and an empty `card-body`; keep the title vertically centered. Use the same header structure inside content cards.
- Reuse the Paper theme's controls and shared focus styles. Keep keyboard focus visible and avoid separate focus colors per page.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- Do NOT import `CommonModule`, import only the directives and pipes the template uses, such as `AsyncPipe` or `DatePipe`
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection

## Angular AI tooling

- At the start of an Angular work phase, inspect the installed Node/Angular/CLI versions and MCP availability. Run `npm run setup:angular-ai` to verify the pinned skills, reuse valid dependencies, and probe the local CLI through MCP.
- Read `.agents/skills/angular-developer/SKILL.md` for Angular development and tooling; read its relevant references as needed. Apply `.agents/skills/angular-new-app/SKILL.md` only when creating a new application, before scaffolding. Do not create an app or upgrade Angular just to configure tooling.
- Check actual MCP tool names and input schemas, then call `list_projects` and `get_best_practices` using the discovered `angular.json` path. Match the installed Angular version and this CLI workspace's existing architecture.
- If the host has not discovered the skills, load the files explicitly. If native Angular MCP is unavailable, use the script-based SDK client in `tools/angular-ai/`; keep dev-server start/wait/stop in one session and close it reliably.
- See `docs/angular-ai-setup.md` for commands, provenance, verification and host limitations. Configuration files and ordinary shell commands alone do not prove MCP tool access.
