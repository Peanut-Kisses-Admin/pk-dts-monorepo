import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, expand, map, reduce } from 'rxjs';
import { BACKEND_API_BASE_URL } from '@/app/config/api-config';
import { ApiResponseEnvelope, PaginatedResponse, RegistrationRequestSummary, UserAccountDetail, UserAccountFormValue, UserAccountSummary, UserDocumentAssignmentOption, UserRoleSummary } from './user-account.types';

const USERS_API = `${BACKEND_API_BASE_URL}/users`;
const ROLES_API = `${BACKEND_API_BASE_URL}/roles`;
const REGISTRATIONS_API = `${BACKEND_API_BASE_URL}/registrations`;
const DOCUMENTS_API = `${BACKEND_API_BASE_URL}/documents`;
const LIST_LIMIT = 1000;

type ApiResponse<T> = ApiResponseEnvelope<T> | T;

@Injectable({ providedIn: 'root' })
export class UserAccountService {
    private http = inject(HttpClient);

    listUsers(page: number, limit: number) {
        return this.http
            .get<ApiResponse<PaginatedResponse<UserAccountSummary>>>(USERS_API, {
                params: { page, limit }
            })
            .pipe(map((response) => this.unwrap(response)));
    }

    getUser(id: string) {
        return this.http.get<ApiResponse<UserAccountDetail | null>>(`${USERS_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    getCurrentUser() {
        return this.http.get<ApiResponse<UserAccountDetail | null>>(`${USERS_API}/me`).pipe(map((response) => this.unwrap(response)));
    }

    createUser(payload: UserAccountFormValue) {
        return this.http.post<ApiResponse<UserAccountDetail>>(USERS_API, this.cleanPayload(payload, false)).pipe(map((response) => this.unwrap(response)));
    }

    updateUser(id: string, payload: UserAccountFormValue) {
        return this.http.patch<ApiResponse<UserAccountDetail>>(`${USERS_API}/${id}`, this.cleanPayload(payload, true)).pipe(map((response) => this.unwrap(response)));
    }

    deleteUser(id: string) {
        return this.http.delete<ApiResponse<UserAccountDetail | null>>(`${USERS_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    listDocumentAssignments(userId: string) {
        return this.http
            .get<ApiResponse<UserDocumentAssignmentOption[]>>(`${DOCUMENTS_API}/assignments/users/${userId}`)
            .pipe(map((response) => this.unwrap(response)));
    }

    assignDocuments(userId: string, documentIds: string[]) {
        return this.http
            .put<ApiResponse<{ user_id: string; document_ids: string[] }>>(`${DOCUMENTS_API}/assignments/users/${userId}`, { document_ids: documentIds })
            .pipe(map((response) => this.unwrap(response)));
    }

    listRoles() {
        return this.fetchAllPages<UserRoleSummary>(ROLES_API);
    }

    listRegistrationRequests(page = 1, limit = 50) {
        return this.http.get<ApiResponse<PaginatedResponse<RegistrationRequestSummary>>>(REGISTRATIONS_API, { params: { page, limit } }).pipe(map((response) => this.unwrap(response)));
    }

    listRegistrationRoles() {
        return this.http.get<ApiResponse<UserRoleSummary[]>>(`${REGISTRATIONS_API}/roles`).pipe(map((response) => this.unwrap(response)));
    }

    reviewRegistration(id: string, status: 'APPROVED' | 'REJECTED', assigned_role_id?: string, review_remarks?: string) {
        return this.http.patch<ApiResponse<unknown>>(`${REGISTRATIONS_API}/${id}/review`, { status, assigned_role_id, review_remarks }).pipe(map((response) => this.unwrap(response)));
    }

    private cleanPayload(payload: UserAccountFormValue, isUpdate: boolean) {
        const trimmedPassword = payload.password.trim();

        return {
            firstname: payload.firstname.trim(),
            lastname: payload.lastname.trim(),
            middlename: payload.middlename.trim() || undefined,
            age: payload.age.trim() ? Number(payload.age.trim()) : undefined,
            address: payload.address.trim() || undefined,
            phone_number: payload.phone_number.trim() || undefined,
            email: payload.email.trim(),
            position_title: payload.position_title.trim() || undefined,
            ...(isUpdate ? (trimmedPassword ? { password: trimmedPassword } : {}) : { password: trimmedPassword }),
            role_id: payload.role_id,
            leader_id: payload.leader_id || undefined
        };
    }

    private fetchAllPages<T>(url: string) {
        return this.fetchPage<T>(url, 1).pipe(
            expand((pageResponse) => {
                if (!this.hasNextPage(pageResponse)) {
                    return [];
                }

                return this.fetchPage<T>(url, (pageResponse.meta?.page ?? 1) + 1);
            }),
            map((pageResponse) => pageResponse.items ?? []),
            reduce((allItems, pageItems) => [...allItems, ...pageItems], [] as T[])
        );
    }

    private fetchPage<T>(url: string, page: number): Observable<PaginatedResponse<T>> {
        return this.http
            .get<ApiResponse<PaginatedResponse<T>>>(url, {
                params: {
                    page,
                    limit: LIST_LIMIT
                }
            })
            .pipe(map((response) => this.unwrap(response)));
    }

    private hasNextPage<T>(response: PaginatedResponse<T>) {
        if (response.meta?.has_next_page !== undefined) {
            return response.meta.has_next_page;
        }

        const page = response.meta?.page ?? 1;
        const totalPages = response.meta?.total_pages ?? 1;
        return page < totalPages;
    }

    private unwrap<T>(response: ApiResponse<T>): T {
        if (this.isEnvelope(response)) {
            return response.data;
        }

        return response;
    }

    private isEnvelope<T>(response: ApiResponse<T>): response is ApiResponseEnvelope<T> {
        return !!response && typeof response === 'object' && 'data' in response;
    }
}
