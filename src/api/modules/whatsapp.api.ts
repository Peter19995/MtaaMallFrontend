import api from '@api/config/axios.config'

export type WhatsAppChannel = {
  enabled: boolean; setup_required: boolean; public_id?: string; business_name?: string
  route_code?: string; phone_number?: string | null; chat_url?: string | null; is_active?: boolean
}
export type WhatsAppConversation = {
  id: string; customer_name: string; customer_phone: string; status: 'open' | 'closed'; last_message_at: string
}
export type WhatsAppMessage = {
  id: string; direction: 'inbound' | 'outbound'; message_type: string; body: string | null
  status: 'received' | 'accepted' | 'sent' | 'delivered' | 'read' | 'failed'
  created_at: string; sent_by_user_id?: number | null
}

export type WhatsAppInboxScope = 'business' | 'platform'
const inboxPath = (scope: WhatsAppInboxScope) => `/integrations/whatsapp/${scope}`

export const getWhatsAppChannelRequest = async (): Promise<WhatsAppChannel> =>
  (await api.get<WhatsAppChannel>('/integrations/whatsapp/business/channel')).data
export const enableWhatsAppChannelRequest = async (): Promise<WhatsAppChannel> =>
  (await api.post<WhatsAppChannel>('/integrations/whatsapp/business/channel')).data
export const listWhatsAppConversationsRequest = async (scope: WhatsAppInboxScope = 'business'): Promise<WhatsAppConversation[]> =>
  (await api.get<WhatsAppConversation[]>(`${inboxPath(scope)}/conversations`)).data
export const listWhatsAppMessagesRequest = async (conversationId: string, scope: WhatsAppInboxScope = 'business'): Promise<WhatsAppMessage[]> =>
  (await api.get<WhatsAppMessage[]>(`${inboxPath(scope)}/conversations/${conversationId}/messages`)).data
export const replyToWhatsAppConversationRequest = async (conversationId: string, body: string, scope: WhatsAppInboxScope = 'business'): Promise<WhatsAppMessage> =>
  (await api.post<WhatsAppMessage>(`${inboxPath(scope)}/conversations/${conversationId}/reply`, { body })).data
