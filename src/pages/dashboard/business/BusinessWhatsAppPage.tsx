import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowPathIcon, ChatBubbleLeftRightIcon, ClipboardDocumentIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import {
  enableWhatsAppChannelRequest, getWhatsAppChannelRequest, listWhatsAppConversationsRequest,
  listWhatsAppMessagesRequest, replyToWhatsAppConversationRequest, type WhatsAppConversation,
} from '@api/modules/whatsapp.api'
import { useAuth } from '@hooks/useAuth'

const time = (value: string) => new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const errorText = (error: unknown) => {
  const candidate = error as { response?: { data?: { detail?: string | { message?: string } } }; message?: string }
  const detail = candidate.response?.data?.detail
  return typeof detail === 'string' ? detail : detail?.message ?? candidate.message ?? 'The request could not be completed.'
}

export default function BusinessWhatsAppPage() {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<WhatsAppConversation | null>(null)
  const [reply, setReply] = useState('')
  const [copied, setCopied] = useState(false)
  const channel = useQuery({ queryKey: ['business-whatsapp-channel'], queryFn: getWhatsAppChannelRequest })
  const conversations = useQuery({ queryKey: ['business-whatsapp-conversations'], queryFn: listWhatsAppConversationsRequest, enabled: Boolean(channel.data?.enabled), refetchInterval: 15_000 })
  const messages = useQuery({ queryKey: ['business-whatsapp-messages', selected?.id], queryFn: () => listWhatsAppMessagesRequest(selected!.id), enabled: Boolean(selected), refetchInterval: 10_000 })
  const enable = useMutation({ mutationFn: enableWhatsAppChannelRequest, onSuccess: data => queryClient.setQueryData(['business-whatsapp-channel'], data) })
  const send = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => replyToWhatsAppConversationRequest(id, body),
    onSuccess: async () => { setReply(''); await Promise.all([queryClient.invalidateQueries({ queryKey: ['business-whatsapp-messages', selected?.id] }), queryClient.invalidateQueries({ queryKey: ['business-whatsapp-conversations'] })]) },
  })
  useEffect(() => {
    if (!selected && conversations.data?.length) setSelected(conversations.data[0])
    if (selected && conversations.data && !conversations.data.some(row => row.id === selected.id)) setSelected(null)
  }, [conversations.data, selected])
  const submit = (event: FormEvent) => { event.preventDefault(); const body = reply.trim(); if (selected && body) send.mutate({ id: selected.id, body }) }
  const copyLink = async () => { if (!channel.data?.chat_url) return; await navigator.clipboard.writeText(channel.data.chat_url); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }

  if (channel.isPending) return <div className="rounded-2xl border border-border bg-white p-8" role="status">Loading WhatsApp inbox…</div>
  if (channel.isError) return <div className="rounded-2xl border border-error/20 bg-error/5 p-6 text-error">{errorText(channel.error)}</div>
  if (!channel.data?.enabled) return <section className="mx-auto max-w-3xl rounded-3xl border border-border bg-white p-7 shadow-sm sm:p-10">
    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><ChatBubbleLeftRightIcon className="h-7 w-7" /></span>
    <h1 className="mt-5 text-2xl font-bold text-text">Connect your business inbox</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Enable a business-specific MtaaMall WhatsApp link. Messages started from that link are routed only to this workspace, so another seller can never read them.</p>
    {enable.isError && <p className="mt-4 rounded-xl bg-error/5 p-3 text-sm text-error">{errorText(enable.error)}</p>}
    {hasPermission('communications.whatsapp.reply') && <button type="button" onClick={() => enable.mutate()} disabled={enable.isPending} className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-50">{enable.isPending ? 'Enabling…' : 'Enable WhatsApp inbox'}</button>}
  </section>

  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-3xl bg-gradient-to-r from-emerald-950 to-teal-800 p-6 text-white shadow-sm sm:p-8">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Customer conversations</p><h1 className="mt-2 text-3xl font-bold">WhatsApp inbox</h1><p className="mt-2 max-w-2xl text-sm text-emerald-50/85">Read and reply to messages routed to this business workspace.</p></div>
      <button type="button" onClick={() => void conversations.refetch()} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/20 hover:bg-white/20"><ArrowPathIcon className="h-4 w-4" />Refresh</button>
    </header>
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
      <div><p className="text-sm font-bold text-emerald-950">Your customer chat link</p><p className="mt-1 text-xs text-emerald-800">Use this link on your storefront, adverts and social profiles so messages reach the correct business.</p></div>
      <button type="button" onClick={copyLink} disabled={!channel.data.chat_url} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"><ClipboardDocumentIcon className="h-4 w-4" />{copied ? 'Copied' : 'Copy chat link'}</button>
    </section>
    <section className="grid min-h-[600px] overflow-hidden rounded-3xl border border-border bg-white shadow-sm lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="border-b border-divider lg:border-b-0 lg:border-r"><div className="border-b border-divider p-4"><h2 className="font-bold text-text">Conversations</h2><p className="mt-1 text-xs text-text-tertiary">{conversations.data?.length ?? 0} routed chats</p></div><div className="max-h-[260px] overflow-y-auto lg:max-h-[670px]">
        {conversations.isPending && <p className="p-5 text-sm text-text-secondary">Loading conversations…</p>}
        {conversations.data?.map(row => <button key={row.id} type="button" onClick={() => setSelected(row)} className={`w-full border-b border-divider p-4 text-left transition ${selected?.id === row.id ? 'bg-primary/10' : 'hover:bg-background'}`}><div className="flex items-start justify-between gap-3"><p className="truncate font-semibold text-text">{row.customer_name}</p><span className="shrink-0 text-[10px] text-text-tertiary">{new Date(row.last_message_at).toLocaleDateString('en-KE')}</span></div><p className="mt-1 text-xs text-text-tertiary">{row.customer_phone}</p></button>)}
        {!conversations.isPending && !conversations.data?.length && <div className="p-7 text-center"><ChatBubbleLeftRightIcon className="mx-auto h-8 w-8 text-text-tertiary" /><p className="mt-3 text-sm font-semibold text-text">No messages yet</p><p className="mt-1 text-xs leading-5 text-text-tertiary">Share your customer chat link to route the first conversation here.</p></div>}
      </div></aside>
      <div className="flex min-h-[480px] min-w-0 flex-col">{!selected ? <div className="grid flex-1 place-items-center p-8 text-center"><div><ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-primary/40" /><p className="mt-4 font-bold text-text">Select a conversation</p><p className="mt-1 text-sm text-text-secondary">Messages and replies will appear here.</p></div></div> : <>
        <div className="border-b border-divider px-5 py-4"><p className="font-bold text-text">{selected.customer_name}</p><p className="mt-0.5 text-xs text-text-tertiary">{selected.customer_phone}</p></div>
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">{messages.isPending && <p className="text-sm text-text-secondary">Loading messages…</p>}{messages.data?.map(message => <article key={message.id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%] ${message.direction === 'outbound' ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md border border-border bg-white text-text'}`}><p className="whitespace-pre-wrap text-sm leading-5">{message.body || `[${message.message_type} message]`}</p><p className={`mt-1.5 text-[10px] ${message.direction === 'outbound' ? 'text-white/70' : 'text-text-tertiary'}`}>{time(message.created_at)}{message.direction === 'outbound' ? ` · ${message.status}` : ''}</p></div></article>)}</div>
        {hasPermission('communications.whatsapp.reply') && <form onSubmit={submit} className="flex gap-3 border-t border-divider bg-white p-4"><label className="sr-only" htmlFor="whatsapp-reply">Reply</label><textarea id="whatsapp-reply" value={reply} onChange={event => setReply(event.target.value)} rows={2} maxLength={4096} placeholder="Write a reply…" className="min-h-[48px] flex-1 resize-none rounded-xl border border-border px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" /><button type="submit" aria-label="Send WhatsApp reply" disabled={!reply.trim() || send.isPending} className="self-end rounded-xl bg-primary p-3 text-white transition hover:bg-primary-dark disabled:opacity-40"><PaperAirplaneIcon className="h-5 w-5" /></button></form>}
        {send.isError && <p className="border-t border-error/20 bg-error/5 px-4 py-3 text-sm text-error">{errorText(send.error)}</p>}
      </>}</div>
    </section>
  </div>
}
