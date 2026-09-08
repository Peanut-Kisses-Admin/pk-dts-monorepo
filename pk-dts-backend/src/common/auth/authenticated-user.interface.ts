export interface AuthenticatedUser {
  user_id: string;
  username: string;
  firstname: string;
  lastname: string;
  require_password_change: boolean;
  role: {
    role_id: string;
    role_name: string;
    permissions: string[];
  };
}
