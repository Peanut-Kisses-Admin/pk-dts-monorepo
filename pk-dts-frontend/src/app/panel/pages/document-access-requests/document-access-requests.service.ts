import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { BACKEND_API_BASE_URL } from '@/app/config/api-config';
import { AccessRequestDocument, AccessRequestLocation, AccessRequestPage, DocumentAccessRequest, DocumentAccessRequestStatus } from './document-access-requests.types';

type Envelope<T> = T | { data: T };
const API = `${BACKEND_API_BASE_URL}/document-access-requests`;

@Injectable({ providedIn: 'root' })
export class DocumentAccessRequestsService {
    private http = inject(HttpClient);

    catalog(query = '', type = '', locationId = '', page = 1, limit = 12) {
        let params = new HttpParams().set('page', page).set('limit', limit);
        if (query.trim()) params = params.set('query', query.trim());
        if (type) params = params.set('type', type);
        if (locationId) params = params.set('location_id', locationId);
        return this.http.get<Envelope<AccessRequestPage<AccessRequestDocument>>>(`${API}/catalog`, { params }).pipe(map(this.unwrap));
    }

    locations() {
        return this.http.get<Envelope<AccessRequestLocation[]>>(`${API}/locations`).pipe(map(this.unwrap));
    }

    create(document_id: string, request_reason: string) {
        return this.http.post<Envelope<DocumentAccessRequest>>(API, { document_id, request_reason: request_reason.trim() || undefined }).pipe(map(this.unwrap));
    }

    mine(page = 1, limit = 50) {
        return this.http.get<Envelope<AccessRequestPage<DocumentAccessRequest>>>(`${API}/mine`, { params: { page, limit } }).pipe(map(this.unwrap));
    }

    cancel(accessRequestId: string) {
        return this.http.patch<Envelope<DocumentAccessRequest>>(`${API}/${accessRequestId}/cancel`, {}).pipe(map(this.unwrap));
    }

    pending(page = 1, limit = 100) {
        return this.http.get<Envelope<AccessRequestPage<DocumentAccessRequest>>>(`${API}/pending`, { params: { page, limit } }).pipe(map(this.unwrap));
    }

    review(accessRequestId: string, status: 'APPROVED' | 'REJECTED' | 'RETURNED', reviewer_remarks: string) {
        return this.http.patch<Envelope<DocumentAccessRequest>>(`${API}/${accessRequestId}/review`, { status, reviewer_remarks: reviewer_remarks.trim() || undefined }).pipe(map(this.unwrap));
    }

    grant(accessRequestId: string) {
        return this.http.patch<Envelope<DocumentAccessRequest>>(`${API}/${accessRequestId}/grant`, {}).pipe(map(this.unwrap));
    }
    revoke(accessRequestId: string) { return this.http.patch<Envelope<DocumentAccessRequest>>(`${API}/${accessRequestId}/revoke`, {}).pipe(map(this.unwrap)); }
    expire(accessRequestId: string) { return this.http.patch<Envelope<DocumentAccessRequest>>(`${API}/${accessRequestId}/expire`, {}).pipe(map(this.unwrap)); }

    private unwrap<T>(response: Envelope<T>): T {
        return response && typeof response === 'object' && 'data' in response ? response.data : response;
    }
}
