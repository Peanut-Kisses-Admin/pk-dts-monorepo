export interface AuthRole {
    role_id: string;
    role_name: string;
    permissions?: string[];
    permission_details?: AuthPermissionDetail[];
}

export interface AuthPermissionDetail {
    permission_id: string;
    permission_name: string;
    module_key: string;
    module_label: string;
    action_key: string;
    action_label: string;
    description?: string | null;
}

export interface AuthUser {
    user_id: string;
    firstname: string;
    lastname: string;
    email: string;
    require_password_change?: boolean;
    role: AuthRole;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    user: AuthUser;
    token: string;
}
