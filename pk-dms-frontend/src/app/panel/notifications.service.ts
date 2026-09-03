import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { BACKEND_API_BASE_URL } from '@/app/config/api-config';

export interface UserNotification { event_key: string; title: string; message: string; route: string; created_at: string; icon: string; read: boolean; }
export interface NotificationFeed { items: UserNotification[]; unread_count: number; }

@Injectable({ providedIn: 'root' })
export class NotificationsService {
    private http = inject(HttpClient);
    list() { return this.http.get<any>(`${BACKEND_API_BASE_URL}/notifications`).pipe(map((response) => response?.data ?? response)); }
    read(eventKey: string) { return this.http.patch(`${BACKEND_API_BASE_URL}/notifications/${encodeURIComponent(eventKey)}/read`, {}); }
    readAll() { return this.http.patch(`${BACKEND_API_BASE_URL}/notifications/read-all`, {}); }
}
