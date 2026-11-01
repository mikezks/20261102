import { ChangeDetectionStrategy, Component } from '@angular/core';


@Component({
  // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection -- preserves the workshop's pre-v22 behavior
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-home',
  imports: [],
  template: `
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Agentic UI</h2>
      </div>

      <div class="card-body">
        <ul>
          <li>AG-UI</li>
          <li>A2UI</li>
          <li>MCP Apps</li>
          <li>Human in the Loop</li>
          <li>Guardrails</li>
          <li>Agent Patterns</li>
          <li>Image &amp; Voice</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    code {
      color: blue;
    }
  `]
})
export class HomeComponent {
}
