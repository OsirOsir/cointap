// NodeBackground — premium animated blockchain node mesh
// Renders a subtle network of connected dots that float around.

import { useEffect, useRef } from 'react'

export function NodeBackground({ density = 12, opacity = 0.55 }: { density?: number; opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let nodes: { x: number; y: number; vx: number; vy: number; radius: number; glow: number }[] = []

    function resize() {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx!.scale(dpr, dpr)

      // Re-seed nodes
      nodes = []
      const count = density
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          radius: Math.random() * 2.5 + 1.5,
          glow: Math.random() * 0.5 + 0.3,
        })
      }
    }

    function draw() {
      if (!canvas || !ctx) return
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      // Update positions
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > rect.width) n.vx *= -1
        if (n.y < 0 || n.y > rect.height) n.vy *= -1
      }

      // Draw connections (lines between close nodes)
      const maxDist = 180
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.35 * opacity
            ctx.strokeStyle = `rgba(247, 147, 26, ${alpha})`
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw nodes (with glow rings)
      for (const n of nodes) {
        // Outer glow ring
        ctx.strokeStyle = `rgba(247, 147, 26, ${0.4 * opacity})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius + 4, 0, Math.PI * 2)
        ctx.stroke()

        // Inner dot
        ctx.fillStyle = `rgba(255, 200, 100, ${n.glow * opacity})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    resize()
    draw()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [density, opacity])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ display: 'block' }}
      aria-hidden="true"
    />
  )
}
