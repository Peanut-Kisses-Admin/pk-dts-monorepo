export interface AuthenticatedUser {
  user_id: string;
  email: string;
  firstname: string;
  lastname: string;
  require_password_change: boolean;
  role: {
    role_id: string;
    role_name: string;
    permissions: string[];
  };
}
