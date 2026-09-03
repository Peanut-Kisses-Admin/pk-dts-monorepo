import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { BACKEND_API_BASE_URL } from '@/app/config/api-config';

export interface RegistrationRole { role_id: string; role_name: string; description?: string | null; }
export interface RegistrationReceipt { reference_code: string; status: 'PENDING'; created_at: string; requested_role: { role_name: string }; message: string; }
export interface RegistrationReference { reference_code: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; created_at: string; }
export interface RegistrationStatusResult {
    reference_code: string; firstname: string; lastname: string; status: 'PENDING' | 'APPROVED' | 'REJECTED';
    review_remarks?: string | null; created_at: string; reviewed_at?: string | null;
    requested_role: { role_name: string }; assigned_role?: { role_name: string } | null;
}

type Envelope<T> = T | { data: T };
const API = `${BACKEND_API_BASE_URL}/registrations`;

@Injectable({ providedIn: 'root' })
export class RegistrationService {
    private http = inject(HttpClient);

    roles() { return this.http.get<Envelope<RegistrationRole[]>>(`${API}/roles`).pipe(map(this.unwrap)); }
    register(payload: Record<string, unknown>) { return this.http.post<Envelope<RegistrationReceipt>>(API, payload).pipe(map(this.unwrap)); }
    reference(email: string) { return this.http.post<Envelope<RegistrationReference>>(`${API}/reference`, { email }).pipe(map(this.unwrap)); }
    status(email: string, reference_code: string) { return this.http.post<Envelope<RegistrationStatusResult>>(`${API}/status`, { email, reference_code }).pipe(map(this.unwrap)); }

    private unwrap<T>(response: Envelope<T>): T { return response && typeof response === 'object' && 'data' in response ? response.data : response; }
}
