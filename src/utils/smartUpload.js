import imageCompression from 'browser-image-compression';
import * as pdfjsLib from 'pdfjs-dist';

// Set up the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Extract text from the first page of a PDF file.
 */
async function extractFirstPageText(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    if (pdf.numPages === 0) return '';
    
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(item => item.str).join(' ');
    
    return text.toLowerCase();
  } catch (error) {
    console.error('Erreur lors de la lecture du PDF :', error);
    return '';
  }
}

/**
 * Analyzes text to determine the document category and related tenant.
 */
function analyzeDocument(text, filename, locataires = []) {
  const t = (text + ' ' + filename).toLowerCase();
  
  let category = 'autre';
  let suggestedName = filename.replace(/\.[^/.]+$/, ""); // Original filename without extension
  
  // 1. Identify category & suggest a precise name
  if (t.includes('bail') || t.includes('contrat de location') || t.includes('baux')) {
    category = 'bail';
    suggestedName = 'Bail de location';
  } else if (t.includes('état des lieux') || t.includes('etat des lieux') || t.includes('edl') || t.includes('remise des clés')) {
    category = 'etat_lieux';
    if (t.includes('sortie')) suggestedName = 'État des lieux de sortie';
    else if (t.includes('entrée') || t.includes('entree')) suggestedName = 'État des lieux d\'entrée';
    else suggestedName = 'État des lieux';
  } else if (t.includes('quittance') || t.includes('reçu de loyer') || t.includes('avis d\'échéance') || t.includes('appel de loyer')) {
    category = 'quittance';
    if (t.includes('avis')) suggestedName = 'Avis d\'échéance';
    else suggestedName = 'Quittance de loyer';
  } else if (t.includes('assurance') || t.includes('mrh') || t.includes('risques locatifs') || t.includes('responsabilité civile') || t.includes('attestation habitation')) {
    category = 'assurance';
    suggestedName = 'Attestation d\'assurance';
  } else if (t.includes('carte nationale') || t.includes('cni') || t.includes('passeport') || t.includes('identite') || t.includes('identité') || t.includes('titre de séjour') || t.includes('permis de conduire')) {
    category = 'identite';
    suggestedName = "Pièce d'identité";
  } else if (t.includes('bulletin de paie') || t.includes('fiche de paie') || t.includes('bulletin de salaire')) {
    category = 'autre';
    suggestedName = "Fiche de paie";
  } else if (t.includes('avis d\'imposition') || t.includes('déclaration de revenus')) {
    category = 'autre';
    suggestedName = "Avis d'imposition";
  } else if (t.includes('rib') || t.includes('relevé d\'identité bancaire')) {
    category = 'autre';
    suggestedName = "RIB";
  } else if (t.includes('dépôt de garantie') || t.includes('caution') || t.includes('garant')) {
    category = 'autre';
    suggestedName = "Acte de cautionnement";
  }

  // 2. Identify tenant if locataires list is provided
  let matchedLocataire = null;
  for (const loc of locataires) {
    const fullName = `${loc.prenom} ${loc.nom}`.toLowerCase();
    const reverseName = `${loc.nom} ${loc.prenom}`.toLowerCase();
    
    if (t.includes(fullName) || t.includes(reverseName)) {
      matchedLocataire = loc;
      break;
    }
  }

  // Combine category and tenant name if found
  if (matchedLocataire && category !== 'autre') {
    suggestedName = `${suggestedName} - ${matchedLocataire.prenom} ${matchedLocataire.nom}`;
  }

  return { type: category, nom: suggestedName };
}

/**
 * Compresses the file if it's an image, and analyzes it if it's a PDF.
 * Returns { file (compressed/original), suggestedType, suggestedName }
 */
export async function smartProcessFile(file, locataires = []) {
  let finalFile = file;
  let suggestedType = 'autre';
  let suggestedName = file.name.replace(/\.[^/.]+$/, "");
  
  // 1. Image Compression
  if (file.type.startsWith('image/')) {
    try {
      const options = {
        maxSizeMB: 1, // Max 1MB
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      finalFile = await imageCompression(file, options);
      console.log(`Image compressée de ${(file.size/1024).toFixed(0)}Ko à ${(finalFile.size/1024).toFixed(0)}Ko`);
    } catch (error) {
      console.error('Erreur de compression d\'image :', error);
    }
  }

  // 2. PDF Parsing & Auto-naming
  if (file.type === 'application/pdf') {
    const text = await extractFirstPageText(file);
    const analysis = analyzeDocument(text, file.name, locataires);
    suggestedType = analysis.type;
    suggestedName = analysis.nom;
  } else {
    // Basic analysis on filename for non-PDFs
    const analysis = analyzeDocument('', file.name, locataires);
    suggestedType = analysis.type;
  }

  return {
    file: finalFile,
    suggestedType,
    suggestedName
  };
}
