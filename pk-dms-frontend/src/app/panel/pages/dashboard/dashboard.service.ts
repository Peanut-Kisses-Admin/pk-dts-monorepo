import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { BACKEND_API_BASE_URL } from '@/app/config/api-config';
import { ApiResponseEnvelope, DashboardSummary, NavigationNotificationCounts } from './dashboard.types';

const DASHBOARD_API = `${BACKEND_API_BASE_URL}/dashboard`;

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private http = inject(HttpClient);

    getSummary() {
        return this.http.get<ApiResponseEnvelope<DashboardSummary> | DashboardSummary>(`${DASHBOARD_API}/summary`).pipe(map((response) => this.unwrap(response)));
    }

    getNavigationCounts() {
        return this.http.get<ApiResponseEnvelope<NavigationNotificationCounts> | NavigationNotificationCounts>(`${DASHBOARD_API}/navigation-counts`).pipe(map((response) => this.unwrap(response)));
    }

    private unwrap<T>(response: ApiResponseEnvelope<T> | T): T {
        if (this.isEnvelope(response)) {
            return response.data;
        }

        return response;
    }

    private isEnvelope<T>(response: ApiResponseEnvelope<T> | T): response is ApiResponseEnvelope<T> {
        return !!response && typeof response === 'object' && 'data' in response;
    }
}
