import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { BACKEND_API_BASE_URL } from '@/app/config/api-config';
import { HardcopyTransferRequest } from './hardcopy-transfers.types';

type Envelope<T> = T | { data: T };
const API = `${BACKEND_API_BASE_URL}/hardcopy-transfers`;

@Injectable({ providedIn: 'root' })
export class HardcopyTransfersService {
    private http = inject(HttpClient);
    mine() { return this.http.get<Envelope<HardcopyTransferRequest[]>>(`${API}/mine`).pipe(map(this.unwrap)); }
    pending() { return this.http.get<Envelope<HardcopyTransferRequest[]>>(`${API}/pending`).pipe(map(this.unwrap)); }
    create(payload: { document_id: string; current_holder_user_id?: string; reason: string; destination_area_id?: string; destination_specific_id?: string; destination_asset_id?: string; destination_location_id: string; destination_sequence_id?: string; comments?: string }) { return this.http.post<Envelope<HardcopyTransferRequest>>(API, payload).pipe(map(this.unwrap)); }
    submit(id: string) { return this.http.post<Envelope<HardcopyTransferRequest>>(`${API}/${id}/submit`, {}).pipe(map(this.unwrap)); }
    approve(id: string, comments = '') { return this.http.post<Envelope<HardcopyTransferRequest>>(`${API}/${id}/approve`, { remarks: comments }).pipe(map(this.unwrap)); }
    returnForCorrection(id: string, comments: string) { return this.http.post<Envelope<HardcopyTransferRequest>>(`${API}/${id}/return`, { remarks: comments }).pipe(map(this.unwrap)); }
    reject(id: string, comments: string) { return this.http.post<Envelope<HardcopyTransferRequest>>(`${API}/${id}/reject`, { remarks: comments }).pipe(map(this.unwrap)); }
    resubmit(id: string) { return this.http.post<Envelope<HardcopyTransferRequest>>(`${API}/${id}/resubmit`, {}).pipe(map(this.unwrap)); }
    cancel(id: string, comments = '') { return this.http.post<Envelope<HardcopyTransferRequest>>(`${API}/${id}/cancel`, { remarks: comments }).pipe(map(this.unwrap)); }
    forTransfer(id: string) { return this.http.post<Envelope<HardcopyTransferRequest>>(`${API}/${id}/for-transfer`, {}).pipe(map(this.unwrap)); }
    dispatch(id: string) { return this.http.post<Envelope<HardcopyTransferRequest>>(`${API}/${id}/dispatch`, {}).pipe(map(this.unwrap)); }
    awaitAcceptance(id: string) { return this.http.post<Envelope<HardcopyTransferRequest>>(`${API}/${id}/await-acceptance`, {}).pipe(map(this.unwrap)); }
    accept(id: string, comments = '') { return this.http.post<Envelope<HardcopyTransferRequest>>(`${API}/${id}/accept`, { remarks: comments }).pipe(map(this.unwrap)); }
    private unwrap<T>(response: Envelope<T>): T { return response && typeof response === 'object' && 'data' in response ? response.data : response; }
}
