export interface PresenceUser {
  uid: string
  name: string
  color: string
  cursor?: string
  lastActive?: number
  typing?: string
}

export interface CellData {
  value: string
  lastEditedBy?: string
  updatedAt?: number
  style?: {
    bold?: boolean
    italic?: boolean
  }
}

export interface CellProps {
  id: string
  data: CellData | undefined
  isActive: boolean
  otherUser?: PresenceUser
  onFocus: (id: string) => void
  onBlur: () => void
  onChange: (id: string, value: string) => void
  cells: Record<string, CellData>
}

export interface DocumentMeta {
  id: string
  title: string
  lastModified: number
  ownerName: string
  ownerEmail: string
}