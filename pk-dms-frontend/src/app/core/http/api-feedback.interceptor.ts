import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { BACKEND_API_BASE_URL } from '@/app/config/api-config';
import { AlertDialogService } from '@/app/shared/services/alert-dialog.service';

export const apiFeedbackInterceptor: HttpInterceptorFn = (request, next) => {
    const alerts = inject(AlertDialogService);

    return next(request).pipe(
        tap((event) => {
            if (!(event instanceof HttpResponse) || !isMutation(request.method) || isQuietMutation(request.url)) return;
            const feedback = extractFeedback(event.body);
            alerts.show(feedback.severity, feedback.title, feedback.message, feedback.details);
        }),
        catchError((error: unknown) => {
            if (request.url.startsWith(BACKEND_API_BASE_URL)) {
                alerts.error(errorTitle(error), extractErrorMessage(error));
            }
            return throwError(() => error);
        })
    );
};

function isMutation(method: string) { return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()); }
function isQuietMutation(url: string) { return url.includes('/auth/login') || url.includes('/documents/assistant/search'); }

function extractFeedback(body: unknown): { severity: 'success' | 'warning' | 'info'; title: string; message: string; details: string } {
    const envelope = asRecord(body);
    const data = asRecord(envelope?.['data']);
    const rawSeverity = stringValue(envelope?.['severity'] ?? data?.['severity']).toLowerCase();
    const severity = rawSeverity === 'warning' ? 'warning' : rawSeverity === 'info' ? 'info' : 'success';
    const message = stringValue(envelope?.['message'] ?? data?.['message']) || 'The request was completed successfully.';
    const details = stringValue(envelope?.['details'] ?? data?.['details']);
    return { severity, title: severity === 'warning' ? 'Request completed with a warning' : severity === 'info' ? 'Request completed' : 'Success', message, details };
}

function errorTitle(error: unknown) {
    if (error instanceof HttpErrorResponse) {
        if (error.status === 401) return 'Authentication required';
        if (error.status === 403) return 'Access denied';
        if (error.status === 404) return 'Record not found';
        if (error.status === 429) return 'Too many requests';
        if (error.status >= 500) return 'Server error';
    }
    return 'Request failed';
}

function extractErrorMessage(error: unknown) {
    if (error instanceof HttpErrorResponse) {
        const body = typeof error.error === 'string' ? error.error : asRecord(error.error);
        if (typeof body === 'string') return body;
        const message = body?.['message'] ?? body?.['error'] ?? body?.['details'];
        if (Array.isArray(message)) return message.join(', ');
        return stringValue(message) || error.message || 'The API request could not be completed.';
    }
    return error instanceof Error ? error.message : 'The API request could not be completed.';
}

function asRecord(value: unknown): Record<string, unknown> | null { return value && typeof value === 'object' ? (value as Record<string, unknown>) : null; }
function stringValue(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
