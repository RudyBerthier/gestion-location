/**
 * Convertit un tableau d'objets en fichier CSV et déclenche le téléchargement.
 * @param {Array} rows - Les données à exporter.
 * @param {String} filename - Le nom du fichier cible (sans extension).
 */
export function exportToCSV(rows, filename = 'export') {
  if (!rows || !rows.length) return

  // Extraire les entêtes (seulement les clés qui ne sont pas des objets complexes)
  const headers = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object')
  
  const csvContent = [
    headers.join(';'), // Ligne d'entête (séparateur point-virgule pour Excel fr)
    ...rows.map(row => 
      headers.map(header => {
        let cell = row[header] === null || row[header] === undefined ? '' : String(row[header])
        // Échapper les guillemets existants et entourer de guillemets si contient des espaces ou point-virgules
        cell = cell.replace(/"/g, '""')
        if (cell.includes(';') || cell.includes('"') || cell.includes('\n')) {
          cell = `"${cell}"`
        }
        return cell
      }).join(';')
    )
  ].join('\n')

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`)
  document.body.appendChild(link)
  
  link.click()
  document.body.removeChild(link)
}
