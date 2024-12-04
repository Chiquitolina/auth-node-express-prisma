import { UserStatus } from "@prisma/client";

// types.ts
export interface UserResponse {
  id: number;
  email: string;
  full_name: string;
  status: UserStatus;
  profile_picture?: string | null;
  is_verified: boolean;
  last_login?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequestBody {
  email: string;
  password: string;
}

export interface RegisterRequestBody extends AuthRequestBody {
  full_name: string;
  verification_code: string;
  profile_picture?: string;
}

export interface UpdateStatusRequestBody {
  status: "online" | "offline" | "away" | "busy";
}
