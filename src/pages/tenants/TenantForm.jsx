import React, { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { locataires as tenantApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { ArrowLeft, Loader2, Save, User, Shield, Plus, X, Mail } from 'lucide-react'

const schema = z.object({
  prenom:              z.string().min(1, 'Prénom requis'),
  nom:                 z.string().min(1, 'Nom requis'),
  email:               z.string().email('Email invalide').optional().or(z.literal('')),
  emails_secondaires:  z.array(z.object({ value: z.string().email('Email invalide').or(z.literal('')) })).optional(),
  telephone:           z.string().optional(),
  date_naissance:      z.string().optional(),
  profession:          z.string().optional(),
  revenus_mensuels:    z.preprocess(v => v === '' ? undefined : Number(v), z.number().min(0).optional()),
  statut:              z.enum(['actif', 'inactif']),
  garant_nom:          z.string().optional(),
  garant_telephone:    z.string().optional(),
  garant_email:        z.string().email('Email garant invalide').optional().or(z.literal('')),
})

function FormSection({ title, icon: Icon, children }) {
  return (
    <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 p-6 space-y-4">
      <h2 className="text-base font-semibold text-white pb-3 border-b border-slate-800 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-violet-400" />} {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, error, children, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}{required && <span className="text-violet-400 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

const inputCls = "w-full bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"

export default function TenantForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const isEdit = Boolean(id)

  const { register, handleSubmit, reset, control, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { statut: 'actif', emails_secondaires: [] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'emails_secondaires' })

  useEffect(() => {
    if (!isEdit) return
    tenantApi.getById(id).then(({ data }) => {
      if (data) {
        // Convert string[] from DB to { value: string }[] for useFieldArray
        const formatted = {
          ...data,
          emails_secondaires: (data.emails_secondaires || []).map(v => ({ value: v }))
        }
        reset(formatted)
      }
    })
  }, [id, isEdit, reset])

  const onSubmit = async (values) => {
    // Convert { value: string }[] back to string[] for the DB
    const emails_secondaires = (values.emails_secondaires || [])
      .map(e => e.value?.trim())
      .filter(Boolean)

    const payload = { ...values, emails_secondaires, user_id: user.id }
    const { error } = isEdit
      ? await tenantApi.update(id, payload)
      : await tenantApi.create(payload)

    if (error) {
      toast('Erreur lors de la sauvegarde', 'error')
    } else {
      toast(isEdit ? 'Locataire modifié !' : 'Locataire ajouté !')
      navigate('/tenants')
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/tenants')} className="text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">{isEdit ? 'Modifier le locataire' : 'Nouveau locataire'}</h1>
          <p className="text-slate-400 text-sm mt-0.5">Informations personnelles et financières</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Infos personnelles */}
        <FormSection title="Informations personnelles" icon={User}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prénom" error={errors.prenom?.message} required>
              <input {...register('prenom')} placeholder="Jean" className={inputCls} />
            </Field>
            <Field label="Nom" error={errors.nom?.message} required>
              <input {...register('nom')} placeholder="Dupont" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email principal" error={errors.email?.message}>
              <input {...register('email')} type="email" placeholder="jean@email.com" className={inputCls} />
            </Field>
            <Field label="Téléphone" error={errors.telephone?.message}>
              <input 
                {...register('telephone', {
                  onBlur: (e) => {
                     let val = e.target.value.trim();
                     if (val && /^[1-9]/.test(val)) val = '0' + val;
                     setValue('telephone', val, { shouldValidate: true, shouldDirty: true });
                  }
                })} 
                placeholder="+33 6 12 34 56 78" 
                className={inputCls} 
              />
            </Field>
          </div>

          {/* Emails secondaires */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                Emails supplémentaires
                <span className="text-xs text-slate-500 font-normal">(pour le matching des messages)</span>
              </label>
              <button
                type="button"
                onClick={() => append({ value: '' })}
                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 px-2.5 py-1 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <input
                    {...register(`emails_secondaires.${index}.value`)}
                    type="email"
                    placeholder={`email-${index + 2}@exemple.com`}
                    className={`flex-1 ${inputCls}`}
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {fields.length === 0 && (
                <p className="text-xs text-slate-600 italic py-1">Aucun email supplémentaire. Cliquez sur "Ajouter" pour en renseigner un.</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date de naissance" error={errors.date_naissance?.message}>
              <input {...register('date_naissance')} type="date" className={inputCls} />
            </Field>
            <Field label="Profession" error={errors.profession?.message}>
              <input {...register('profession')} placeholder="Ingénieur" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Revenus mensuels nets (€)" error={errors.revenus_mensuels?.message}>
              <input {...register('revenus_mensuels')} type="number" placeholder="3000" className={inputCls} />
            </Field>
            <Field label="Statut" error={errors.statut?.message}>
              <select {...register('statut')} className={inputCls}>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
              </select>
            </Field>
          </div>
        </FormSection>

        {/* Garant */}
        <FormSection title="Garant (optionnel)" icon={Shield}>
          <p className="text-slate-500 text-xs -mt-2">Renseignez les informations du garant si applicable.</p>
          <Field label="Nom complet du garant" error={errors.garant_nom?.message}>
            <input {...register('garant_nom')} placeholder="Marie Dupont" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Téléphone du garant" error={errors.garant_telephone?.message}>
              <input 
                {...register('garant_telephone', {
                  onBlur: (e) => {
                     let val = e.target.value.trim();
                     if (val && /^[1-9]/.test(val)) val = '0' + val;
                     setValue('garant_telephone', val, { shouldValidate: true, shouldDirty: true });
                  }
                })} 
                placeholder="+33 6 00 00 00 00" 
                className={inputCls} 
              />
            </Field>
            <Field label="Email du garant" error={errors.garant_email?.message}>
              <input {...register('garant_email')} type="email" placeholder="garant@email.com" className={inputCls} />
            </Field>
          </div>
        </FormSection>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/tenants')} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm font-medium">Annuler</button>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl transition shadow-lg shadow-violet-500/20 text-sm disabled:opacity-60">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSubmitting ? 'Sauvegarde...' : isEdit ? 'Sauvegarder' : 'Créer le locataire'}
          </button>
        </div>
      </form>
    </div>
  )
}
