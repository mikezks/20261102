import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    console.log('HTTP Request', req.method, req.url);

    if (req.url.startsWith('https://demo.angulararchitects.io/api')) {
      const headers = req.headers.set('Authorization', 'Bearer MyAuthToken-A1B2C3');
      req = req.clone({ headers });
    }

    return next
      .handle(req)
      .pipe(tap((resp) => console.log('HTTP Response Log Info from Root', resp)));
  }
}
