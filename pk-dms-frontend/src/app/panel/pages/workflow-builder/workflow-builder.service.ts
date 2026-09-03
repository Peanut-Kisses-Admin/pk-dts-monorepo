import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { BACKEND_API_BASE_URL } from '@/app/config/api-config';
import { PublishedWorkflowVersion, WorkflowDefinition, WorkflowGraph, WorkflowVersion } from './workflow-builder.types';

type Envelope<T> = T | { data: T };
const API = `${BACKEND_API_BASE_URL}/workflow-definitions`;

@Injectable({ providedIn: 'root' })
export class WorkflowBuilderService {
    private http = inject(HttpClient);

    list(includeInactive = true) {
        return this.http.get<Envelope<WorkflowDefinition[]>>(API, { params: { include_inactive: includeInactive } }).pipe(map(this.unwrap));
    }

    published(documentType?: 'SOFTCOPY' | 'HARDCOPY') {
        return this.http.get<Envelope<PublishedWorkflowVersion[]>>(`${API}/published`, {
            params: documentType ? { document_type: documentType } : {}
        }).pipe(map(this.unwrap));
    }

    create(payload: { workflow_key: string; name: string; description?: string; document_type?: 'SOFTCOPY' | 'HARDCOPY'; graph: WorkflowGraph }) {
        return this.http.post<Envelope<WorkflowDefinition>>(API, payload).pipe(map(this.unwrap));
    }

    createVersion(definitionId: string) {
        return this.http.post<Envelope<WorkflowVersion>>(`${API}/${definitionId}/versions`, {}).pipe(map(this.unwrap));
    }

    save(definitionId: string, versionId: string, graph: WorkflowGraph) {
        return this.http.put<Envelope<WorkflowVersion>>(`${API}/${definitionId}/versions/${versionId}`, { graph }).pipe(map(this.unwrap));
    }

    publish(definitionId: string, versionId: string) {
        return this.http.post<Envelope<WorkflowVersion>>(`${API}/${definitionId}/versions/${versionId}/publish`, {}).pipe(map(this.unwrap));
    }

    setActive(definitionId: string, isActive: boolean) {
        return this.http.patch<Envelope<WorkflowDefinition>>(`${API}/${definitionId}/active`, { is_active: isActive }).pipe(map(this.unwrap));
    }

    private unwrap<T>(response: Envelope<T>): T {
        return response && typeof response === 'object' && 'data' in response ? response.data : response;
    }
}
