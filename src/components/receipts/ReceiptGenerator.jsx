// src/components/receipts/ReceiptGenerator.jsx - Version corrigée pour l'API backend
import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, Calendar, Euro, User, Home, Mail, Phone, Printer, Eye, Send, X, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationContext';

const ReceiptGenerator = ({ tenant, apartment, location, onClose, onSave }) => {
  const { user } = useAuth();
  const { apartments, tenants } = useApp();
  const { addNotification } = useNotifications();
  const receiptRef = useRef();
  
  // États du composant
  const [selectedTenant, setSelectedTenant] = useState(tenant || null);
  const [selectedApartment, setSelectedApartment] = useState(apartment || null);
  const [selectedLocation, setSelectedLocation] = useState(location || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Données de la quittance
  const [receiptData, setReceiptData] = useState({
    date: new Date().toISOString().split('T')[0],
    period: getCurrentPeriod(),
    rentAmount: '',
    chargesAmount: '',
    receiptNumber: generateReceiptNumber(),
    paymentMethod: 'virement',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
    includeCharges: true,
    paymentReceived: true
  });

  // Effet pour initialiser les montants quand les données changent
  useEffect(() => {
    if (selectedLocation && selectedApartment) {
      setReceiptData(prev => ({
        ...prev,
        rentAmount: selectedLocation.loyer_mensuel || selectedApartment.prix_loyer || '',
        chargesAmount: selectedLocation.charges_mensuelles || selectedApartment.charges || ''
      }));
    } else if (selectedApartment) {
      setReceiptData(prev => ({
        ...prev,
        rentAmount: selectedApartment.prix_loyer || '',
        chargesAmount: selectedApartment.charges || ''
      }));
    }
  }, [selectedLocation, selectedApartment]);

  function getCurrentPeriod() {
    const date = new Date();
    const month = date.toLocaleDateString('fr-FR', { month: 'long' });
    const year = date.getFullYear();
    return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
  }

  function generateReceiptNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `QUI-${year}${month}-${random}`;
  }

  const totalAmount = parseFloat(receiptData.rentAmount || 0) + 
    (receiptData.includeCharges ? parseFloat(receiptData.chargesAmount || 0) : 0);

  const handleInputChange = (field, value) => {
    setReceiptData(prev => ({ ...prev, [field]: value }));
  };

  const handleTenantChange = (tenantId) => {
    const tenant = tenants.find(t => t.id === parseInt(tenantId));
    setSelectedTenant(tenant);
    
    // Trouver l'appartement associé si possible
    const apartmentWithTenant = apartments.find(apt => 
      apt.locataire_actuel && 
      tenant &&
      apt.locataire_actuel.toLowerCase().includes(tenant.prenom.toLowerCase()) &&
      apt.locataire_actuel.toLowerCase().includes(tenant.nom.toLowerCase())
    );
    
    if (apartmentWithTenant) {
      setSelectedApartment(apartmentWithTenant);
    }
  };

  const handleApartmentChange = (apartmentId) => {
    const apartment = apartments.find(a => a.id === parseInt(apartmentId));
    setSelectedApartment(apartment);
  };

  const validateForm = () => {
    if (!selectedTenant) {
      addNotification('Veuillez sélectionner un locataire', 'error');
      return false;
    }
    if (!selectedApartment) {
      addNotification('Veuillez sélectionner un appartement', 'error');
      return false;
    }
    if (!receiptData.rentAmount || parseFloat(receiptData.rentAmount) <= 0) {
      addNotification('Veuillez saisir un montant de loyer valide', 'error');
      return false;
    }
    return true;
  };

  const generatePDF = async () => {
    if (!validateForm()) return;

    setIsGenerating(true);
    
    try {
      // Créer le contenu HTML pour impression
      const printContent = receiptRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Quittance de loyer - ${receiptData.receiptNumber}</title>
            <meta charset="utf-8">
            <style>
              * { box-sizing: border-box; }
              body { 
                font-family: 'Arial', sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: white;
                color: #000;
                line-height: 1.4;
              }
              .receipt-container { 
                max-width: 800px; 
                margin: 0 auto; 
                background: white;
                padding: 30px;
              }
              .header { 
                border-bottom: 2px solid #2563eb; 
                padding-bottom: 20px; 
                margin-bottom: 30px; 
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
              }
              .title { 
                font-size: 28px; 
                font-weight: bold; 
                color: #2563eb; 
                margin: 0 0 10px 0; 
              }
              .subtitle { 
                color: #6b7280; 
                font-size: 14px;
                margin: 0;
              }
              .receipt-info {
                text-align: right;
                color: #374151;
              }
              .receipt-number {
                font-size: 18px;
                font-weight: bold;
                color: #2563eb;
                margin: 0 0 5px 0;
              }
              .section { 
                margin-bottom: 25px; 
              }
              .section-title { 
                font-size: 16px; 
                font-weight: bold; 
                color: #374151; 
                margin: 0 0 15px 0; 
                border-bottom: 1px solid #e5e7eb; 
                padding-bottom: 5px; 
              }
              .info-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 30px; 
                margin-bottom: 20px; 
              }
              .info-card {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 20px;
                background: #f9fafb;
              }
              .info-card h4 {
                margin: 0 0 15px 0;
                font-size: 14px;
                font-weight: bold;
                color: #374151;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .info-item { 
                margin-bottom: 10px;
              }
              .info-label { 
                font-size: 12px; 
                color: #6b7280; 
                margin: 0 0 3px 0;
                font-weight: 500;
              }
              .info-value { 
                font-weight: 600; 
                color: #111827;
                margin: 0;
              }
              .amount-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 20px 0;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                overflow: hidden;
              }
              .amount-table th, .amount-table td { 
                padding: 15px; 
                text-align: left; 
                border-bottom: 1px solid #e5e7eb; 
              }
              .amount-table th { 
                background: #f3f4f6; 
                font-weight: 600;
                color: #374151;
              }
              .amount-table tr:last-child td {
                border-bottom: none;
              }
              .total-row { 
                background: #dbeafe; 
                font-weight: bold; 
                font-size: 16px;
              }
              .total-row td {
                border-top: 2px solid #2563eb;
              }
              .payment-info {
                background: #f0f9ff;
                border: 1px solid #0ea5e9;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
              }
              .legal-text {
                background: #f9fafb;
                border-left: 4px solid #2563eb;
                padding: 15px 20px;
                margin: 30px 0;
                font-size: 12px;
                color: #4b5563;
                line-height: 1.5;
              }
              .signature-section { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 40px; 
                margin-top: 50px; 
                page-break-inside: avoid;
              }
              .signature-box { 
                text-align: center; 
                padding: 30px 20px;
                border: 2px dashed #d1d5db;
                border-radius: 8px;
                min-height: 100px;
              }
              .signature-label {
                font-weight: 600;
                margin-bottom: 40px;
                color: #374151;
              }
              .signature-name {
                font-size: 12px;
                color: #6b7280;
                margin-top: 10px;
              }
              .footer { 
                margin-top: 40px; 
                padding-top: 20px; 
                border-top: 1px solid #e5e7eb; 
                font-size: 11px; 
                color: #9ca3af;
                text-align: center;
              }
              @media print { 
                body { margin: 0; padding: 10px; font-size: 12px; } 
                .receipt-container { padding: 0; box-shadow: none; } 
                .signature-section { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Attendre que le contenu soit chargé puis imprimer
      setTimeout(() => {
        printWindow.print();
      }, 500);
      
      addNotification('Quittance générée avec succès', 'success');
      
      // Sauvegarder si une fonction est fournie
      if (onSave) {
        onSave({
          tenant: selectedTenant,
          apartment: selectedApartment,
          receiptData,
          amount: totalAmount
        });
      }
      
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      addNotification('Erreur lors de la génération', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const sendByEmail = async () => {
    if (!validateForm()) return;
    
    if (!selectedTenant?.email) {
      addNotification('Le locataire n\'a pas d\'adresse email', 'error');
      return;
    }

    setIsSending(true);
    try {
      // Simuler l'envoi d'email (remplacer par vraie API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const emailBody = `
Bonjour ${selectedTenant.prenom} ${selectedTenant.nom},

Veuillez trouver ci-joint la quittance de loyer pour la période de ${receiptData.period}.

Détails :
- Logement : ${selectedApartment.titre}
- Période : ${receiptData.period}  
- Loyer : ${parseFloat(receiptData.rentAmount).toLocaleString('fr-FR')}€
${receiptData.includeCharges ? `- Charges : ${parseFloat(receiptData.chargesAmount || 0).toLocaleString('fr-FR')}€` : ''}
- Total : ${totalAmount.toLocaleString('fr-FR')}€

Cordialement,
${user?.prenom} ${user?.nom}
      `.trim();

      // Ouvrir le client email par défaut
      const mailtoLink = `mailto:${selectedTenant.email}?subject=Quittance de loyer - ${receiptData.period}&body=${encodeURIComponent(emailBody)}`;
      window.open(mailtoLink);
      
      addNotification(`Email préparé pour ${selectedTenant.email}`, 'success');
    } catch (error) {
      console.error('Erreur envoi email:', error);
      addNotification('Erreur lors de l\'envoi', 'error');
    } finally {
      setIsSending(false);
    }
  };

  if (previewMode) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-semibold">Aperçu de la quittance</h2>
            <div className="flex space-x-3">
              <button
                onClick={generatePDF}
                disabled={isGenerating}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                <span>{isGenerating ? 'Génération...' : 'Télécharger PDF'}</span>
              </button>
              
              {selectedTenant?.email && (
                <button
                  onClick={sendByEmail}
                  disabled={isSending}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  <span>{isSending ? 'Envoi...' : 'Envoyer par email'}</span>
                </button>
              )}
              
              <button
                onClick={() => setPreviewMode(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Retour
              </button>
            </div>
          </div>
          
          <div className="p-8">
            <ReceiptTemplate 
              ref={receiptRef}
              receiptData={receiptData}
              tenant={selectedTenant}
              apartment={selectedApartment}
              user={user}
              totalAmount={totalAmount}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[95vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold">Générer une quittance de loyer</h2>
                <p className="text-gray-500 text-sm">
                  Document officiel de paiement du loyer
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Sélection locataire et appartement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Locataire *
              </label>
              <select
                value={selectedTenant?.id || ''}
                onChange={(e) => handleTenantChange(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Sélectionner un locataire</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.prenom} {tenant.nom}
                    {tenant.email && ` - ${tenant.email}`}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Appartement *
              </label>
              <select
                value={selectedApartment?.id || ''}
                onChange={(e) => handleApartmentChange(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Sélectionner un appartement</option>
                {apartments.map(apartment => (
                  <option key={apartment.id} value={apartment.id}>
                    {apartment.titre} - {apartment.adresse_complete}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Informations de la quittance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de la quittance
              </label>
              <input
                type="date"
                value={receiptData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Période concernée
              </label>
              <input
                type="text"
                value={receiptData.period}
                onChange={(e) => handleInputChange('period', e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Janvier 2024"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de quittance
              </label>
              <input
                type="text"
                value={receiptData.receiptNumber}
                onChange={(e) => handleInputChange('receiptNumber', e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Montants */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <Euro size={18} className="mr-2 text-blue-600" />
              Détail des montants
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loyer mensuel (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={receiptData.rentAmount}
                  onChange={(e) => handleInputChange('rentAmount', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1200.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Charges mensuelles (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={receiptData.chargesAmount}
                  onChange={(e) => handleInputChange('chargesAmount', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="150.00"
                />
              </div>
            </div>

            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="includeCharges"
                checked={receiptData.includeCharges}
                onChange={(e) => handleInputChange('includeCharges', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="includeCharges" className="ml-2 text-sm text-gray-700">
                Inclure les charges dans le total
              </label>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-blue-900">Total de la quittance</span>
                <span className="text-2xl font-bold text-blue-900">
                  {totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                </span>
              </div>
            </div>
          </div>

          {/* Informations de paiement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de paiement
              </label>
              <input
                type="date"
                value={receiptData.paymentDate}
                onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Méthode de paiement
              </label>
              <select
                value={receiptData.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="virement">Virement bancaire</option>
                <option value="cheque">Chèque</option>
                <option value="especes">Espèces</option>
                <option value="carte">Carte bancaire</option>
                <option value="prelevement">Prélèvement automatique</option>
              </select>
            </div>
          </div>

          {/* Notes additionnelles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes additionnelles (optionnel)
            </label>
            <textarea
              value={receiptData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Remarques particulières, retards éventuels..."
            />
          </div>

          {/* Aperçu des données sélectionnées */}
          {selectedTenant && selectedApartment && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Aperçu</h4>
              <div className="text-sm text-green-800 space-y-1">
                <p><strong>Locataire :</strong> {selectedTenant.prenom} {selectedTenant.nom}</p>
                <p><strong>Appartement :</strong> {selectedApartment.titre}</p>
                <p><strong>Adresse :</strong> {selectedApartment.adresse_complete}</p>
                <p><strong>Période :</strong> {receiptData.period}</p>
                <p><strong>Total :</strong> {totalAmount.toLocaleString('fr-FR')}€</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setPreviewMode(true)}
              disabled={!selectedTenant || !selectedApartment || !receiptData.rentAmount}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye size={16} />
              <span>Aperçu et générer</span>
            </button>
            
            {selectedTenant?.email && (
              <button
                onClick={() => {
                  setPreviewMode(true);
                  // Auto-envoi après aperçu
                  setTimeout(() => sendByEmail(), 1000);
                }}
                disabled={!selectedTenant || !selectedApartment || !receiptData.rentAmount}
                className="bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
                <span>Envoyer à {selectedTenant.prenom}</span>
              </button>
            )}
            
            <button
              onClick={onClose}
              className="bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Annuler
            </button>
          </div>
          
          <div className="mt-3 text-xs text-gray-500 text-center">
            💡 <strong>Astuce :</strong> Vous pouvez modifier les montants même s'ils sont pré-remplis automatiquement
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant template de quittance amélioré
const ReceiptTemplate = React.forwardRef(({ receiptData, tenant, apartment, user, totalAmount }, ref) => {
  const getPaymentMethodLabel = (method) => {
    const labels = {
      virement: 'Virement bancaire',
      cheque: 'Chèque',
      especes: 'Espèces',
      carte: 'Carte bancaire',
      prelevement: 'Prélèvement automatique'
    };
    return labels[method] || method;
  };

  const numberToWords = (num) => {
    // Version simplifiée - en production, utiliser une vraie librairie
    const integer = Math.floor(num);
    const decimal = Math.round((num - integer) * 100);
    
    if (integer < 100) {
      const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
      const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
      const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
      
      let result = '';
      if (integer >= 20) {
        const tensDigit = Math.floor(integer / 10);
        const unitsDigit = integer % 10;
        result = tens[tensDigit];
        if (unitsDigit > 0) result += '-' + units[unitsDigit];
      } else if (integer >= 10) {
        result = teens[integer - 10];
      } else if (integer > 0) {
        result = units[integer];
      }
      
      if (decimal > 0) result += ` virgule ${decimal < 10 ? 'zéro ' : ''}${decimal}`;
      return result;
    }
    return `${integer} ${decimal > 0 ? `virgule ${decimal}` : ''}`;
  };

  return (
    <div ref={ref} className="receipt-container">
      {/* En-tête */}
      <div className="header">
        <div>
          <h1 className="title">QUITTANCE DE LOYER</h1>
          <p className="subtitle">Document officiel de paiement</p>
        </div>
        <div className="receipt-info">
          <p className="receipt-number">N° {receiptData.receiptNumber}</p>
          <p>Émise le {new Date(receiptData.date).toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      {/* Informations bailleur et locataire */}
      <div className="info-grid">
        <div className="info-card">
          <h4>Bailleur</h4>
          <div className="info-item">
            <p className="info-label">Nom complet</p>
            <p className="info-value">{user?.prenom} {user?.nom}</p>
          </div>
          {user?.entreprise && (
            <div className="info-item">
              <p className="info-label">Entreprise</p>
              <p className="info-value">{user.entreprise}</p>
            </div>
          )}
          {user?.email && (
            <div className="info-item">
              <p className="info-label">Email</p>
              <p className="info-value">{user.email}</p>
            </div>
          )}
          {user?.telephone && (
            <div className="info-item">
              <p className="info-label">Téléphone</p>
              <p className="info-value">{user.telephone}</p>
            </div>
          )}
        </div>

        <div className="info-card">
          <h4>Locataire</h4>
          <div className="info-item">
            <p className="info-label">Nom complet</p>
            <p className="info-value">{tenant?.prenom} {tenant?.nom}</p>
          </div>
          {tenant?.email && (
            <div className="info-item">
              <p className="info-label">Email</p>
              <p className="info-value">{tenant.email}</p>
            </div>
          )}
          {tenant?.telephone && (
            <div className="info-item">
              <p className="info-label">Téléphone</p>
              <p className="info-value">{tenant.telephone}</p>
            </div>
          )}
          {tenant?.profession && (
            <div className="info-item">
              <p className="info-label">Profession</p>
              <p className="info-value">{tenant.profession}</p>
            </div>
          )}
        </div>
      </div>

      {/* Informations du logement */}
      <div className="section">
        <h3 className="section-title">Bien loué</h3>
        <div className="info-grid">
          <div className="info-item">
            <p className="info-label">Désignation</p>
            <p className="info-value">{apartment?.titre}</p>
          </div>
          <div className="info-item">
            <p className="info-label">Adresse complète</p>
            <p className="info-value">{apartment?.adresse_complete}</p>
          </div>
          {apartment?.surface && (
            <div className="info-item">
              <p className="info-label">Surface</p>
              <p className="info-value">{apartment.surface} m²</p>
            </div>
          )}
          {apartment?.nb_pieces && (
            <div className="info-item">
              <p className="info-label">Nombre de pièces</p>
              <p className="info-value">{apartment.nb_pieces} pièces</p>
            </div>
          )}
        </div>
      </div>

      {/* Détail du paiement */}
      <div className="section">
        <h3 className="section-title">Détail du paiement pour la période : {receiptData.period}</h3>
        <table className="amount-table">
          <thead>
            <tr>
              <th>Désignation</th>
              <th style={{textAlign: 'right'}}>Montant (€)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Loyer mensuel</td>
              <td style={{textAlign: 'right'}}>{parseFloat(receiptData.rentAmount).toLocaleString('fr-FR', {minimumFractionDigits: 2})}€</td>
            </tr>
            {receiptData.includeCharges && receiptData.chargesAmount && parseFloat(receiptData.chargesAmount) > 0 && (
              <tr>
                <td>Charges locatives</td>
                <td style={{textAlign: 'right'}}>{parseFloat(receiptData.chargesAmount).toLocaleString('fr-FR', {minimumFractionDigits: 2})}€</td>
              </tr>
            )}
            <tr className="total-row">
              <td><strong>TOTAL PAYÉ</strong></td>
              <td style={{textAlign: 'right'}}><strong>{totalAmount.toLocaleString('fr-FR', {minimumFractionDigits: 2})}€</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Informations de paiement */}
      <div className="payment-info">
        <div className="info-grid">
          <div className="info-item">
            <p className="info-label">Date de paiement</p>
            <p className="info-value">{new Date(receiptData.paymentDate).toLocaleDateString('fr-FR')}</p>
          </div>
          <div className="info-item">
            <p className="info-label">Mode de paiement</p>
            <p className="info-value">{getPaymentMethodLabel(receiptData.paymentMethod)}</p>
          </div>
        </div>
        
        <div style={{marginTop: '15px', fontSize: '14px', color: '#0369a1'}}>
          <strong>Montant reçu en toutes lettres :</strong> {numberToWords(totalAmount)} euros
        </div>
      </div>

      {/* Notes additionnelles */}
      {receiptData.notes && (
        <div className="section">
          <h3 className="section-title">Notes</h3>
          <div className="info-item">
            <p className="info-value">{receiptData.notes}</p>
          </div>
        </div>
      )}

      {/* Mentions légales */}
      <div className="legal-text">
        <p style={{margin: '0 0 10px 0', fontWeight: '600'}}>Mentions légales :</p>
        <p style={{margin: '0 0 8px 0'}}>
          Le bailleur reconnaît avoir reçu du locataire la somme de <strong>{totalAmount.toLocaleString('fr-FR', {minimumFractionDigits: 2})}€</strong> 
          ({numberToWords(totalAmount)} euros) pour la période du {receiptData.period}.
        </p>
        <p style={{margin: '0 0 8px 0'}}>
          Cette quittance libère le locataire de ses obligations de paiement pour la période mentionnée.
          Le paiement partiel ne peut donner lieu qu'à un reçu et non à une quittance.
        </p>
        <p style={{margin: '0'}}>
          Quittance émise conformément à l'article 21 de la loi n°89-462 du 6 juillet 1989.
        </p>
      </div>

      {/* Signatures */}
      <div className="signature-section">
        <div className="signature-box">
          <div className="signature-label">Signature du bailleur</div>
          <div className="signature-name">{user?.prenom} {user?.nom}</div>
        </div>
        <div className="signature-box">
          <div className="signature-label">Signature du locataire</div>
          <div className="signature-name">{tenant?.prenom} {tenant?.nom}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <p>Document généré automatiquement le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</p>
      </div>
    </div>
  );
});

export default ReceiptGenerator;