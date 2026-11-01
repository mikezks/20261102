import { Directive, effect, inject, input } from '@angular/core';
import {
  NavigationService,
  provideNavigationService,
} from '../../logic-navigation/provider/navigation.provider';
import { NavigationConfig } from '../../model-navigation/navigation.model';

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector -- preserves the existing workshop template API
  selector: '[navConfig]',
  standalone: true,
  providers: [provideNavigationService([])],
})
export class NavigationProviderDirective {
  navService = inject(NavigationService);
  navConfig = input.required<NavigationConfig>();

  constructor() {
    effect(() => this.navService.state.set(this.navConfig()));
  }
}
