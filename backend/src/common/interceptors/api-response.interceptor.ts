import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { map, type Observable } from "rxjs";

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: null;
}

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (isApiResponse(data)) {
          return data;
        }

        return {
          success: true,
          data,
          error: null,
        };
      }),
    );
  }
}

function isApiResponse<T>(value: T | ApiResponse<T>): value is ApiResponse<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "data" in value &&
    "error" in value
  );
}
