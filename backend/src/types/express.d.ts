import { UserRole, UserStatus } from './index';

declare global {
  namespace Express {
    interface User {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      google_id?: string;
      avatar_url?: string;
      status: UserStatus;
      created_at: string;
      updated_at: string;
    }

    interface Request {
      user?: User;
      requestId?: string;
    }
  }
}
