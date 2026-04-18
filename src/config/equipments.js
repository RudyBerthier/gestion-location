import { 
  Wifi, ShieldCheck, ThermometerSnowflake, Flame, Sofa, Monitor, Utensils, Bath, 
  Wind, Lock, Key, Eye, Briefcase, Dumbbell, Car, Bike, TreePine, CheckCheck, 
  Armchair, Tv, WashingMachine, Coffee, Refrigerator, Microwave, Shirt, Sun, Droplets, Baby
} from 'lucide-react'

export const EQUIPMENT_CATEGORIES = [
  {
    id: 'confort',
    label: 'Confort Intérieur',
    items: [
      { id: 'meuble', label: 'Entièrement Meublé', icon: Armchair },
      { id: 'clim', label: 'Climatisation', icon: ThermometerSnowflake },
      { id: 'plancher_chauffant', label: 'Plancher Chauffant', icon: Flame },
      { id: 'double_vitrage', label: 'Double Vitrage', icon: Sun },
      { id: 'volets_elec', label: 'Volets Roulants', icon: Sun },
      { id: 'vmc', label: 'VMC Hygroréglable', icon: Wind },
    ]
  },
  {
    id: 'tech',
    label: 'Connectivité & Tech',
    items: [
      { id: 'fibre', label: 'Fibre Optique', icon: Wifi },
      { id: 'domotique', label: 'Domotique intégrée', icon: Monitor },
      { id: 'rj45', label: 'Prises RJ45', icon: Wifi },
      { id: 'smart_tv', label: 'Smart TV', icon: Tv },
    ]
  },
  {
    id: 'cuisine_sdb',
    label: 'Cuisine & SDB',
    items: [
      { id: 'cuisine_equipee', label: 'Cuisine Équipée', icon: Utensils },
      { id: 'lave_vaisselle', label: 'Lave-vaisselle', icon: Utensils },
      { id: 'machine_laver', label: 'Machine à laver', icon: Shirt },
      { id: 'baignoire', label: 'Baignoire', icon: Bath },
      { id: 'douche_italienne', label: 'Douche à l\'italienne', icon: Droplets },
    ]
  },
  {
    id: 'securite',
    label: 'Sécurité & Accès',
    items: [
      { id: 'digicode', label: 'Digicode / Interphone', icon: Lock },
      { id: 'porte_blindee', label: 'Porte Blindée', icon: ShieldCheck },
      { id: 'gardien', label: 'Gardien', icon: Eye },
      { id: 'videosurveillance', label: 'Vidéosurveillance', icon: Eye },
      { id: 'serrure_connectee', label: 'Serrure Connectée', icon: Key },
    ]
  },
  {
    id: 'exterieur',
    label: 'Extérieur & Bâtiment',
    items: [
      { id: 'ascenseur', label: 'Ascenseur', icon: CheckCheck },
      { id: 'balcon', label: 'Balcon / Terrasse', icon: Sun },
      { id: 'jardin', label: 'Jardin Privatif', icon: TreePine },
      { id: 'parking', label: 'Parking Privé', icon: Car },
      { id: 'local_velo', label: 'Local Vélos', icon: Bike },
      { id: 'salle_sport', label: 'Salle de sport (résidence)', icon: Dumbbell },
      { id: 'coworking', label: 'Espace Co-working', icon: Briefcase },
    ]
  }
]

// Liste plate pour la recherche
export const ALL_EQUIPMENTS = EQUIPMENT_CATEGORIES.flatMap(cat => cat.items)

export const getEquipmentIcon = (id) => {
  const eq = ALL_EQUIPMENTS.find(e => e.id === id)
  return eq ? eq.icon : CheckCheck
}

export const getEquipmentLabel = (id) => {
  const eq = ALL_EQUIPMENTS.find(e => e.id === id)
  return eq ? eq.label : id
}
