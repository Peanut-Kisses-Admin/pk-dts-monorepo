import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, expand, map, reduce } from 'rxjs';
import { BACKEND_API_BASE_URL } from '@/app/config/api-config';
import {
    ApiResponseEnvelope,
    AssignPermissionFormValue,
    Permission,
    PermissionFormValue,
    Role,
    RoleFormValue,
    RolePermission
} from './role-permission.types';

const ROLES_API = `${BACKEND_API_BASE_URL}/roles`;
const PERMISSIONS_API = `${BACKEND_API_BASE_URL}/permissions`;
const ROLE_PERMISSIONS_API = `${BACKEND_API_BASE_URL}/role-permissions`;
const ACCESS_CONTROL_LIST_LIMIT = 1000;

type ApiResponse<T> = ApiResponseEnvelope<T> | T;
type PaginatedResponse<T> = {
    items: T[];
    meta?: {
        total?: number;
        page?: number;
        limit?: number;
        total_pages?: number;
        has_next_page?: boolean;
        has_previous_page?: boolean;
    };
};

@Injectable({ providedIn: 'root' })
export class RolePermissionService {
    private http = inject(HttpClient);

    listRoles() {
        return this.fetchAllPages<Role>(ROLES_API);
    }

    getRole(id: string) {
        return this.http.get<ApiResponse<Role>>(`${ROLES_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    createRole(payload: RoleFormValue) {
        return this.http.post<ApiResponse<Role>>(ROLES_API, this.cleanRolePayload(payload)).pipe(map((response) => this.unwrap(response)));
    }

    updateRole(id: string, payload: Partial<RoleFormValue>) {
        return this.http.patch<ApiResponse<Role>>(`${ROLES_API}/${id}`, this.cleanRolePayload(payload)).pipe(map((response) => this.unwrap(response)));
    }

    deleteRole(id: string) {
        return this.http.delete<ApiResponse<Role | null>>(`${ROLES_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    listPermissions() {
        return this.fetchAllPages<Permission>(PERMISSIONS_API);
    }

    getPermission(id: string) {
        return this.http.get<ApiResponse<Permission>>(`${PERMISSIONS_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    createPermission(payload: PermissionFormValue) {
        return this.http.post<ApiResponse<Permission>>(PERMISSIONS_API, this.cleanPermissionPayload(payload)).pipe(map((response) => this.unwrap(response)));
    }

    updatePermission(id: string, payload: Partial<PermissionFormValue>) {
        return this.http.patch<ApiResponse<Permission>>(`${PERMISSIONS_API}/${id}`, this.cleanPermissionPayload(payload)).pipe(map((response) => this.unwrap(response)));
    }

    deletePermission(id: string) {
        return this.http.delete<ApiResponse<Permission | null>>(`${PERMISSIONS_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    listRolePermissions() {
        return this.fetchAllPages<RolePermission>(ROLE_PERMISSIONS_API);
    }

    assignPermission(payload: AssignPermissionFormValue) {
        return this.http.post<ApiResponse<RolePermission>>(ROLE_PERMISSIONS_API, payload).pipe(map((response) => this.unwrap(response)));
    }

    removeRolePermission(id: string) {
        return this.http.delete<ApiResponse<RolePermission | null>>(`${ROLE_PERMISSIONS_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    private cleanRolePayload(payload: Partial<RoleFormValue>): Partial<RoleFormValue> {
        return {
            ...(payload.role_name !== undefined ? { role_name: payload.role_name.trim() } : {}),
            ...(payload.description !== undefined ? { description: payload.description.trim() || undefined } : {})
        };
    }

    private cleanPermissionPayload(payload: Partial<PermissionFormValue>): Partial<PermissionFormValue> {
        return {
            ...(payload.permission_name !== undefined ? { permission_name: payload.permission_name.trim() } : {}),
            ...(payload.description !== undefined ? { description: payload.description.trim() || undefined } : {})
        };
    }

    private unwrap<T>(response: ApiResponse<T>): T {
        if (this.isEnvelope(response)) {
            return response.data;
        }

        return response;
    }

    private unwrapList<T>(response: ApiResponse<PaginatedResponse<T>>): T[] {
        const payload = this.unwrap(response);

        if (Array.isArray(payload)) {
            return payload;
        }

        return payload?.items ?? [];
    }

    private isEnvelope<T>(response: ApiResponse<T>): response is ApiResponseEnvelope<T> {
        return !!response && typeof response === 'object' && 'data' in response;
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
                    limit: ACCESS_CONTROL_LIST_LIMIT
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
}
