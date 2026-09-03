import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { BACKEND_API_BASE_URL } from '@/app/config/api-config';
import {
    ApiResponseEnvelope,
    AreaDetail,
    AreaSummary,
    AssetNumberDetail,
    AssetNumberSummary,
    LocationDetail,
    LocationSummary,
    PaginatedResponse,
    SequenceDetail,
    SequenceSummary,
    SoftcopyCategoryDetail,
    SoftcopyCategorySummary,
    SpecificDetail,
    SpecificSummary
} from './storage-classification.types';

const AREAS_API = `${BACKEND_API_BASE_URL}/areas`;
const ASSET_NUMBERS_API = `${BACKEND_API_BASE_URL}/asset-numbers`;
const SPECIFICS_API = `${BACKEND_API_BASE_URL}/specifics`;
const LOCATIONS_API = `${BACKEND_API_BASE_URL}/locations`;
const SEQUENCES_API = `${BACKEND_API_BASE_URL}/sequences`;
const SOFTCOPY_CATEGORIES_API = `${BACKEND_API_BASE_URL}/softcopy-categories`;

type ApiResponse<T> = ApiResponseEnvelope<T> | T;

@Injectable({ providedIn: 'root' })
export class StorageClassificationService {
    private http = inject(HttpClient);

    listAreas(page: number, limit: number) {
        return this.http.get<ApiResponse<PaginatedResponse<AreaSummary>>>(AREAS_API, { params: { page, limit } }).pipe(map((response) => this.unwrap(response)));
    }

    getArea(id: string) {
        return this.http.get<ApiResponse<AreaDetail | null>>(`${AREAS_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    createArea(payload: { area_name: string }) {
        return this.http.post<ApiResponse<AreaDetail>>(AREAS_API, payload).pipe(map((response) => this.unwrap(response)));
    }

    updateArea(id: string, payload: { area_name?: string }) {
        return this.http.patch<ApiResponse<AreaDetail>>(`${AREAS_API}/${id}`, payload).pipe(map((response) => this.unwrap(response)));
    }

    deleteArea(id: string) {
        return this.http.delete<ApiResponse<AreaDetail | null>>(`${AREAS_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    listAssetNumbers(page: number, limit: number) {
        return this.http.get<ApiResponse<PaginatedResponse<AssetNumberSummary>>>(ASSET_NUMBERS_API, { params: { page, limit } }).pipe(map((response) => this.unwrap(response)));
    }

    getAssetNumber(id: string) {
        return this.http.get<ApiResponse<AssetNumberDetail | null>>(`${ASSET_NUMBERS_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    createAssetNumber(payload: { asset_number: string; specific_id?: string }) {
        return this.http.post<ApiResponse<AssetNumberDetail>>(ASSET_NUMBERS_API, payload).pipe(map((response) => this.unwrap(response)));
    }

    updateAssetNumber(id: string, payload: { asset_number?: string; specific_id?: string | null }) {
        return this.http.patch<ApiResponse<AssetNumberDetail>>(`${ASSET_NUMBERS_API}/${id}`, payload).pipe(map((response) => this.unwrap(response)));
    }

    deleteAssetNumber(id: string) {
        return this.http.delete<ApiResponse<AssetNumberDetail | null>>(`${ASSET_NUMBERS_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    listSpecifics(page: number, limit: number) {
        return this.http.get<ApiResponse<PaginatedResponse<SpecificSummary>>>(SPECIFICS_API, { params: { page, limit } }).pipe(map((response) => this.unwrap(response)));
    }

    getSpecific(id: string) {
        return this.http.get<ApiResponse<SpecificDetail | null>>(`${SPECIFICS_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    createSpecific(payload: { specific_name: string; area_id?: string }) {
        return this.http.post<ApiResponse<SpecificDetail>>(SPECIFICS_API, payload).pipe(map((response) => this.unwrap(response)));
    }

    updateSpecific(id: string, payload: { specific_name?: string; area_id?: string | null }) {
        return this.http.patch<ApiResponse<SpecificDetail>>(`${SPECIFICS_API}/${id}`, payload).pipe(map((response) => this.unwrap(response)));
    }

    deleteSpecific(id: string) {
        return this.http.delete<ApiResponse<SpecificDetail | null>>(`${SPECIFICS_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    listLocations(page: number, limit: number) {
        return this.http.get<ApiResponse<PaginatedResponse<LocationSummary>>>(LOCATIONS_API, { params: { page, limit } }).pipe(map((response) => this.unwrap(response)));
    }

    getLocation(id: string) {
        return this.http.get<ApiResponse<LocationDetail | null>>(`${LOCATIONS_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    createLocation(payload: { location_name: string; specific_id: string; asset_id?: string }) {
        return this.http.post<ApiResponse<LocationDetail>>(LOCATIONS_API, payload).pipe(map((response) => this.unwrap(response)));
    }

    updateLocation(id: string, payload: { location_name?: string; specific_id?: string | null; asset_id?: string | null }) {
        return this.http.patch<ApiResponse<LocationDetail>>(`${LOCATIONS_API}/${id}`, payload).pipe(map((response) => this.unwrap(response)));
    }

    deleteLocation(id: string) {
        return this.http.delete<ApiResponse<LocationDetail | null>>(`${LOCATIONS_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    listSequences(page: number, limit: number) {
        return this.http.get<ApiResponse<PaginatedResponse<SequenceSummary>>>(SEQUENCES_API, { params: { page, limit } }).pipe(map((response) => this.unwrap(response)));
    }

    getSequence(id: string) {
        return this.http.get<ApiResponse<SequenceDetail | null>>(`${SEQUENCES_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    createSequence(payload: { sequence_code: string }) {
        return this.http.post<ApiResponse<SequenceDetail>>(SEQUENCES_API, payload).pipe(map((response) => this.unwrap(response)));
    }

    updateSequence(id: string, payload: { sequence_code?: string }) {
        return this.http.patch<ApiResponse<SequenceDetail>>(`${SEQUENCES_API}/${id}`, payload).pipe(map((response) => this.unwrap(response)));
    }

    deleteSequence(id: string) {
        return this.http.delete<ApiResponse<SequenceDetail | null>>(`${SEQUENCES_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    listSoftcopyCategories(page: number, limit: number) {
        return this.http.get<ApiResponse<PaginatedResponse<SoftcopyCategorySummary>>>(SOFTCOPY_CATEGORIES_API, { params: { page, limit } }).pipe(map((response) => this.unwrap(response)));
    }

    getSoftcopyCategory(id: string) {
        return this.http.get<ApiResponse<SoftcopyCategoryDetail>>(`${SOFTCOPY_CATEGORIES_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    createSoftcopyCategory(payload: { category_name: string; parent_category_id?: string }) {
        return this.http.post<ApiResponse<SoftcopyCategoryDetail>>(SOFTCOPY_CATEGORIES_API, payload).pipe(map((response) => this.unwrap(response)));
    }

    updateSoftcopyCategory(id: string, payload: { category_name?: string; parent_category_id?: string }) {
        return this.http.patch<ApiResponse<SoftcopyCategoryDetail>>(`${SOFTCOPY_CATEGORIES_API}/${id}`, payload).pipe(map((response) => this.unwrap(response)));
    }

    deleteSoftcopyCategory(id: string) {
        return this.http.delete<ApiResponse<SoftcopyCategoryDetail>>(`${SOFTCOPY_CATEGORIES_API}/${id}`).pipe(map((response) => this.unwrap(response)));
    }

    private unwrap<T>(response: ApiResponse<T>): T {
        if (this.isEnvelope(response)) {
            return response.data;
        }

        return response;
    }

    private isEnvelope<T>(response: ApiResponse<T>): response is ApiResponseEnvelope<T> {
        return !!response && typeof response === 'object' && 'data' in response;
    }
}
