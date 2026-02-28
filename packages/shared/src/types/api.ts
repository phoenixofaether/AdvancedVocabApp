export interface ApiResponse<T> {
  data: T;
  error: string | null;
  meta?: {
    page?: number;
    pageSize?: number;
    totalCount?: number;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  statusCode: number;
}
