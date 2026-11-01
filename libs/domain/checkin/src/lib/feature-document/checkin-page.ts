import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CheckinChatService } from './checkin-chat-service';
import { CheckinTicketStore } from './checkin-ticket-store';

@Component({
  selector: 'app-checkin-page',
  imports: [FormField, RouterLink],
  template: `
    <section class="card">
      <div class="card-header">
        <h2 class="card-title">Document Check-in</h2>
      </div>
      <div class="card-body">
        <p>
          Choose a sample ticket or ID image to prefill the form. Review the extracted fields before
          confirming.
        </p>
        <label id="document-label" for="ticket-document">Ticket or ID document (PNG or JPEG)</label>
        <div class="document-picker">
          <input
            #documentInput
            id="ticket-document"
            type="file"
            hidden
            accept="image/png,image/jpeg"
            [disabled]="busy()"
            (change)="selectDocument($event)"
          />
          <button
            type="button"
            class="btn btn-primary"
            [disabled]="busy()"
            aria-describedby="document-label document-name"
            (click)="documentInput.click()"
          >
            Choose document
          </button>
          <span id="document-name" class="document-name">
            {{ selectedFileName() || 'No document selected' }}
          </span>
        </div>
        @if (preview()) {
          <img class="document-preview" [src]="preview()" alt="Selected document preview" />
        }
        <p role="status">{{ status() }}</p>
        <form (submit)="$event.preventDefault(); confirm()">
          <label for="ticket-id">Ticket ID</label
          ><input class="form-control" id="ticket-id" [formField]="fields.ticketId" />
          <label for="first-name">First name</label
          ><input
            class="form-control"
            id="first-name"
            autocomplete="given-name"
            [formField]="fields.firstName"
          />
          <label for="last-name">Last name</label
          ><input
            class="form-control"
            id="last-name"
            autocomplete="family-name"
            [formField]="fields.lastName"
          />
          <label for="email">Email</label
          ><input
            class="form-control"
            id="email"
            type="email"
            autocomplete="email"
            [formField]="fields.email"
          />
          <label for="passport-number">Passport number</label
          ><input class="form-control" id="passport-number" [formField]="fields.passportNumber" />
          <label for="issued-on">Issued on</label
          ><input class="form-control" id="issued-on" type="date" [formField]="fields.issuedOn" />
          <label for="valid-until">Valid until</label
          ><input class="form-control" id="valid-until" type="date" [formField]="fields.validUntil" />
          <label for="issuing-authority">Issuing authority</label
          ><input class="form-control" id="issuing-authority" [formField]="fields.issuingAuthority" />
          <label
            ><input type="checkbox" [formField]="fields.reviewed" /> I have reviewed the extracted
            fields.</label
          >
          <button
            class="btn btn-primary"
            [disabled]="fields().invalid() || !model().reviewed || busy()"
          >
            Confirm demo check-in
          </button>
        </form>
        @if (confirmed()) {
          <p role="status">
            Demo check-in confirmed. No passenger data was submitted to a booking system.
          </p>
        }
        <a routerLink="/checkin/passenger/search">Passenger search</a>
      </div>
    </section>
  `,
  styles: `
    .document-picker {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      max-width: 35rem;
    }
    .document-picker .btn {
      max-width: 100%;
      margin: 0;
      white-space: normal;
    }
    .document-name {
      flex: 1 1 12rem;
      min-width: 0;
      overflow-wrap: anywhere;
      color: #595959;
    }
    form {
      display: grid;
      gap: 0.5rem;
      max-width: 35rem;
    }
    .document-preview {
      max-width: 100%;
      max-height: 15rem;
      object-fit: contain;
      margin-block: 1rem;
    }
  `,
})
export class CheckinPage {
  private readonly chat = inject(CheckinChatService);
  private readonly ticketStore = inject(CheckinTicketStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly model = signal({
    ticketId: this.route.snapshot.paramMap.get('ticketId') ?? '',
    firstName: '',
    lastName: '',
    email: '',
    passportNumber: '',
    issuedOn: '',
    validUntil: '',
    issuingAuthority: '',
    reviewed: false,
  });
  protected readonly fields = form(this.model, (p) => {
    required(p.ticketId);
    required(p.firstName);
    required(p.lastName);
  });
  protected readonly preview = signal('');
  protected readonly selectedFileName = signal('');
  protected readonly confirmed = signal(false);
  protected readonly busy = computed(() =>
    ['uploading', 'analyzing'].includes(this.ticketStore.status()),
  );
  protected readonly status = computed(() => {
    switch (this.ticketStore.status()) {
      case 'uploading':
        return 'Preparing image…';
      case 'analyzing':
        return 'Analyzing document…';
      case 'filled':
        return 'Fields prefilled. Please review them.';
      case 'error':
        return this.ticketStore.errorMessage() ?? 'Could not read the document.';
      default:
        return '';
    }
  });
  constructor() {
    effect(() => {
      const ticket = this.ticketStore.extractedTicket();
      if (!ticket) return;
      const passenger = ticket.passenger;
      this.model.update((value) => ({
        ...value,
        ticketId: ticket.ticketId ?? value.ticketId,
        firstName: passenger?.firstName ?? value.firstName,
        lastName: passenger?.lastName ?? value.lastName,
        email: passenger?.email ?? value.email,
        ...passenger?.passport,
        reviewed: false,
      }));
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.preview()) URL.revokeObjectURL(this.preview());
      this.chat.cancel();
      this.ticketStore.reset();
    });
  }
  protected selectDocument(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.selectedFileName.set(file.name);
    if (this.preview()) URL.revokeObjectURL(this.preview());
    this.preview.set(URL.createObjectURL(file));
    this.confirmed.set(false);
    this.model.set({
      ticketId: '',
      firstName: '',
      lastName: '',
      email: '',
      passportNumber: '',
      issuedOn: '',
      validUntil: '',
      issuingAuthority: '',
      reviewed: false,
    });
    void this.chat.submitTicketImage(file);
  }
  protected confirm(): void {
    if (!this.fields().invalid() && this.model().reviewed && !this.busy()) this.confirmed.set(true);
  }
}
