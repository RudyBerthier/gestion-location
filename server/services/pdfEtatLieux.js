import PDFDocument from 'pdfkit';

/**
 * Convertit un état (string) en une version lisible et stylisée
 */
const getEtatLabel = (etat) => {
  switch (etat) {
    case 'tres_bon': return 'Très Bon';
    case 'bon': return 'Bon État';
    case 'usage': return "État d'Usage";
    case 'mauvais': return 'Mauvais';
    case 'remplacer': return 'À Remplacer';
    default: return 'Non Renseigné';
  }
};

/**
 * Génère le buffer PDF de l'état des lieux
 */
export async function generateEtatDesLieuxPDF(etatDesLieuxData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const { type, location, contenu, signatures, date_realisation } = etatDesLieuxData;
      const apt = location?.appartements;
      const tenant = location?.locataires;
      const proprio = location?.user; // ou profile

      // --- EN-TÊTE ---
      doc.fontSize(22).font('Helvetica-Bold').fillColor('#333333');
      doc.text(`ÉTAT DES LIEUX D'${type.toUpperCase()}`, { align: 'center' });
      doc.moveDown(1);

      // --- INFOS GÉNÉRALES ---
      doc.fontSize(10).font('Helvetica').fillColor('#555555');
      
      const realDate = date_realisation ? new Date(date_realisation).toLocaleDateString('fr-FR') : 'Date non définie';
      
      // Bloc Propriétaire
      doc.font('Helvetica-Bold').text('PROPRIÉTAIRE / MANDATAIRE', 50, doc.y);
      doc.font('Helvetica').text(`${proprio?.nom || ''} ${proprio?.prenom || ''}`);
      if (proprio?.entreprise) doc.text(proprio.entreprise);
      doc.text(proprio?.email || '');

      // Bloc Locataire
      doc.font('Helvetica-Bold').text('LOCATAIRE(S)', 300, doc.y - 42); // Align right block
      doc.font('Helvetica').text(`${tenant?.nom || ''} ${tenant?.prenom || ''}`, 300, doc.y);
      doc.text(tenant?.email || '', 300, doc.y);
      
      doc.moveDown(2);

      // Bloc Logement
      doc.font('Helvetica-Bold').text('LOGEMENT', 50, doc.y);
      doc.font('Helvetica').text(`${apt?.titre || 'Appartement'}`);
      doc.text(`${apt?.adresse || ''}, ${apt?.code_postal || ''} ${apt?.ville || ''}`);
      doc.text(`Date de réalisation : ${realDate}`);
      
      doc.moveDown(2);

      // Ligne de séparation
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
      doc.moveDown(1);

      // --- CONTENU (PIÈCES ET ÉLÉMENTS) ---
      if (contenu && contenu.length > 0) {
        contenu.forEach(room => {
          // Si on approche de la fin de page, on saute une page
          if (doc.y > 700) doc.addPage();

          doc.moveDown(1);
          doc.fontSize(14).font('Helvetica-Bold').fillColor('#333333').text(room.piece.toUpperCase());
          doc.moveDown(0.5);

          if (room.elements && room.elements.length > 0) {
            room.elements.forEach(element => {
              if (doc.y > 750) doc.addPage();

              doc.fontSize(11).font('Helvetica-Bold').fillColor('#444444').text(`• ${element.nom} : `, { continued: true });
              
              // État coloré / gris
              doc.font('Helvetica').fillColor('#666666').text(getEtatLabel(element.etat));
              
              if (element.notes && element.notes.trim() !== '') {
                doc.fontSize(10).font('Helvetica-Oblique').fillColor('#888888').text(`  Observations: ${element.notes}`);
              }
              doc.moveDown(0.3);
            });
          } else {
            doc.fontSize(10).font('Helvetica-Oblique').fillColor('#999999').text('Aucun élément renseigné pour cette pièce.');
          }
        });
      } else {
        doc.fontSize(12).font('Helvetica-Oblique').fillColor('#999999').text("L'état des lieux est vide.");
      }

      doc.moveDown(3);

      // --- SIGNATURES ---
      // Ligne de séparation avant les signatures
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
      doc.moveDown(1);

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('SIGNATURES', { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#555555').text('Lu et approuvé. Le présent document a été établi contradictoirement.', { align: 'center' });
      doc.moveDown(2);

      const signY = doc.y;

      // Locataire
      doc.text('Le Locataire :', 100, signY);
      if (signatures && signatures.locataire) {
        try {
          const base64Data = signatures.locataire.replace(/^data:image\/(png|jpeg);base64,/, "");
          const imgBuffer = Buffer.from(base64Data, 'base64');
          doc.image(imgBuffer, 70, signY + 20, { width: 120 });
        } catch (e) {
          doc.fontSize(8).fillColor('red').text('Erreur image', 100, signY + 20);
        }
      }

      // Propriétaire
      doc.fillColor('#555555').text('Le Propriétaire :', 350, signY);
      if (signatures && signatures.proprietaire) {
        try {
          const base64Data = signatures.proprietaire.replace(/^data:image\/(png|jpeg);base64,/, "");
          const imgBuffer = Buffer.from(base64Data, 'base64');
          doc.image(imgBuffer, 320, signY + 20, { width: 120 });
        } catch (e) {
          doc.fontSize(8).fillColor('red').text('Erreur image', 350, signY + 20);
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
