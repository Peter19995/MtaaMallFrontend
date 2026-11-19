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

export const getWhatsAppChannelRequest = async (): Promise<WhatsAppChannel> =>
  (await api.get<WhatsAppChannel>('/integrations/whatsapp/business/channel')).data
export const enableWhatsAppChannelRequest = async (): Promise<WhatsAppChannel> =>
  (await api.post<WhatsAppChannel>('/integrations/whatsapp/business/channel')).data
export const listWhatsAppConversationsRequest = async (): Promise<WhatsAppConversation[]> =>
  (await api.get<WhatsAppConversation[]>('/integrations/whatsapp/business/conversations')).data
export const listWhatsAppMessagesRequest = async (conversationId: string): Promise<WhatsAppMessage[]> =>
  (await api.get<WhatsAppMessage[]>(`/integrations/whatsapp/business/conversations/${conversationId}/messages`)).data
export const replyToWhatsAppConversationRequest = async (conversationId: string, body: string): Promise<WhatsAppMessage> =>
  (await api.post<WhatsAppMessage>(`/integrations/whatsapp/business/conversations/${conversationId}/reply`, { body })).data
