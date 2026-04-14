import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Crown, Loader2, Sparkles, X, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import SectionTitle from '../components/ui/SectionTitle'
import api from '../services/api'
import logger from '../utils/logger'

const FREE_FEATURES = [
  '3 KI-Analysen pro Tag',
  'Basis-Tracking (Kalorien & Makros)',
  '7-Tage Verlauf',
  'Barcode-Scanner',
]

const PRO_FEATURES = [
  'Unbegrenzte KI-Analysen',
  'Erweiterte Statistiken & Trends',
  'KI-Fitness-Coach',
  'Rezeptvorschläge',
  'Daten-Export (JSON & CSV)',
  'Wöchentlicher Check-In mit KI',
  'Prioritäts-Support',
]

export default function Pricing() {
  const navigate = useNavigate()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [billingCycle, setBillingCycle] = useState('yearly')

  useEffect(() => {
    async function fetchStatus() {
      try {
        const { data } = await api.get('/api/subscriptions/me')
        setSubscription(data)
      } catch (err) {
        logger.error('[Pricing] Failed to fetch status:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
  }, [])

  const handleCheckout = useCallback(
    async (priceId) => {
      setCheckoutLoading(priceId)
      try {
        const { data } = await api.post('/api/subscriptions/checkout', {
          price_id: priceId,
        })
        if (data.checkout_url) {
          window.location.href = data.checkout_url
        }
      } catch (err) {
        logger.error('[Pricing] Checkout failed:', err)
        alert(err.response?.data?.detail || 'Checkout fehlgeschlagen')
      } finally {
        setCheckoutLoading(null)
      }
    },
    [],
  )

  const handleCancel = useCallback(async () => {
    if (!confirm('Möchtest du dein Premium-Abo wirklich kündigen?')) return
    try {
      await api.post('/api/subscriptions/cancel')
      const { data } = await api.get('/api/subscriptions/me')
      setSubscription(data)
    } catch (err) {
      logger.error('[Pricing] Cancel failed:', err)
    }
  }, [])

  const isPremium = subscription?.is_premium

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <SectionTitle title="Pricing" subtitle="Wähle deinen Plan" />

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`rounded-lg px-4 py-2 text-sm transition ${
            billingCycle === 'monthly'
              ? 'bg-white/10 text-white'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Monatlich
        </button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={`relative rounded-lg px-4 py-2 text-sm transition ${
            billingCycle === 'yearly'
              ? 'bg-[#00FF7F]/10 text-[#00FF7F]'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Jährlich
          <span className="absolute -right-2 -top-2 rounded-full bg-[#00FF7F] px-1.5 py-0.5 text-[10px] font-bold text-[#0a0a0f]">
            -25%
          </span>
        </button>
      </div>

      {/* Plans */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Free plan */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/8 bg-white/2 p-6"
        >
          <div className="mb-4">
            <h3 className="text-lg font-medium text-white">Free</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-light text-white">€0</span>
              <span className="text-sm text-white/30">/ für immer</span>
            </div>
          </div>

          <ul className="mb-6 space-y-3">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-white/50">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/30" />
                {f}
              </li>
            ))}
          </ul>

          {!isPremium ? (
            <div className="rounded-xl border border-white/10 py-2.5 text-center text-sm text-white/40">
              Aktueller Plan
            </div>
          ) : (
            <button
              onClick={handleCancel}
              className="w-full rounded-xl border border-white/10 py-2.5 text-sm text-white/40 transition hover:border-white/20 hover:text-white/60"
            >
              Zu Free wechseln
            </button>
          )}
        </motion.div>

        {/* Pro plan */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative rounded-2xl border border-[#00FF7F]/20 bg-gradient-to-b from-[#00FF7F]/5 to-transparent p-6"
        >
          {/* Badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1 rounded-full bg-[#00FF7F] px-3 py-1 text-xs font-bold text-[#0a0a0f]">
              <Crown className="h-3 w-3" />
              Empfohlen
            </div>
          </div>

          <div className="mb-4">
            <h3 className="flex items-center gap-2 text-lg font-medium text-white">
              Pro
              <Sparkles className="h-4 w-4 text-[#00FF7F]" />
            </h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-light text-white">
                €{billingCycle === 'yearly' ? '6,67' : '8,99'}
              </span>
              <span className="text-sm text-white/30">/ Monat</span>
            </div>
            {billingCycle === 'yearly' && (
              <p className="mt-1 text-sm text-[#00FF7F]/50">
                €79,99 pro Jahr (statt €107,88)
              </p>
            )}
          </div>

          <ul className="mb-6 space-y-3">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#00FF7F]" />
                {f}
              </li>
            ))}
          </ul>

          {isPremium ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-[#00FF7F]/10 py-2.5 text-sm font-medium text-[#00FF7F]">
              <Check className="h-4 w-4" />
              Aktiv
            </div>
          ) : (
            <button
              onClick={() =>
                handleCheckout(
                  billingCycle === 'yearly'
                    ? import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY || 'price_yearly'
                    : import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY || 'price_monthly',
                )
              }
              disabled={!!checkoutLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00FF7F] to-[#00CC66] py-3 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-50"
            >
              {checkoutLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Jetzt upgraden
                </>
              )}
            </button>
          )}
        </motion.div>
      </div>

      {/* FAQ / Trust */}
      <div className="rounded-2xl border border-white/6 bg-white/2 p-6 text-center">
        <p className="text-sm text-white/30">
          Jederzeit kündbar · Keine versteckten Kosten · 14 Tage Geld-zurück-Garantie
        </p>
      </div>
    </div>
  )
}
