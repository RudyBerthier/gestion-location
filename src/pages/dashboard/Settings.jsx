import React, { useState, useRef, useEffect, useCallback } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import Cropper from 'react-easy-crop'
import { useAuth } from '../../contexts/AuthContext'
import { auth, storage, profiles } from '../../services/api'
import { Save, Eraser, Loader2, User as UserIcon, Shield, Bell, PenTool, Image as ImageIcon, CheckCircle2, RotateCw, Check, X, Lock, Eye, EyeOff, LogOut, AlertTriangle, Fingerprint } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../services/supabase'

// Helper to get cropped image from canvas
async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  const image = new Image()
  image.src = imageSrc
  await new Promise(res => { image.onload = res })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const maxSize = Math.max(image.width, image.height)
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

  canvas.width = safeArea
  canvas.height = safeArea
  ctx.translate(safeArea / 2, safeArea / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  const croppedCanvas = document.createElement('canvas')
  const croppedCtx = croppedCanvas.getContext('2d')
  croppedCanvas.width = pixelCrop.width
  croppedCanvas.height = pixelCrop.height

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x + (safeArea - image.width) / 2,
    pixelCrop.y + (safeArea - image.height) / 2,
    pixelCrop.width,
    pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  )

  return croppedCanvas.toDataURL('image/png')
}

function applyThreshold(dataUrl, onResult, onError) {
  const img = new Image()
  img.onload = () => {
    const maxW = 600
    const scale = maxW / img.width
    const canvas = document.createElement('canvas')
    canvas.width = maxW
    canvas.height = img.height * scale
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        if (brightness > 145) {
          data[i + 3] = 0
        } else {
          data[i] = 15; data[i + 1] = 15; data[i + 2] = 100; data[i + 3] = 255
        }
      }
      ctx.putImageData(imageData, 0, 0)
      onResult(canvas.toDataURL('image/png'), canvas.height)
    } catch (err) { onError(err) }
  }
  img.src = dataUrl
}

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth()
  const toast = useToast()
  
  const [activeTab, setActiveTab] = useState('profil') // profil, securite, preferences, signature
  const [saving, setSaving] = useState(false)

  // -- Profil State
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    telephone: '',
    entreprise: '',
    devise: 'EUR',
    langue: 'fr'
  })
  const [avatarUrl, setAvatarUrl] = useState('')
  
  // -- Sécurité State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true)

  // -- Signature State
  const sigCanvas = useRef({})
  const [signatureCleared, setSignatureCleared] = useState(true)

  // -- Signature Image Editor State
  const [cropModal, setCropModal] = useState(null) // { imageSrc }
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [cropProcessing, setCropProcessing] = useState(false)

  useEffect(() => {
    if (profile) {
      setFormData({
        prenom: profile.prenom || '',
        nom: profile.nom || '',
        telephone: profile.telephone || '',
        entreprise: profile.entreprise || '',
        devise: profile.devise || 'EUR',
        langue: profile.langue || 'fr'
      })
      setAvatarUrl(profile.avatar_url || '')
      // Check if false explicitly (fallback to true)
      setTwoFactorEnabled(profile.two_factor_enabled !== false)
    }
  }, [profile])


  // ============================================
  // LOGIQUE PROFIL & PREFERENCES
  // ============================================
  const handleSaveProfile = async (e) => {
    e?.preventDefault()
    setSaving(true)
    try {
      const res = await profiles.update(profile.id, {
        ...formData,
        two_factor_enabled: twoFactorEnabled
      })
      if (res.error) throw res.error
      await refreshProfile()
      toast('Vos paramètres ont été mis à jour.', 'success')
    } catch (err) {
      console.error(err)
      toast('Erreur lors de la sauvegarde.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // LOGIQUE AVATAR GOOGLE / UPLOAD
  // ============================================
  const handleUseGoogleAvatar = async () => {
    if (!user?.user_metadata?.avatar_url) {
      toast("Aucun avatar Google trouvé pour ce compte.", "error")
      return
    }
    setSaving(true)
    try {
      const url = user.user_metadata.avatar_url
      const res = await profiles.update(profile.id, { avatar_url: url })
      if (res.error) throw res.error
      setAvatarUrl(url)
      await refreshProfile()
      toast("Avatar Google importé avec succès !", "success")
    } catch(err) {
      toast("Erreur lors de l'import de l'avatar.", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleUploadAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSaving(true)
    try {
      // Create a unique name
      const ext = file.name.split('.').pop()
      const filename = `avatar_${profile.id}_${Date.now()}.${ext}`
      
      const { data, error } = await supabase.storage
        .from('medias')
        .upload(filename, file)
        
      if (error) throw error
      
      const { data: { publicUrl } } = supabase.storage.from('medias').getPublicUrl(filename)
      
      const res = await profiles.update(profile.id, { avatar_url: publicUrl })
      if (res.error) throw res.error
      setAvatarUrl(publicUrl)
      await refreshProfile()
      toast("Image de profil mise à jour !", "success")
    } catch (err) {
      console.error(err)
      toast("Erreur d'upload", "error")
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // LOGIQUE SIGNATURE
  // ============================================
  const handleSaveSignature = async () => {
    if (sigCanvas.current.isEmpty()) {
      toast('Veuillez dessiner votre signature.', 'error')
      return
    }
    setSaving(true)
    try {
      const canvas = sigCanvas.current.getCanvas()
      const dataURL = canvas.toDataURL('image/png')
      const blobRes = await fetch(dataURL)
      const blob = await blobRes.blob()
      const file = new File([blob], 'signature.png', { type: 'image/png' })
      
      const { url } = await storage.uploadMedia(file, 'medias')
      const updateRes = await profiles.update(profile.id, { signature_url: url })
      if (updateRes.error) throw updateRes.error
      
      await refreshProfile()
      toast('Signature enregistrée avec succès.', 'success')
      setSignatureCleared(true)
    } catch (err) {
      console.error(err)
      toast('Erreur lors de l\'enregistrement.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const clearSignature = () => {
    sigCanvas.current.clear()
    setSignatureCleared(true)
  }

  const handleScanSignatureImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset crop state
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedAreaPixels(null)
    const reader = new FileReader()
    reader.onload = (ev) => setCropModal({ imageSrc: ev.target.result })
    reader.readAsDataURL(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleConfirmCrop = async () => {
    if (!croppedAreaPixels) return
    setCropProcessing(true)
    try {
      const croppedDataUrl = await getCroppedImg(cropModal.imageSrc, croppedAreaPixels, rotation)
      applyThreshold(
        croppedDataUrl,
        (resultDataUrl, height) => {
          sigCanvas.current.fromDataURL(resultDataUrl, { width: 600, height })
          setSignatureCleared(false)
          setCropModal(null)
          toast('Signature extraite avec succès !', 'success')
        },
        (err) => {
          console.error(err)
          toast('Erreur lors de l\'analyse.', 'error')
        }
      )
    } catch (err) {
      console.error(err)
      toast('Erreur de recadrage.', 'error')
    } finally {
      setCropProcessing(false)
    }
  }

  // -- Mot de passe State
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword.length < 8) {
      toast('Le mot de passe doit contenir au moins 8 caractères.', 'error')
      return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast('Les mots de passe ne correspondent pas.', 'error')
      return
    }
    setPwLoading(true)
    try {
      const { error } = await auth.updatePassword(pwForm.newPassword)
      if (error) throw error
      toast('Mot de passe mis à jour avec succès !', 'success')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast(err.message || 'Erreur lors du changement de mot de passe.', 'error')
    } finally {
      setPwLoading(false)
    }
  }

  const handleSignOut = async () => {
    await auth.signOut()
    window.location.href = '/login'
  }

  const handleRegisterPasskey = async () => {
    setSaving(true)
    try {
      // 1. Démarrer l'enregistrement et récupérer les options
      const { data: options, error: startError } = await supabase.auth.passkey.startRegistration()
      if (startError) throw startError

      // 2. Lancer la cérémonie WebAuthn dans le navigateur avec simplewebauthn (qui gère la conversion JSON <-> ArrayBuffer)
      const { startRegistration } = await import('@simplewebauthn/browser')
      
      // Supabase renvoie généralement { challenge_id, options: { ... } }
      const webauthnOptions = options?.options || options;
      
      const credential = await startRegistration({ optionsJSON: webauthnOptions })

      // 3. Vérifier l'enregistrement côté Supabase
      const { error: verifyError } = await supabase.auth.passkey.verifyRegistration({
        challengeId: options.challenge_id || options.challengeId || options.id,
        credential: credential
      })
      if (verifyError) throw verifyError

      toast('Appareil enregistré avec succès pour Face ID / Touch ID !', 'success')
    } catch (err) {
      console.error('Passkey register error:', err)
      toast("Erreur lors de l'enregistrement de l'appareil: " + (err.message || 'Vérifiez Supabase.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  // --- RENDER ---
  const TABS = [
    { id: 'profil', label: 'Profil Public', icon: <UserIcon className="w-5 h-5" /> },
    { id: 'securite', label: 'Sécurité & Accès', icon: <Shield className="w-5 h-5" /> },
    { id: 'preferences', label: 'Préférences', icon: <Bell className="w-5 h-5" /> },
    { id: 'signature', label: 'Signature Visuelle', icon: <PenTool className="w-5 h-5" /> },
  ]

  return (
    <div className="h-[calc(100vh-4rem)] p-4 sm:p-6 mx-auto w-full max-w-7xl overflow-y-auto">
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Paramètres du compte</h1>
        <p className="text-slate-400">Gérez votre identité, la sécurité de votre compte et vos préférences globales.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Menu latéral */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition whitespace-nowrap text-left ${activeTab === tab.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8">
          
          {/* ===================== ONGLET PROFIL ===================== */}
          {activeTab === 'profil' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Photo de profil */}
              <div className="flex items-center gap-6 pb-8 border-b border-slate-800">
                <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-slate-700 relative group">
                  {avatarUrl ? (
                     <img
                       src={avatarUrl}
                       alt="Avatar"
                       className="w-full h-full object-cover"
                       referrerPolicy="no-referrer"
                       onError={e => { e.currentTarget.style.display = 'none' }}
                     />
                  ) : (
                     <UserIcon className="w-10 h-10 text-slate-500" />
                  )}
                  {/* Survol image */}
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                    <ImageIcon className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-medium uppercase">Modifier</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
                  </label>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">Photo de profil</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl cursor-pointer transition">
                      Depuis mon PC
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
                    </label>
                    <button onClick={handleUseGoogleAvatar} className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium rounded-xl transition">
                      Récupérer avatar Google
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">JPG, GIF ou PNG. 5MB max.</p>
                </div>
              </div>

              {/* Formulaire profil */}
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Prénom</label>
                    <input type="text" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:border-violet-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Nom</label>
                    <input type="text" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:border-violet-500 outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-400 mb-2">Email principal <span className="text-xs text-slate-500 ml-2">(Non modifiable ici)</span></label>
                    <input type="email" value={user?.email || ''} readOnly className="w-full bg-slate-900 border border-slate-800 text-slate-400 rounded-xl px-4 py-2.5 cursor-not-allowed opacity-70" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Téléphone (Optionnel)</label>
                    <input 
                      type="tel" 
                      value={formData.telephone} 
                      onChange={e => setFormData({...formData, telephone: e.target.value})} 
                      onBlur={(e) => {
                         let val = e.target.value.trim();
                         if (val && /^[1-9]/.test(val)) val = '0' + val;
                         setFormData(prev => ({...prev, telephone: val}));
                      }}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:border-violet-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Nom de l'entreprise (Optionnel)</label>
                    <input type="text" value={formData.entreprise} onChange={e => setFormData({...formData, entreprise: e.target.value})} placeholder="Ma SCI..." className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:border-violet-500 outline-none" />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={saving} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-bold transition disabled:opacity-50">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Enregistrer les modifications
                  </button>
                </div>
              </form>
            </div>
          )}


          {/* ===================== ONGLET SECURITE ===================== */}
          {activeTab === 'securite' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div>
                 <h3 className="text-xl font-bold text-white mb-1">Sécurité du compte</h3>
                 <p className="text-sm text-slate-400">Gérez votre mot de passe et les options de sécurité de votre espace.</p>
               </div>

               {/* Changer le mot de passe */}
               <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 space-y-5">
                 <div className="flex items-center gap-3">
                   <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                     <Lock className="w-4 h-4 text-violet-400" />
                   </div>
                   <div>
                     <h4 className="text-base font-bold text-white">Changer le mot de passe</h4>
                     <p className="text-xs text-slate-500 mt-0.5">Minimum 8 caractères recommandés.</p>
                   </div>
                 </div>

                 {/* Connexion OAuth → pas de mot de passe à gérer */}
                 {user?.app_metadata?.provider && user.app_metadata.provider !== 'email' ? (
                   <div className="flex items-start gap-3 bg-amber-400 border border-amber-500 rounded-xl px-4 py-3.5">
                     <AlertTriangle className="w-4 h-4 text-amber-900 flex-shrink-0 mt-0.5" />
                     <div>
                       <p className="text-sm font-bold text-amber-950">
                         Connexion via {user.app_metadata.provider === 'google' ? 'Google' : user.app_metadata.provider}
                       </p>
                       <p className="text-xs text-amber-900 mt-0.5">
                         Votre compte est lié à un fournisseur externe. Le mot de passe est géré par {user.app_metadata.provider === 'google' ? 'Google' : 'votre fournisseur'} — vous ne pouvez pas le modifier ici.
                       </p>
                     </div>
                   </div>
                 ) : (
                   <form onSubmit={handleChangePassword} className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-slate-400 mb-2">Nouveau mot de passe</label>
                       <div className="relative">
                         <input
                           type={showPw.new ? 'text' : 'password'}
                           value={pwForm.newPassword}
                           onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                           placeholder="••••••••"
                           className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 pr-11 focus:border-violet-500 outline-none transition"
                           required
                         />
                         <button type="button" onClick={() => setShowPw(s => ({ ...s, new: !s.new }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition">
                           {showPw.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                         </button>
                       </div>
                       {pwForm.newPassword.length > 0 && (
                         <div className="mt-2 flex items-center gap-1">
                           {[1,2,3,4].map(i => {
                             const strength = pwForm.newPassword.length >= 12 ? 4 : pwForm.newPassword.length >= 10 ? 3 : pwForm.newPassword.length >= 8 ? 2 : 1
                             const colors = ['bg-red-500','bg-amber-500','bg-yellow-400','bg-emerald-500']
                             return <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? colors[strength-1] : 'bg-slate-700'}`} />
                           })}
                           <span className="text-xs text-slate-500 ml-2 whitespace-nowrap">
                             {pwForm.newPassword.length >= 12 ? 'Fort' : pwForm.newPassword.length >= 8 ? 'Correct' : 'Faible'}
                           </span>
                         </div>
                       )}
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-slate-400 mb-2">Confirmer le mot de passe</label>
                       <div className="relative">
                         <input
                           type={showPw.confirm ? 'text' : 'password'}
                           value={pwForm.confirmPassword}
                           onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                           placeholder="••••••••"
                           className={`w-full bg-slate-800 border text-white rounded-xl px-4 py-2.5 pr-11 outline-none transition ${pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword ? 'border-red-500' : pwForm.confirmPassword && pwForm.newPassword === pwForm.confirmPassword ? 'border-emerald-500' : 'border-slate-700 focus:border-violet-500'}`}
                           required
                         />
                         <button type="button" onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition">
                           {showPw.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                         </button>
                       </div>
                       {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                         <p className="text-xs text-red-400 mt-1">Les mots de passe ne correspondent pas.</p>
                       )}
                       {pwForm.confirmPassword && pwForm.newPassword === pwForm.confirmPassword && (
                         <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Les mots de passe correspondent.</p>
                       )}
                     </div>
                     <div className="flex justify-end pt-1">
                       <button type="submit" disabled={pwLoading || !pwForm.newPassword || !pwForm.confirmPassword} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed">
                         {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                         {pwLoading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                       </button>
                     </div>
                   </form>
                 )}
               </div>


               {/* 2FA */}
               <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <div className="flex items-center gap-3">
                     <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                       <Shield className="w-4 h-4 text-violet-400" />
                     </div>
                     <div>
                       <h4 className="text-base font-bold text-white">Double Authentification (2FA)</h4>
                       <p className="text-sm text-slate-400 mt-0.5 max-w-md">Recevez un code par email à chaque connexion. Fortement recommandé.</p>
                     </div>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input type="checkbox" className="sr-only peer" checked={twoFactorEnabled} onChange={() => setTwoFactorEnabled(!twoFactorEnabled)} />
                      <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-violet-500"></div>
                   </label>
                 </div>
                 <div className="mt-4 flex justify-end">
                   <button onClick={handleSaveProfile} disabled={saving} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-2 rounded-xl font-medium text-sm transition disabled:opacity-50">
                     {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Sauvegarder
                   </button>
                 </div>
               </div>

               {/* Passkeys / Biométrie */}
               <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <div className="flex items-center gap-3">
                     <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                       <Fingerprint className="w-4 h-4 text-violet-400" />
                     </div>
                     <div>
                       <h4 className="text-base font-bold text-white">Authentification Biométrique (Passkeys)</h4>
                       <p className="text-sm text-slate-400 mt-0.5 max-w-md">Connectez-vous rapidement et en toute sécurité avec Face ID, Touch ID ou Windows Hello.</p>
                     </div>
                   </div>
                   <button onClick={handleRegisterPasskey} disabled={saving} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium text-sm transition disabled:opacity-50 flex-shrink-0 shadow-lg shadow-violet-600/20">
                     {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                     Enregistrer cet appareil
                   </button>
                 </div>
               </div>

               {/* Déconnexion */}
               <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                   <div className="w-9 h-9 rounded-xl bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                     <LogOut className="w-4 h-4 text-slate-400" />
                   </div>
                   <div>
                     <h4 className="text-base font-bold text-white">Se déconnecter</h4>
                     <p className="text-sm text-slate-500 mt-0.5">Terminer votre session sur cet appareil.</p>
                   </div>
                 </div>
                 <button onClick={handleSignOut} className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl font-medium text-sm transition">
                   <LogOut className="w-4 h-4" /> Se déconnecter
                 </button>
               </div>

               {/* Zone de danger */}
               <div className="border border-red-500/20 bg-red-500/5 rounded-2xl p-6">
                 <div className="flex items-center gap-3 mb-4">
                   <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                     <AlertTriangle className="w-4 h-4 text-red-400" />
                   </div>
                   <div>
                     <h4 className="text-base font-bold text-red-400">Zone de danger</h4>
                     <p className="text-sm text-slate-500 mt-0.5">Ces actions sont irréversibles. Procédez avec prudence.</p>
                   </div>
                 </div>
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 rounded-xl p-4">
                   <div>
                     <p className="text-sm font-semibold text-white">Réinitialiser le mot de passe par email</p>
                     <p className="text-xs text-slate-500 mt-0.5">Un lien sera envoyé à <span className="text-slate-300">{user?.email}</span></p>
                   </div>
                   <button
                     onClick={async () => { await auth.resetPassword(user?.email); toast('Email de réinitialisation envoyé !', 'success') }}
                     className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl text-sm font-medium transition flex-shrink-0"
                   >
                     Envoyer le lien
                   </button>
                 </div>
               </div>
             </div>
          )}



          {/* ===================== ONGLET PREFERENCES ===================== */}
          {activeTab === 'preferences' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h3 className="text-xl font-bold text-white mb-6">Préférences globales</h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-800">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Devise Principale</label>
                    <select value={formData.devise} onChange={e => setFormData({...formData, devise: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:border-violet-500 outline-none">
                      <option value="EUR">Euro (€)</option>
                      <option value="USD">Dollar ($)</option>
                      <option value="GBP">Livre Sterling (£)</option>
                      <option value="CHF">Franc Suisse (CHF)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Langue de l'interface</label>
                    <select value={formData.langue} onChange={e => setFormData({...formData, langue: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:border-violet-500 outline-none">
                      <option value="fr">Français (FR)</option>
                      <option value="en">English (US)</option>
                    </select>
                  </div>
               </div>

               <div className="pt-4 flex justify-end">
                  <button onClick={handleSaveProfile} disabled={saving} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-bold transition disabled:opacity-50">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Enregistrer
                  </button>
               </div>
             </div>
          )}


          {/* ===================== ONGLET SIGNATURE ===================== */}
          {activeTab === 'signature' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xl font-bold text-white mb-2">Ma signature</h3>
              <p className="text-sm text-slate-400 mb-6">Dessinez votre signature manuscrite pour l'apposer automatiquement sur les documents légaux (Bail, Quittances).</p>

              <div className="flex flex-col md:flex-row items-start gap-8">
                {/* Zone de dessin */}
                <div className="w-full max-w-md">
                  <div className="bg-white rounded-2xl overflow-hidden border-2 border-slate-300 shadow-inner h-64">
                    <SignatureCanvas
                      ref={sigCanvas}
                      onBegin={() => setSignatureCleared(false)}
                      canvasProps={{ className: 'w-full h-full cursor-crosshair touch-none' }}
                      backgroundColor="rgb(255, 255, 255)"
                      penColor="black"
                    />
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button onClick={clearSignature} className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition text-sm font-medium">
                        <Eraser className="w-4 h-4" /> Effacer
                      </button>
                      <label className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition text-sm font-medium cursor-pointer">
                         <ImageIcon className="w-4 h-4" /> 
                         <span>Scanner une photo</span>
                         <input type="file" accept="image/*" className="hidden" onChange={handleScanSignatureImage} />
                      </label>
                    </div>
                    <button onClick={handleSaveSignature} disabled={saving || signatureCleared} className="flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition text-sm font-bold shadow-lg shadow-violet-500/20">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? 'Sauvegarde...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>

                {/* Signature actuelle en BDD */}
                {profile?.signature_url && (
                  <div className="flex-1 bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 w-full">
                    <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Signature enregistrée
                    </h4>
                    <div className="bg-white rounded-xl p-4 inline-block">
                      <img src={profile.signature_url} alt="Ma_signature_enregistree" className="max-h-32 object-contain" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* === SIGNATURE IMAGE CROP MODAL === */}
      {cropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-700 shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Cadrer la signature</h3>
                <p className="text-xs text-slate-400 mt-0.5">Déplace, zoome et cadre exactement la zone de ta signature</p>
              </div>
              <button onClick={() => setCropModal(null)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Crop area */}
            <div className="relative bg-slate-950" style={{ height: '380px' }}>
              <Cropper
                image={cropModal.imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={3 / 1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{
                  containerStyle: { background: '#020617' },
                  cropAreaStyle: { border: '2px solid #7c3aed', borderRadius: '8px' }
                }}
              />
            </div>

            {/* Controls bar */}
            <div className="px-6 py-4 border-t border-slate-800 space-y-3">
              {/* Rotation */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <RotateCw className="w-4 h-4" />
                  <span className="text-sm font-medium text-slate-300 w-20">Rotation</span>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={1}
                  value={rotation}
                  onChange={e => setRotation(Number(e.target.value))}
                  className="flex-1 accent-violet-500"
                />
                <span className="text-slate-400 text-sm w-12 text-right">{rotation}°</span>
                <button
                  onClick={() => setRotation(r => (r + 90 > 180 ? r + 90 - 360 : r + 90))}
                  className="p-2 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition"
                  title="Tourner de 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Zoom */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-300 w-20">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  className="flex-1 accent-violet-500"
                />
                <span className="text-slate-400 text-sm w-12 text-right">{zoom.toFixed(1)}x</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setCropModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmCrop}
                  disabled={cropProcessing}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl text-sm transition disabled:opacity-60"
                >
                  {cropProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {cropProcessing ? 'Extraction...' : 'Extraire la signature'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
