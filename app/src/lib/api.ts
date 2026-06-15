import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export const api = axios.create({ baseURL: API_BASE })

// Attach JWT token from Zustand store to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(err)
  }
)

// ─── Typed API helpers ──────────────────────────────────────────────────────

export interface MedicalRecord {
  id: string
  recordType: string
  dataHash: string
  storagePath?: string
  metadata?: globalThis.Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface AccessRequest {
  id: string
  requester: string
  role: string
  reason?: string
  status: string
  requestedAt: string
  expiresAt: string
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  priority: string
  createdAt: string
}

export interface AuditEvent {
  id: string
  accessor: string
  action: string
  success: boolean
  reason?: string
  createdAt: string
}

export interface DashboardStats {
  recordCount: number
  activeGrants: number
  pendingRequests: number
  recentNotifications: Notification[]
}

export interface ProviderGrant {
  id: string
  provider: string
  role: string
  allowedTypes: string
  grantedAt: string
  expiresAt?: string
}

interface PatientsListResponse {
  patients: Array<{ id: string; wallet: string; name: string }>
}

interface RecordsListResponse {
  records: MedicalRecord[]
}

interface NotificationsListResponse {
  notifications: Notification[]
}

interface AuditLogsResponse {
  events: AuditEvent[]
}

interface PatientWithGrants {
  id: string
  wallet: string
  name: string
  AccessGrantOffchain?: ProviderGrant[]
}

const getPatientIdByWallet = async (walletAddress: string): Promise<string> => {
  const res = await api.get<PatientsListResponse>(
    `/api/patients?wallet=${encodeURIComponent(walletAddress)}&limit=1`
  )

  const patient = res.data.patients?.[0]
  if (!patient) {
    throw new Error('Patient profile not found for this wallet')
  }

  return patient.id
}

// Records
export const getRecords = async (walletAddress: string) => {
  const patientId = await getPatientIdByWallet(walletAddress)
  const res = await api.get<RecordsListResponse>(`/api/records?patientId=${patientId}`)
  return res.data.records || []
}

export const createRecord = (data: {
  patientId: string
  recordType: string
  dataHash: string
  storagePath?: string
  metadata?: unknown
}) => api.post<MedicalRecord>('/api/records', data)

// Access requests
export const getAccessRequests = async (walletAddress: string) => {
  const patientId = await getPatientIdByWallet(walletAddress)
  const res = await api.get<AccessRequest[]>(`/api/access-requests?patientId=${patientId}`)
  return res.data || []
}

export const approveAccessRequest = (id: string) =>
  api.post(`/api/access-requests/${id}/approve`)

export const denyAccessRequest = (id: string) =>
  api.post(`/api/access-requests/${id}/deny`)

// Notifications
export const getNotifications = async (walletAddress: string) => {
  const res = await api.get<NotificationsListResponse>(
    `/api/notifications?wallet=${encodeURIComponent(walletAddress)}`
  )
  return res.data.notifications || []
}

export const markNotificationRead = (id: string) =>
  api.patch(`/api/notifications/${id}/read`)

// Audit logs
export const getAuditLogs = async (walletAddress: string) => {
  const patientId = await getPatientIdByWallet(walletAddress)
  const res = await api.get<AuditLogsResponse>(`/api/audit-logs?patientId=${patientId}`)
  return res.data.events || []
}

// Patient
export const getPatient = (walletAddress: string) =>
  api.get(`/api/patients?wallet=${walletAddress}`)

export const getPatientWithGrants = async (walletAddress: string) => {
  const res = await api.get<PatientWithGrants>(
    `/api/patients/${encodeURIComponent(walletAddress)}?includeAccessGrants=true`
  )
  return res.data
}

export const getRecordById = async (recordId: string, accessor?: string) => {
  const query = accessor ? `?accessor=${encodeURIComponent(accessor)}` : ''
  const res = await api.get<MedicalRecord & { patient?: { name?: string; wallet?: string } }>(
    `/api/records/${recordId}${query}`
  )
  return res.data
}

export const createRecordFromForm = async (walletAddress: string, payload: {
  recordType: string
  title: string
  description: string
}) => {
  const patientId = await getPatientIdByWallet(walletAddress)
  return api.post('/api/records', {
    patientId,
    recordType: payload.recordType,
    data: {
      title: payload.title,
      description: payload.description,
    },
    metadata: {
      title: payload.title,
      description: payload.description,
      source: 'web-ui',
    },
    accessor: walletAddress,
  })
}
