export const defaultRooms = [
  "Entrée",
  "Salon / Séjour",
  "Cuisine",
  "Chambre 1",
  "Chambre 2",
  "Salle de Bain",
  "WC",
  "Couloir",
  "Balcon / Terrasse",
  "Cave",
  "Parking / Garage"
];

export const defaultElements = {
  // Structure / Revêtements
  "Murs": { nom: "Murs", categorie: "structure" },
  "Plinthes": { nom: "Plinthes", categorie: "structure" },
  "Plafond": { nom: "Plafond", categorie: "structure" },
  "Sol": { nom: "Sol", categorie: "structure" },
  
  // Menuiseries
  "Porte d'entrée": { nom: "Porte d'entrée", categorie: "menuiserie" },
  "Porte intérieure": { nom: "Porte intérieure", categorie: "menuiserie" },
  "Fenêtres": { nom: "Fenêtres", categorie: "menuiserie" },
  "Volets / Stores": { nom: "Volets / Stores", categorie: "menuiserie" },
  
  // Électricité / Chauffage
  "Prises électriques": { nom: "Prises électriques", categorie: "electricite" },
  "Interrupteurs": { nom: "Interrupteurs", categorie: "electricite" },
  "Points lumineux (Plafonniers, Appliques)": { nom: "Points lumineux (Plafonniers, Appliques)", categorie: "electricite" },
  "Radiateurs / Chauffage": { nom: "Radiateurs / Chauffage", categorie: "electricite" },
  
  // Plomberie / Sanitaires
  "Robinetterie": { nom: "Robinetterie", categorie: "plomberie" },
  "Douche / Baignoire": { nom: "Douche / Baignoire", categorie: "plomberie" },
  "Lavabo / Vasque": { nom: "Lavabo / Vasque", categorie: "plomberie" },
  "WC (Cuvette, Abattant)": { nom: "WC (Cuvette, Abattant)", categorie: "plomberie" },
  "Évier": { nom: "Évier", categorie: "plomberie" },
  
  // Cuisine / Électroménager
  "Meubles hauts (Cuisine)": { nom: "Meubles hauts", categorie: "meuble" },
  "Meubles bas (Cuisine)": { nom: "Meubles bas", categorie: "meuble" },
  "Plan de travail": { nom: "Plan de travail", categorie: "meuble" },
  "Plaques de cuisson": { nom: "Plaques de cuisson", categorie: "electro" },
  "Hotte aspirante": { nom: "Hotte aspirante", categorie: "electro" },
  "Four": { nom: "Four", categorie: "electro" },
  "Micro-ondes": { nom: "Micro-ondes", categorie: "electro" },
  "Réfrigérateur / Congélateur": { nom: "Réfrigérateur / Congélateur", categorie: "electro" },
  "Lave-vaisselle": { nom: "Lave-vaisselle", categorie: "electro" },
  "Lave-linge": { nom: "Lave-linge", categorie: "electro" },
  
  // Ameublement (Si meublé)
  "Lit / Matelas": { nom: "Lit / Matelas", categorie: "meuble" },
  "Canapé / Fauteuils": { nom: "Canapé / Fauteuils", categorie: "meuble" },
  "Table à manger": { nom: "Table à manger", categorie: "meuble" },
  "Chaises": { nom: "Chaises", categorie: "meuble" },
  "Armoire / Dressing": { nom: "Armoire / Dressing", categorie: "meuble" },
  "Table basse": { nom: "Table basse", categorie: "meuble" },
  "Meuble TV": { nom: "Meuble TV", categorie: "meuble" },
  
  // Divers
  "Détecteur de fumée": { nom: "Détecteur de fumée", categorie: "divers" },
  "VMC / Aérations": { nom: "VMC / Aérations", categorie: "divers" },
  "Miroirs": { nom: "Miroirs", categorie: "divers" }
};
