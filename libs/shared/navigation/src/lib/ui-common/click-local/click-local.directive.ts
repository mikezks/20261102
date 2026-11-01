import { Directive, HostListener, output } from '@angular/core';

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector -- preserves the existing workshop template API
  selector: '[clickLocal]',
  standalone: true,
})
export class ClickLocal {
  clickLocal = output<Event>();

  @HostListener('click', ['$event'])
  public onClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.clickLocal.emit(event);
  }
}
