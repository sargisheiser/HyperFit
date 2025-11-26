import { useEffect, useRef } from 'react'
import clsx from 'clsx'
import { gsap } from 'gsap'

export default function NeonCard({ children, className, hover = true }) {
  const cardRef = useRef(null)

  useEffect(() => {
    if (!hover || !cardRef.current) return

    const el = cardRef.current
    const tl = gsap.timeline({ paused: true })

    tl.to(el, {
      boxShadow: '0 0 25px rgba(0,255,247,0.3)',
      borderColor: 'rgba(0,255,247,0.4)',
      duration: 0.3,
      ease: 'power2.out',
    })

    const onEnter = () => tl.play()
    const onLeave = () => tl.reverse()

    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)

    return () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
      tl.kill()
    }
  }, [hover])

  return (
    <div
      ref={cardRef}
      className={clsx(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#121b14]/80 via-[#0a140e]/80 to-[#060907]/85 backdrop-blur-xl transition-all duration-300 shadow-[0_0_45px_rgba(0,255,127,0.08)]',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}











