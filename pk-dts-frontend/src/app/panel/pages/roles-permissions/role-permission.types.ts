export interface ApiResponseEnvelope<T> {
    success?: boolean;
    path?: string;
    timestamp?: string;
    message?: string;
    data: T;
}

export interface RoleUserCount {
    users?: number;
}

export interface Permission {
    permission_id: string;
    permission_name: string;
    module_key?: string;
    module_label?: string;
    action_key?: string;
    action_label?: string;
    description?: string | null;
    role_permissions?: RolePermission[];
}

export interface Role {
    role_id: string;
    role_name: string;
    description?: string | null;
    role_permissions?: RolePermission[];
    users?: unknown[];
    _count?: RoleUserCount;
}

export interface RolePermission {
    role_permission_id: string;
    role_id: string;
    permission_id: string;
    role?: Role;
    permission?: Permission;
}

export interface RoleFormValue {
    role_name: string;
    description?: string;
}

export interface PermissionFormValue {
    permission_name: string;
    description?: string;
}

export interface AssignPermissionFormValue {
    role_id: string;
    permission_id: string;
}
