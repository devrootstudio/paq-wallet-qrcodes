"use client"

import { useRef, useState, useEffect } from "react"
import { useWizardStore } from "@/lib/store"
import { CheckCircle2, Share2, Download, Share } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Step4Success() {
  const { formData, comercio, goToStepAsync } = useWizardStore()
  const voucherRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    // Detect if we're on mobile
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleNewPayment = async () => {
    await goToStepAsync(0)
  }

  const generateVoucherImage = async (): Promise<Blob | null> => {
    setIsGenerating(true)
    try {
      console.log('🖼️ Generating voucher with Canvas API...')
      
      const currentDate = new Date()
      const formattedDate = currentDate.toLocaleDateString("es-GT", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      const formattedTime = currentDate.toLocaleTimeString("es-GT", {
        hour: "2-digit",
        minute: "2-digit",
      })

      // Create canvas directly
      const scale = 2
      const width = 600 * scale
      const padding = 40 * scale
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = 1200 * scale // Will adjust dynamically
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        console.error('❌ Could not get canvas context')
        setIsGenerating(false)
        return null
      }

      // Set background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, canvas.height)

      // Colors
      const paqGreen = '#00332a'
      const paqYellow = '#f9e000'
      const gray = '#666666'
      const lightGray = '#e5e7eb'
      const darkGray = '#999999'

      let y = padding

      // Load logo if available
      let logoImage: HTMLImageElement | null = null
      if (comercio?.logo) {
        const logoUrl = comercio.logo
        logoImage = await new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => resolve(img)
          img.onerror = () => {
            console.warn('⚠️ Logo failed to load')
            resolve(null)
          }
          img.src = logoUrl
          setTimeout(() => resolve(null), 5000) // Timeout
        })
      }

      // Header
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'

      // Logo
      if (logoImage) {
        const logoSize = 80 * scale
        const logoX = width / 2
        const logoY = y
        
        // Draw circle background
        ctx.beginPath()
        ctx.arc(logoX, logoY + logoSize / 2, logoSize / 2 + 3 * scale, 0, Math.PI * 2)
        ctx.fillStyle = paqYellow
        ctx.fill()
        
        // Draw logo
        ctx.save()
        ctx.beginPath()
        ctx.arc(logoX, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(logoImage, logoX - logoSize / 2, logoY, logoSize, logoSize)
        ctx.restore()
        
        y += logoSize + 20 * scale
      }

      // Title
      ctx.font = `bold ${24 * scale}px Arial`
      ctx.fillStyle = '#000000'
      ctx.fillText('VOUCHER DIGITAL', width / 2, y)
      y += 30 * scale

      // Merchant name
      if (comercio?.name) {
        ctx.font = `${14 * scale}px Arial`
        ctx.fillStyle = gray
        ctx.fillText(comercio.name, width / 2, y)
        y += 25 * scale
      }

      // Divider
      y += 10 * scale
      ctx.strokeStyle = lightGray
      ctx.lineWidth = 2 * scale
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
      y += 20 * scale

      // Content (left aligned)
      ctx.textAlign = 'left'
      const contentX = padding

      // Transaction IDs
      if (formData.tokenTransactionId) {
        y = drawVoucherRow(ctx, contentX, y, scale, 'ID de Transacción', formData.tokenTransactionId.toString(), paqGreen, true)
      }

      if (formData.codret !== null && formData.codret !== undefined) {
        y = drawVoucherRow(ctx, contentX, y, scale, 'Código de Respuesta', formData.codret.toString(), '#000000', false)
      }

      // Amount
      y += 15 * scale
      ctx.strokeStyle = lightGray
      ctx.lineWidth = 1 * scale
      ctx.beginPath()
      ctx.moveTo(contentX, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
      y += 20 * scale

      ctx.font = `${12 * scale}px Arial`
      ctx.fillStyle = gray
      ctx.fillText('Monto Pagado', contentX, y)
      y += 15 * scale

      ctx.font = `bold ${32 * scale}px Arial`
      ctx.fillStyle = paqGreen
      ctx.fillText(`Q${formData.requestedAmount?.toFixed(2) || "0.00"}`, contentX, y)
      y += 50 * scale

      ctx.beginPath()
      ctx.moveTo(contentX, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
      y += 20 * scale

      // Date and Time
      const dateTimeY = y
      ctx.font = `${12 * scale}px Arial`
      ctx.fillStyle = gray
      ctx.fillText('Fecha', contentX, dateTimeY)
      ctx.fillText('Hora', width / 2, dateTimeY)
      y += 15 * scale

      ctx.font = `bold ${14 * scale}px Arial`
      ctx.fillStyle = '#000000'
      ctx.fillText(formattedDate, contentX, y)
      ctx.fillText(formattedTime, width / 2, y)
      y += 30 * scale

      // Authorization
      if (formData.autorizacion) {
        y = drawVoucherRow(ctx, contentX, y, scale, 'Autorización', formData.autorizacion, '#000000', false)
      }

      // Footer
      y += 20 * scale
      ctx.strokeStyle = lightGray
      ctx.lineWidth = 1 * scale
      ctx.beginPath()
      ctx.moveTo(contentX, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
      y += 20 * scale

      ctx.textAlign = 'center'
      ctx.font = `${12 * scale}px Arial`
      ctx.fillStyle = gray
      ctx.fillText('Gracias por su compra', width / 2, y)
      y += 15 * scale

      ctx.font = `${11 * scale}px Arial`
      ctx.fillStyle = darkGray
      ctx.fillText('Este comprobante es válido como recibo de pago', width / 2, y)
      y += 20 * scale

      // PAQ Wallet branding
      ctx.font = `${11 * scale}px Arial`
      ctx.fillStyle = paqGreen
      ctx.fillText('Este pago fue realizado gracias a PAQ Wallet', width / 2, y)

      // Resize canvas to actual content
      const actualHeight = y + padding
      const finalCanvas = document.createElement('canvas')
      finalCanvas.width = width
      finalCanvas.height = actualHeight
      const finalCtx = finalCanvas.getContext('2d')
      if (finalCtx) {
        finalCtx.drawImage(canvas, 0, 0)
      }

      return new Promise((resolve) => {
        finalCanvas.toBlob((blob) => {
          setIsGenerating(false)
          if (blob) {
            console.log(`✅ Blob created: ${(blob.size / 1024).toFixed(2)} KB`)
            resolve(blob)
          } else {
            console.error('❌ Failed to create blob')
            resolve(null)
          }
        }, 'image/png', 0.95)
      })
    } catch (error) {
      console.error('❌ Error generating voucher image:', error)
      setIsGenerating(false)
      return null
    }
  }

  const drawVoucherRow = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    label: string,
    value: string,
    valueColor: string,
    highlight: boolean
  ): number => {
    ctx.font = `${12 * scale}px Arial`
    ctx.fillStyle = '#666666'
    ctx.fillText(label, x, y)
    y += 15 * scale

    ctx.font = highlight ? `bold ${16 * scale}px monospace` : `${14 * scale}px Arial`
    ctx.fillStyle = valueColor
    ctx.fillText(value, x, y)
    y += 25 * scale

    return y
  }

  const handleDownload = async () => {
    try {
      const blob = await generateVoucherImage()
      if (!blob) {
        console.error('❌ No blob generated')
        alert('Error al generar el comprobante. Por favor, intenta nuevamente.')
        return
      }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    // Sanitize filename: remove special characters and spaces
    const sanitizedName = (comercio?.name || 'pago').replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const filename = `comprobante-${sanitizedName}-${formData.transaccion || Date.now()}.png`
    link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      console.log('✅ Download initiated')
    } catch (error) {
      console.error('❌ Error in handleDownload:', error)
      alert('Error al descargar el comprobante. Por favor, intenta nuevamente.')
    }
  }

  const handleShare = async () => {
    const blob = await generateVoucherImage()
    if (!blob) {
      alert('Error al generar el comprobante. Por favor, intenta nuevamente.')
      return
    }

    // Sanitize filename: remove special characters and spaces
    const sanitizedName = (comercio?.name || 'pago').replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const filename = `comprobante-${sanitizedName}-${formData.transaccion || Date.now()}.png`
    const file = new File([blob], filename, {
      type: 'image/png',
    })

    // Check if Web Share API is available (mobile)
    if (navigator.share && isMobile) {
      try {
        await navigator.share({
          title: `Comprobante de pago - ${comercio?.name || 'PAQ Wallet'}`,
          text: `Comprobante de pago por Q${formData.requestedAmount?.toFixed(2) || '0.00'}`,
          files: [file],
        })
      } catch (error: any) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error)
          // Fallback to download
          handleDownload()
        }
      }
    } else {
      // Fallback: copy to clipboard or download
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ])
        alert('Comprobante copiado al portapapeles. Puedes pegarlo en cualquier aplicación.')
      } catch (error) {
        console.error('Error copying to clipboard:', error)
        // Final fallback: download
        handleDownload()
      }
    }
  }

  const currentDate = new Date()
  const formattedDate = currentDate.toLocaleDateString("es-GT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const formattedTime = currentDate.toLocaleTimeString("es-GT", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col justify-center items-center min-h-[60vh] animate-in zoom-in-95 duration-500">
      {/* Success Message */}
      <div className="bg-white rounded-2xl p-6 w-full mb-4 mt-8 shadow-xl text-center">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-paq-green leading-snug mb-2">
          ¡Pago Exitoso!
        </h2>
        <p className="text-gray-600 text-sm">
          Tu pago ha sido procesado correctamente
        </p>
      </div>

      {/* Digital Voucher */}
      <div 
        ref={voucherRef}
        className="bg-white rounded-2xl p-6 w-full shadow-xl border-2 border-gray-200"
      >
        {/* Branding Header */}
        {comercio && (
          <div className="flex flex-col items-center mb-6 pb-4 border-b border-gray-200">
            {comercio.logo && (
              <div className="w-16 h-16 rounded-full border-2 border-paq-yellow overflow-hidden bg-white shadow-md mb-3">
                <img
                  src={comercio.logo}
                  alt={`Logo de ${comercio.name}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
            <h3 className="text-lg font-bold text-gray-800 mb-1">VOUCHER DIGITAL</h3>
            <p className="text-xs text-gray-500">{comercio.name}</p>
          </div>
        )}
        
        {!comercio && (
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">VOUCHER DIGITAL</h3>
            <p className="text-xs text-gray-500">Conserve este comprobante</p>
          </div>
        )}

        <div className="space-y-4 border-t border-b border-gray-200 py-4">
          {/* Transaction ID from emiteToken */}
          {formData.tokenTransactionId && (
            <div>
              <p className="text-xs text-gray-500 mb-1">ID de Transacción</p>
              <p className="text-sm font-mono font-bold text-paq-green">{formData.tokenTransactionId}</p>
            </div>
          )}

          {/* Response Code */}
          {formData.codret !== null && formData.codret !== undefined && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Código de Respuesta</p>
              <p className="text-sm font-mono font-bold text-gray-800">{formData.codret}</p>
            </div>
          )}

          {/* Amount */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Monto Pagado</p>
            <p className="text-2xl font-bold text-paq-green">Q{formData.requestedAmount?.toFixed(2) || "0.00"}</p>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Fecha</p>
              <p className="text-sm font-semibold text-gray-800">{formattedDate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Hora</p>
              <p className="text-sm font-semibold text-gray-800">{formattedTime}</p>
            </div>
          </div>

          {/* Authorization */}
          {formData.autorizacion && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Autorización</p>
              <p className="text-xs font-mono text-gray-600">{formData.autorizacion}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Gracias por su compra
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Este comprobante es válido como recibo de pago
          </p>
          <p className="text-xs text-paq-green mt-2 font-medium">
            Este pago fue realizado gracias a PAQ Wallet
          </p>
        </div>
      </div>

      {/* Share and Download Buttons */}
      <div className="w-full mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        {isMobile && (
          <Button
            onClick={handleShare}
            disabled={isGenerating}
            variant="outline"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-paq-green border-paq-green hover:bg-paq-green hover:text-white"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-paq-green border-t-transparent rounded-full animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Share className="w-4 h-4" />
                Compartir comprobante
              </>
            )}
          </Button>
        )}
        
        <Button
          onClick={handleDownload}
          disabled={isGenerating}
          variant="outline"
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-paq-green border-paq-green hover:bg-paq-green hover:text-white"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-paq-green border-t-transparent rounded-full animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Descargar comprobante
            </>
          )}
        </Button>

        {!isMobile && (
          <Button
            onClick={handleShare}
            disabled={isGenerating}
            variant="outline"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-paq-green border-paq-green hover:bg-paq-green hover:text-white"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-paq-green border-t-transparent rounded-full animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Compartir
              </>
            )}
          </Button>
        )}
      </div>

      {/* Realizar otro pago button */}
      <div className="w-full mt-4 flex justify-center">
        <Button
          onClick={handleNewPayment}
          variant="paqPrimary"
          className="w-full max-w-xs"
        >
          Realizar otro pago
        </Button>
      </div>

      {/* Download App Section */}
      <div className="w-full mt-6">
        <p className="text-sm text-white font-semibold text-center mb-3">
          Descarga la App PAQ Wallet
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              href="https://apps.apple.com/gt/app/paq-wallet/id6450115741"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-black text-white rounded-lg px-4 py-3 hover:bg-gray-800 transition-colors"
            >
              <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <div className="text-left">
                <div className="text-sm font-semibold leading-tight">App Store</div>
              </div>
            </a>

            <a
              href="https://play.google.com/store/apps/details?id=com.paqwallet.app&hl=es_419"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-black text-white rounded-lg px-4 py-3 hover:bg-gray-800 transition-colors"
            >
              <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <div className="text-left">
                <div className="text-sm font-semibold leading-tight">Google Play</div>
              </div>
            </a>
        </div>
      </div>
    </div>
  )
}
