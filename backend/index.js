// backend/index.js - PARTIE 1/6 : Configuration et Authentification
const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const util = require('util');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const CLIENT_ID = 'bca45e51-55f3-4213-acc8-e698a0e06bf8';
const CLIENT_SECRET = '271e3e36f197655985677eb6b0ca815359ace234425051eeec15a88b1412d53844247081f83c562a058e4ba7e605b9775d55e1b4371a8a4ef80192cc9d96079d';
const REDIRECT_URI = 'https://location.berthier-contact.fr/callback';

const app = express();
const PORT = 4000;
const JWT_SECRET = '9NN0yd1BoiBPNS6w3ajHcXY3XaQfzKaZ'; // À changer en production

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Configuration de la base de données
let db;
function createNewConnection() {
    db = mysql.createPool({
        connectionLimit: 10000,
        host: "127.0.0.1",
        user: "rudy",
        password: "lebg",
        database: "gestion-locative",
        waitForConnections: true,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000
    });

    db.on('connection', (connection) => {
        console.log('New connection established');
        connection.on('error', (err) => {
            console.error('Connection error:', err);
            if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
                console.log('Reconnecting to database...');
                createNewConnection();
            } else {
                throw err;
            }
        });
    });

    db.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to database:', err);
            setTimeout(createNewConnection, 2000);
        } else {
            console.log('Database connection successful!');
            connection.release();
        }
    });
}

createNewConnection();

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Token d\'accès requis' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Token invalide' });
        }
        req.user = user;
        next();
    });
};

// Configuration multer pour l'upload de fichiers
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xlsx|gif|mp4|mov|avi|webm/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Seuls les fichiers image, vidéo et documents sont autorisés'));
        }
    },
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// ========================= CONFIGURATION EMAIL =========================

// Configuration Nodemailer (à personnaliser selon votre provider)
const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.ionos.fr', // ou votre SMTP
    port: process.env.SMTP_PORT || 587,
    secure: false, // true pour 465, false pour autres ports
    auth: {
        user: process.env.SMTP_USER || 'noreply@berthier-contact.fr',
        pass: process.env.SMTP_PASS || 'qervag-8diCgo-jutfaq' // Mot de passe d'application
    }
};

const transporter = nodemailer.createTransport(emailConfig);

// Vérifier la configuration email au démarrage
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Erreur configuration email:', error);
    } else {
        console.log('✅ Configuration email OK');
    }
});

// ========================= FONCTIONS UTILITAIRES 2FA =========================

// Générer un code de vérification à 6 chiffres
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Template email de vérification
const getVerificationEmailTemplate = (code, userFirstName) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code de vérification - Gestion Locative</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 40px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                    <span style="color: white; font-size: 45px;">🏠</span>
                </div>
                <h1 style="color: #1f2937; margin: 0; font-size: 28px;">Gestion Locative</h1>
            </div>
            
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
                <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 22px;">Bonjour ${userFirstName || ''},</h2>
                <p style="color: #4b5563; margin: 0 0 25px 0; font-size: 16px; line-height: 1.5;">
                    Voici votre code de vérification pour vous connecter à votre compte :
                </p>
                
                <div style="background-color: #3b82f6; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; border-radius: 8px; margin: 25px 0; display: inline-block; min-width: 200px;">
                    ${code}
                </div>
                
                <p style="color: #6b7280; margin: 15px 0 0 0; font-size: 14px;">
                    ⏰ Ce code expire dans <strong>10 minutes</strong>
                </p>
            </div>
            
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 30px;">
                <p style="color: #92400e; margin: 0; font-size: 14px; text-align: center;">
                    <strong>⚠️ Sécurité :</strong> Si vous n'avez pas demandé ce code, ignorez cet email.
                </p>
            </div>
            
            <div style="text-align: center; color: #6b7280; font-size: 12px; line-height: 1.5;">
                <p>Gestion Locative - Votre plateforme de gestion immobilière</p>
                <p>© ${new Date().getFullYear()} - Tous droits réservés</p>
            </div>
        </div>
    </body>
    </html>`;
};

// Envoyer l'email de vérification
const sendVerificationEmail = async (email, code, userFirstName) => {
    try {
        const mailOptions = {
            from: {
                name: 'Gestion Locative',
                address: process.env.SMTP_USER || 'noreply@berthier-contact.fr'
            },
            to: email,
            subject: `🔐 Code de vérification : ${code}`,
            html: getVerificationEmailTemplate(code, userFirstName),
            // Version texte pour les clients qui ne supportent pas le HTML
            text: `
Bonjour ${userFirstName || ''},

Voici votre code de vérification pour vous connecter à Gestion Locative :

Code : ${code}

Ce code expire dans 10 minutes.

Si vous n'avez pas demandé ce code, ignorez cet email.

Gestion Locative
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Email de vérification envoyé à:', email);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Erreur envoi email:', error);
        return { success: false, error: error.message };
    }
};

const generateResetToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Template email de réinitialisation de mot de passe
const getPasswordResetEmailTemplate = (resetUrl, userFirstName, expiresInHours = 1) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réinitialisation de mot de passe - Gestion Locative</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 40px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                    <span style="color: white; font-size: 45px;">🏠</span>
                </div>
                <h1 style="color: #1f2937; margin: 0; font-size: 28px;">Gestion Locative</h1>
            </div>
            
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
                <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 22px;">Bonjour ${userFirstName || ''},</h2>
                <p style="color: #4b5563; margin: 0 0 25px 0; font-size: 16px; line-height: 1.5;">
                    Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
                </p>
                
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0;">
                    Réinitialiser mon mot de passe
                </a>
                
                <p style="color: #6b7280; margin: 15px 0 0 0; font-size: 14px;">
                    ⏰ Ce lien expire dans <strong>${expiresInHours} heure${expiresInHours > 1 ? 's' : ''}</strong>
                </p>
            </div>
            
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 30px;">
                <p style="color: #92400e; margin: 0; font-size: 14px; text-align: center;">
                    <strong>⚠️ Sécurité :</strong> Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel reste inchangé.
                </p>
            </div>
            
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; margin-bottom: 30px;">
                <p style="color: #6b7280; margin: 0; font-size: 12px; text-align: center;">
                    Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                    <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
                </p>
            </div>
            
            <div style="text-align: center; color: #6b7280; font-size: 12px; line-height: 1.5;">
                <p>Gestion Locative - Votre plateforme de gestion immobilière</p>
                <p>© ${new Date().getFullYear()} - Tous droits réservés</p>
            </div>
        </div>
    </body>
    </html>`;
};

// Envoyer l'email de réinitialisation
const sendPasswordResetEmail = async (email, resetUrl, userFirstName) => {
    try {
        const mailOptions = {
            from: {
                name: 'Gestion Locative',
                address: process.env.SMTP_USER || 'noreply@berthier-contact.fr'
            },
            to: email,
            subject: '🔐 Réinitialisation de votre mot de passe',
            html: getPasswordResetEmailTemplate(resetUrl, userFirstName),
            text: `
Bonjour ${userFirstName || ''},

Vous avez demandé la réinitialisation de votre mot de passe pour Gestion Locative.

Pour créer un nouveau mot de passe, cliquez sur ce lien :
${resetUrl}

Ce lien expire dans 1 heure.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

Gestion Locative
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Email de réinitialisation envoyé à:', email);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Erreur envoi email réinitialisation:', error);
        return { success: false, error: error.message };
    }
};

// ========================= TABLE DE VÉRIFICATION =========================

// Créer la table pour les codes de vérification
const createVerificationTable = () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS email_verifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            code VARCHAR(6) NOT NULL,
            user_id INT,
            expires_at TIMESTAMP NOT NULL,
            attempts INT DEFAULT 0,
            verified BOOLEAN DEFAULT FALSE,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            verified_at TIMESTAMP NULL,
            INDEX idx_email_code (email, code),
            INDEX idx_expires_at (expires_at),
            FOREIGN KEY (user_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
        )
    `;

    db.query(createTableQuery, (err) => {
        if (err) {
            console.error('Erreur création table email_verifications:', err);
        } else {
            console.log('✅ Table email_verifications créée/vérifiée');
        }
    });
};

// Créer la table au démarrage
setTimeout(createVerificationTable, 6000);

// Nettoyer les codes expirés (tous les 10 minutes)
setInterval(() => {
    db.query('DELETE FROM email_verifications WHERE expires_at < NOW()', (err, result) => {
        if (err) {
            console.error('Erreur nettoyage codes expirés:', err);
        } else if (result.affectedRows > 0) {
            console.log(`🧹 ${result.affectedRows} code(s) de vérification expirés supprimés`);
        }
    });
}, 10 * 60 * 1000); // 10 minutes

// async function testemail() {
//     try {
//         const testEmail = 'test@example.com';
//         const verificationCode = generateVerificationCode();
//         const userFirstName = 'Test';

//         const emailResult = await sendVerificationEmail(testEmail, verificationCode, userFirstName);
//         console.log('Email test result:', emailResult);
//     } catch (error) {
//         console.error('Error during email test:', error);
//     }
// }
// setInterval(() => { testemail(); }, 7000); // Test email every 24 hours
// ========================= ROUTES 2FA =========================

// ========================= FONCTIONS UTILITAIRES =========================

// Fonction pour vérifier les conflits de planning
function checkSchedulingConflicts(apartmentId, startDate, endDate, excludeLocationId, callback) {
    // Vérifier les conflits avec les locations existantes
    let conflictQuery = `
        SELECT 
            l.id, l.date_debut, l.date_fin, l.statut,
            loc.nom, loc.prenom
        FROM locations l
        JOIN locataires loc ON l.locataire_id = loc.id
        WHERE l.appartement_id = ?
        AND l.statut IN ('active', 'terminee')
    `;

    const queryParams = [apartmentId];

    if (excludeLocationId) {
        conflictQuery += ` AND l.id != ?`;
        queryParams.push(excludeLocationId);
    }

    if (startDate && endDate) {
        conflictQuery += ` AND (
            (l.date_debut <= ? AND (l.date_fin IS NULL OR l.date_fin >= ?))
            OR
            (l.date_debut <= ? AND (l.date_fin IS NULL OR l.date_fin >= ?))
            OR
            (l.date_debut >= ? AND l.date_debut <= ?)
        )`;
        queryParams.push(startDate, startDate, endDate, endDate, startDate, endDate);
    }

    db.query(conflictQuery, queryParams, (err, conflicts) => {
        if (err) {
            console.error('Erreur vérification conflits:', err);
            return callback(true, [{ type: 'error', message: 'Erreur lors de la vérification' }]);
        }

        if (conflicts.length > 0) {
            const conflictDetails = conflicts.map(conflict => ({
                type: 'location_overlap',
                location_id: conflict.id,
                tenant_name: `${conflict.prenom} ${conflict.nom}`,
                start_date: conflict.date_debut,
                end_date: conflict.date_fin,
                status: conflict.statut
            }));

            return callback(true, conflictDetails);
        }

        callback(false, []);
    });
}

// Fonction pour programmer une notification
function scheduleEventNotification(eventId, eventDate, reminderMinutes) {
    const notificationDate = new Date(new Date(eventDate).getTime() - reminderMinutes * 60000);
    
    // Insérer la notification programmée
    const notificationQuery = `
        INSERT INTO calendar_notifications (
            calendar_event_id, notification_type, scheduled_for,
            message_subject, message_body, status
        ) VALUES (?, 'system', ?, ?, ?, 'pending')
    `;

    const subject = 'Rappel d\'événement';
    const body = `Votre événement commence dans ${reminderMinutes} minutes.`;

    db.query(notificationQuery, [eventId, notificationDate, subject, body], (err) => {
        if (err) {
            console.error('Erreur programmation notification:', err);
        }
    });
}

// ========================= TRIGGER ET MAINTENANCE =========================

// Job de nettoyage des notifications expirées (à exécuter périodiquement)
setInterval(() => {
    db.query(`
        DELETE FROM calendar_notifications 
        WHERE status = 'pending' AND scheduled_for < DATE_SUB(NOW(), INTERVAL 1 DAY)
    `, (err, result) => {
        if (err) {
            console.error('Erreur nettoyage notifications:', err);
        } else if (result.affectedRows > 0) {
            console.log(`🧹 ${result.affectedRows} notification(s) expirée(s) supprimée(s)`);
        }
    });
}, 24 * 60 * 60 * 1000); // Une fois par jour

// Job pour traiter les notifications en attente
setInterval(() => {
    db.query(`
        SELECT * FROM calendar_notifications 
        WHERE status = 'pending' AND scheduled_for <= NOW()
        LIMIT 10
    `, (err, notifications) => {
        if (err) {
            console.error('Erreur récupération notifications:', err);
            return;
        }

        notifications.forEach(notification => {
            // Marquer comme envoyée (simulation)
            db.query(`
                UPDATE calendar_notifications 
                SET status = 'sent', sent_at = NOW() 
                WHERE id = ?
            `, [notification.id], (err) => {
                if (err) {
                    console.error('Erreur mise à jour notification:', err);
                } else {
                    console.log(`📧 Notification ${notification.id} traitée`);
                }
            });
        });
    });
}, 5 * 60 * 1000); // Toutes les 5 minutes


// ========================= ROUTES CALENDRIER =========================
// À ajouter dans index.js après les autres routes

// GET - Récupérer tous les événements du calendrier
app.get('/calendar/events', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { start_date, end_date, apartment_id, event_type, status } = req.query;

    let query = `
        SELECT 
            ce.*,
            a.titre as apartment_title,
            l.nom as tenant_lastname,
            l.prenom as tenant_firstname
        FROM calendar_events ce
        LEFT JOIN appartements a ON ce.appartement_id = a.id
        LEFT JOIN locataires l ON ce.locataire_id = l.id
        WHERE ce.user_id = ?
    `;
    
    const queryParams = [userId];

    // Filtres optionnels
    if (start_date && end_date) {
        query += ` AND ((ce.start_date BETWEEN ? AND ?) OR (ce.end_date BETWEEN ? AND ?) OR (ce.start_date <= ? AND ce.end_date >= ?))`;
        queryParams.push(start_date, end_date, start_date, end_date, start_date, end_date);
    }

    if (apartment_id) {
        query += ` AND ce.appartement_id = ?`;
        queryParams.push(apartment_id);
    }

    if (event_type) {
        query += ` AND ce.event_type = ?`;
        queryParams.push(event_type);
    }

    if (status) {
        query += ` AND ce.status = ?`;
        queryParams.push(status);
    }

    query += ` ORDER BY ce.start_date ASC`;

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Erreur récupération événements:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        res.json({ success: true, data: results });
    });
});

// POST - Créer un nouvel événement
app.post('/calendar/events', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const {
        appartement_id, locataire_id, location_id, event_type, title, description,
        start_date, end_date, all_day, status, priority, color, 
        notifications_enabled, reminder_minutes
    } = req.body;

    // Validation des données
    if (!title || !start_date || !end_date || !event_type) {
        return res.status(400).json({ 
            success: false, 
            message: 'Titre, dates et type d\'événement sont obligatoires' 
        });
    }

    // Vérifier que l'appartement appartient à l'utilisateur (si fourni)
    if (appartement_id) {
        db.query('SELECT id FROM appartements WHERE id = ? AND utilisateur_id = ?', 
            [appartement_id, userId], (err, results) => {
            if (err || results.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Appartement non trouvé' 
                });
            }

            // Vérifier les conflits de dates pour cet appartement
            if (event_type === 'rental_start' || event_type === 'rental_end') {
                checkSchedulingConflicts(appartement_id, start_date, end_date, null, (hasConflict, conflictDetails) => {
                    if (hasConflict) {
                        return res.status(400).json({
                            success: false,
                            message: 'Conflit de planning détecté',
                            conflict: conflictDetails
                        });
                    }
                    createEvent();
                });
            } else {
                createEvent();
            }
        });
    } else {
        createEvent();
    }

    function createEvent() {
        const insertQuery = `
            INSERT INTO calendar_events (
                user_id, appartement_id, locataire_id, location_id, event_type,
                title, description, start_date, end_date, all_day, status,
                priority, color, notifications_enabled, reminder_minutes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            userId, appartement_id || null, locataire_id || null, location_id || null,
            event_type, title, description, start_date, end_date, 
            all_day || false, status || 'scheduled', priority || 'medium',
            color || '#3b82f6', notifications_enabled !== false, 
            reminder_minutes || 60, userId
        ];

        db.query(insertQuery, values, (err, result) => {
            if (err) {
                console.error('Erreur création événement:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            // Programmer les notifications si activées
            if (notifications_enabled !== false && reminder_minutes > 0) {
                scheduleEventNotification(result.insertId, start_date, reminder_minutes);
            }

            res.json({ 
                success: true, 
                message: 'Événement créé avec succès',
                id: result.insertId 
            });
        });
    }
});

// PUT - Modifier un événement
app.put('/calendar/events/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const updateData = req.body;

    // Vérifier ownership
    db.query('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?', [id, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ success: false, message: 'Événement non trouvé' });
        }

        const currentEvent = results[0];

        // Construire la requête de mise à jour
        const fields = [];
        const values = [];

        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined && ['title', 'description', 'start_date', 'end_date', 'event_type', 'status', 'priority', 'color', 'all_day', 'notifications_enabled', 'reminder_minutes'].includes(key)) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        });

        if (fields.length === 0) {
            return res.status(400).json({ success: false, message: 'Aucune donnée à mettre à jour' });
        }

        values.push(id);
        const updateQuery = `UPDATE calendar_events SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

        db.query(updateQuery, values, (err, result) => {
            if (err) {
                console.error('Erreur mise à jour événement:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            res.json({ success: true, message: 'Événement mis à jour avec succès' });
        });
    });
});

// DELETE - Supprimer un événement
app.delete('/calendar/events/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    db.query('DELETE FROM calendar_events WHERE id = ? AND user_id = ?', [id, userId], (err, result) => {
        if (err) {
            console.error('Erreur suppression événement:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Événement non trouvé' });
        }

        res.json({ success: true, message: 'Événement supprimé avec succès' });
    });
});

// POST - Générer automatiquement les événements depuis les locations
app.post('/calendar/generate-automatic-events', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    // Récupérer toutes les locations de l'utilisateur qui n'ont pas encore d'événements automatiques
    const locationsQuery = `
        SELECT 
            l.*, 
            a.titre as apartment_title,
            loc.nom as tenant_lastname,
            loc.prenom as tenant_firstname
        FROM locations l
        JOIN appartements a ON l.appartement_id = a.id
        JOIN locataires loc ON l.locataire_id = loc.id
        WHERE a.utilisateur_id = ? 
        AND (l.automatic_events_created IS NULL OR l.automatic_events_created = FALSE)
    `;

    db.query(locationsQuery, [userId], (err, locations) => {
        if (err) {
            console.error('Erreur récupération locations:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (locations.length === 0) {
            return res.json({ success: true, message: 'Aucun événement automatique à créer', created: 0 });
        }

        let eventsCreated = 0;
        let eventsToCreate = [];

        locations.forEach(location => {
            // Événement de début de location
            eventsToCreate.push({
                user_id: userId,
                appartement_id: location.appartement_id,
                locataire_id: location.locataire_id,
                location_id: location.id,
                event_type: 'rental_start',
                title: `Début location - ${location.tenant_firstname} ${location.tenant_lastname}`,
                description: `Début de location pour ${location.apartment_title}`,
                start_date: location.date_debut,
                end_date: location.date_debut,
                all_day: true,
                status: location.statut === 'active' ? 'completed' : 'scheduled',
                priority: 'high',
                color: '#06b6d4',
                notifications_enabled: true,
                reminder_minutes: 60,
                created_by: userId
            });

            // Événement de fin de location (si date_fin fournie)
            if (location.date_fin) {
                eventsToCreate.push({
                    user_id: userId,
                    appartement_id: location.appartement_id,
                    locataire_id: location.locataire_id,
                    location_id: location.id,
                    event_type: 'rental_end',
                    title: `Fin location - ${location.tenant_firstname} ${location.tenant_lastname}`,
                    description: `Fin de location pour ${location.apartment_title}`,
                    start_date: location.date_fin,
                    end_date: location.date_fin,
                    all_day: true,
                    status: new Date(location.date_fin) < new Date() ? 'completed' : 'scheduled',
                    priority: 'high',
                    color: '#f97316',
                    notifications_enabled: true,
                    reminder_minutes: 1440, // 24h avant
                    created_by: userId
                });
            }
        });

        // Insérer tous les événements
        if (eventsToCreate.length > 0) {
            const insertQuery = `
                INSERT INTO calendar_events (
                    user_id, appartement_id, locataire_id, location_id, event_type,
                    title, description, start_date, end_date, all_day, status,
                    priority, color, notifications_enabled, reminder_minutes, created_by
                ) VALUES ?
            `;

            const values = eventsToCreate.map(event => [
                event.user_id, event.appartement_id, event.locataire_id, event.location_id,
                event.event_type, event.title, event.description, event.start_date,
                event.end_date, event.all_day, event.status, event.priority,
                event.color, event.notifications_enabled, event.reminder_minutes, event.created_by
            ]);

            db.query(insertQuery, [values], (err, result) => {
                if (err) {
                    console.error('Erreur création événements automatiques:', err);
                    return res.status(500).json({ success: false, message: 'Erreur serveur' });
                }

                eventsCreated = result.affectedRows;

                // Marquer les locations comme ayant leurs événements créés
                const locationIds = locations.map(l => l.id);
                const markQuery = `UPDATE locations SET automatic_events_created = TRUE WHERE id IN (${locationIds.map(() => '?').join(',')})`;
                
                db.query(markQuery, locationIds, (err2) => {
                    if (err2) {
                        console.error('Erreur marquage locations:', err2);
                    }

                    res.json({ 
                        success: true, 
                        message: `${eventsCreated} événement(s) automatique(s) créé(s)`,
                        created: eventsCreated 
                    });
                });
            });
        } else {
            res.json({ success: true, message: 'Aucun événement à créer', created: 0 });
        }
    });
});

// GET - Vérifier la disponibilité d'un appartement
app.get('/calendar/availability/:apartmentId', authenticateToken, (req, res) => {
    const { apartmentId } = req.params;
    const { start_date, end_date } = req.query;
    const userId = req.user.userId;

    // Vérifier ownership
    db.query('SELECT id FROM appartements WHERE id = ? AND utilisateur_id = ?', [apartmentId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ success: false, message: 'Appartement non trouvé' });
        }

        checkSchedulingConflicts(apartmentId, start_date, end_date, null, (hasConflict, conflictDetails) => {
            res.json({
                success: true,
                data: {
                    available: !hasConflict,
                    conflicts: conflictDetails || []
                }
            });
        });
    });
});

// POST - Créer une visite détaillée
app.post('/calendar/visits', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const {
        appartement_id, visitor_name, visitor_email, visitor_phone,
        visit_date, duration_minutes, visit_type, notes, source,
        special_requirements
    } = req.body;

    // Validation
    if (!appartement_id || !visitor_name || !visit_date) {
        return res.status(400).json({ 
            success: false, 
            message: 'Appartement, nom du visiteur et date sont obligatoires' 
        });
    }

    // Vérifier ownership de l'appartement
    db.query('SELECT id, titre FROM appartements WHERE id = ? AND utilisateur_id = ?', 
        [appartement_id, userId], (err, apartments) => {
        if (err || apartments.length === 0) {
            return res.status(404).json({ success: false, message: 'Appartement non trouvé' });
        }

        const apartment = apartments[0];

        // Créer d'abord l'événement dans le calendrier
        const eventData = {
            user_id: userId,
            appartement_id: appartement_id,
            event_type: 'visit',
            title: `Visite - ${visitor_name}`,
            description: `Visite de ${apartment.titre} par ${visitor_name}`,
            start_date: visit_date,
            end_date: new Date(new Date(visit_date).getTime() + (duration_minutes || 30) * 60000).toISOString(),
            status: 'scheduled',
            priority: 'medium',
            color: '#3b82f6',
            notifications_enabled: true,
            reminder_minutes: 60,
            created_by: userId
        };

        const eventQuery = `
            INSERT INTO calendar_events (
                user_id, appartement_id, event_type, title, description,
                start_date, end_date, status, priority, color,
                notifications_enabled, reminder_minutes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const eventValues = [
            eventData.user_id, eventData.appartement_id, eventData.event_type,
            eventData.title, eventData.description, eventData.start_date,
            eventData.end_date, eventData.status, eventData.priority,
            eventData.color, eventData.notifications_enabled, 
            eventData.reminder_minutes, eventData.created_by
        ];

        db.query(eventQuery, eventValues, (err, eventResult) => {
            if (err) {
                console.error('Erreur création événement visite:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            // Créer ensuite les détails de la visite
            const visitQuery = `
                INSERT INTO apartment_visits (
                    calendar_event_id, appartement_id, visitor_name, visitor_email,
                    visitor_phone, visit_date, duration_minutes, visit_type,
                    notes, source, special_requirements
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const visitValues = [
                eventResult.insertId, appartement_id, visitor_name, visitor_email || null,
                visitor_phone || null, visit_date, duration_minutes || 30,
                visit_type || 'first_visit', notes || null, source || 'website',
                special_requirements || null
            ];

            db.query(visitQuery, visitValues, (err2, visitResult) => {
                if (err2) {
                    console.error('Erreur création détails visite:', err2);
                    // Supprimer l'événement créé en cas d'erreur
                    db.query('DELETE FROM calendar_events WHERE id = ?', [eventResult.insertId]);
                    return res.status(500).json({ success: false, message: 'Erreur serveur' });
                }

                res.json({ 
                    success: true, 
                    message: 'Visite programmée avec succès',
                    event_id: eventResult.insertId,
                    visit_id: visitResult.insertId
                });
            });
        });
    });
});

// GET - Récupérer les visites d'un appartement
app.get('/calendar/visits/:apartmentId', authenticateToken, (req, res) => {
    const { apartmentId } = req.params;
    const userId = req.user.userId;

    // Vérifier ownership
    db.query('SELECT id FROM appartements WHERE id = ? AND utilisateur_id = ?', [apartmentId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ success: false, message: 'Appartement non trouvé' });
        }

        const query = `
            SELECT 
                v.*,
                ce.title as event_title,
                ce.status as event_status,
                a.titre as apartment_title
            FROM apartment_visits v
            JOIN calendar_events ce ON v.calendar_event_id = ce.id
            JOIN appartements a ON v.appartement_id = a.id
            WHERE v.appartement_id = ?
            ORDER BY v.visit_date DESC
        `;

        db.query(query, [apartmentId], (err, visits) => {
            if (err) {
                console.error('Erreur récupération visites:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            res.json({ success: true, data: visits });
        });
    });
});
// ========================= ROUTES DE RÉINITIALISATION DE MOT DE PASSE =========================

// POST - Demander une réinitialisation de mot de passe
app.post('/auth/forgot-password', async (req, res) => {
    const { email, clientUrl } = req.body;
    const userIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';

    try {
        // Validation email
        if (!email || !email.includes('@')) {
            return res.status(400).json({ 
                success: false, 
                message: 'Adresse email invalide' 
            });
        }

        const emailLower = email.toLowerCase().trim();

        // Vérifier si l'utilisateur existe
        db.query('SELECT id, nom, prenom, email FROM utilisateurs WHERE email = ?', [emailLower], async (err, results) => {
            if (err) {
                console.error('Erreur recherche utilisateur:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            // Toujours retourner un succès pour éviter l'énumération d'emails
            const standardResponse = {
                success: true,
                message: 'Si cette adresse email existe dans notre système, vous recevrez un lien de réinitialisation.'
            };

            if (results.length === 0) {
                console.log('Tentative de reset pour email inexistant:', emailLower);
                return res.json(standardResponse);
            }

            const user = results[0];

            // Vérifier les limites de demande (max 3 par heure)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            db.query(
                'SELECT COUNT(*) as count FROM password_resets WHERE email = ? AND created_at > ?',
                [emailLower, oneHourAgo],
                async (err, countResults) => {
                    if (err) {
                        console.error('Erreur vérification limite:', err);
                        return res.status(500).json({ success: false, message: 'Erreur serveur' });
                    }

                    if (countResults[0].count >= 3) {
                        console.log('Limite de demandes atteinte pour:', emailLower);
                        return res.status(429).json({
                            success: false,
                            message: 'Trop de demandes de réinitialisation. Réessayez dans 1 heure.',
                            rateLimited: true
                        });
                    }

                    // Générer le token et l'URL
                    const resetToken = generateResetToken();
                    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure
                    const baseUrl = clientUrl || `${req.protocol}://${req.get('host')}`;
                    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(emailLower)}`;

                    // Supprimer les anciens tokens pour cet email
                    db.query('DELETE FROM password_resets WHERE email = ?', [emailLower], (err) => {
                        if (err) console.error('Erreur suppression anciens tokens:', err);
                    });

                    // Sauvegarder le nouveau token
                    const insertQuery = `
                        INSERT INTO password_resets (email, token, user_id, expires_at, ip_address, user_agent)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;

                    db.query(insertQuery, [emailLower, resetToken, user.id, expiresAt, userIP, userAgent], async (err) => {
                        if (err) {
                            console.error('Erreur sauvegarde token:', err);
                            return res.status(500).json({ success: false, message: 'Erreur serveur' });
                        }

                        // Envoyer l'email
                        const emailResult = await sendPasswordResetEmail(emailLower, resetUrl, user.prenom);
                        
                        if (emailResult.success) {
                            console.log('Email de réinitialisation envoyé à:', emailLower);
                            res.json(standardResponse);
                        } else {
                            console.error('Erreur envoi email à:', emailLower, emailResult.error);
                            res.status(500).json({
                                success: false,
                                message: 'Erreur lors de l\'envoi de l\'email'
                            });
                        }
                    });
                }
            );
        });
    } catch (error) {
        console.error('Erreur forgot password:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// POST - Valider un token de réinitialisation
app.post('/auth/validate-reset-token', async (req, res) => {
    const { token, email } = req.body;

    try {
        if (!token || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Token et email requis' 
            });
        }

        const emailLower = email.toLowerCase().trim();

        // Vérifier le token
        const query = `
            SELECT pr.*, u.prenom, u.nom 
            FROM password_resets pr
            JOIN utilisateurs u ON pr.user_id = u.id
            WHERE pr.token = ? AND pr.email = ? AND pr.expires_at > NOW() AND pr.used = FALSE
        `;

        db.query(query, [token, emailLower], (err, results) => {
            if (err) {
                console.error('Erreur validation token:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            if (results.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Token invalide ou expiré',
                    invalid: true
                });
            }

            const tokenData = results[0];
            const timeRemaining = Math.max(0, Math.floor((new Date(tokenData.expires_at) - new Date()) / 1000 / 60));

            res.json({ 
                success: true, 
                message: 'Token valide',
                data: {
                    email: emailLower,
                    user_name: `${tokenData.prenom} ${tokenData.nom}`,
                    expires_in_minutes: timeRemaining
                }
            });
        });
    } catch (error) {
        console.error('Erreur validate reset token:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// POST - Réinitialiser le mot de passe avec token
app.post('/auth/reset-password', async (req, res) => {
    const { token, email, newPassword, confirmPassword } = req.body;

    try {
        // Validations
        if (!token || !email || !newPassword || !confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tous les champs sont requis' 
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Les mots de passe ne correspondent pas' 
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ 
                success: false, 
                message: 'Le mot de passe doit contenir au moins 8 caractères' 
            });
        }

        const emailLower = email.toLowerCase().trim();

        // Vérifier le token
        const query = `
            SELECT pr.*, u.id as user_id 
            FROM password_resets pr
            JOIN utilisateurs u ON pr.user_id = u.id
            WHERE pr.token = ? AND pr.email = ? AND pr.expires_at > NOW() AND pr.used = FALSE
        `;

        db.query(query, [token, emailLower], async (err, results) => {
            if (err) {
                console.error('Erreur vérification token reset:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            if (results.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Token invalide ou expiré',
                    invalid: true
                });
            }

            const tokenData = results[0];

            try {
                // Hasher le nouveau mot de passe
                const hashedPassword = await bcrypt.hash(newPassword, 12);

                // Mettre à jour le mot de passe
                db.query(
                    'UPDATE utilisateurs SET password = ?, date_modification = CURRENT_TIMESTAMP WHERE id = ?',
                    [hashedPassword, tokenData.user_id],
                    (err, updateResult) => {
                        if (err) {
                            console.error('Erreur mise à jour mot de passe:', err);
                            return res.status(500).json({ success: false, message: 'Erreur serveur' });
                        }

                        // Marquer le token comme utilisé
                        db.query(
                            'UPDATE password_resets SET used = TRUE, used_at = CURRENT_TIMESTAMP WHERE id = ?',
                            [tokenData.id],
                            (err) => {
                                if (err) {
                                    console.error('Erreur marquage token utilisé:', err);
                                }
                            }
                        );

                        // Invalider tous les autres tokens pour cet utilisateur
                        db.query(
                            'UPDATE password_resets SET used = TRUE WHERE email = ? AND id != ?',
                            [emailLower, tokenData.id],
                            (err) => {
                                if (err) {
                                    console.error('Erreur invalidation autres tokens:', err);
                                }
                            }
                        );

                        console.log('Mot de passe réinitialisé pour:', emailLower);

                        res.json({ 
                            success: true, 
                            message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' 
                        });
                    }
                );
            } catch (hashError) {
                console.error('Erreur hashage mot de passe:', hashError);
                res.status(500).json({ success: false, message: 'Erreur serveur' });
            }
        });
    } catch (error) {
        console.error('Erreur reset password:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// POST - Changer le mot de passe (utilisateur connecté)
app.post('/auth/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.userId;

    try {
        // Validations
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tous les champs sont requis' 
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Les nouveaux mots de passe ne correspondent pas' 
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ 
                success: false, 
                message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' 
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Le nouveau mot de passe doit être différent de l\'ancien' 
            });
        }

        // Récupérer l'utilisateur actuel
        db.query('SELECT password, email FROM utilisateurs WHERE id = ?', [userId], async (err, results) => {
            if (err || results.length === 0) {
                return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
            }

            const user = results[0];

            // Vérifier le mot de passe actuel
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Mot de passe actuel incorrect' 
                });
            }

            try {
                // Hasher le nouveau mot de passe
                const hashedNewPassword = await bcrypt.hash(newPassword, 12);

                // Mettre à jour le mot de passe
                db.query(
                    'UPDATE utilisateurs SET password = ?, date_modification = CURRENT_TIMESTAMP WHERE id = ?',
                    [hashedNewPassword, userId],
                    (err, result) => {
                        if (err) {
                            console.error('Erreur mise à jour mot de passe:', err);
                            return res.status(500).json({ success: false, message: 'Erreur serveur' });
                        }

                        console.log('Mot de passe changé pour utilisateur:', user.email);

                        res.json({ 
                            success: true, 
                            message: 'Mot de passe modifié avec succès' 
                        });
                    }
                );
            } catch (hashError) {
                console.error('Erreur hashage nouveau mot de passe:', hashError);
                res.status(500).json({ success: false, message: 'Erreur serveur' });
            }
        });
    } catch (error) {
        console.error('Erreur change password:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ========================= ROUTE DEBUG POUR TOKENS =========================

// GET - Voir les tokens actifs (debug uniquement)
app.get('/debug/reset-tokens', authenticateToken, (req, res) => {
    // Seulement pour debug - à supprimer en production
    db.query(`
        SELECT 
            pr.email,
            pr.token,
            pr.expires_at,
            pr.used,
            pr.created_at,
            u.prenom,
            u.nom
        FROM password_resets pr
        JOIN utilisateurs u ON pr.user_id = u.id
        WHERE pr.expires_at > NOW()
        ORDER BY pr.created_at DESC
    `, (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
        
        res.json({ success: true, data: results });
    });
});

// POST - Première étape : envoyer le code de vérification
app.post('/auth/login-request', async (req, res) => {
    const { email, password } = req.body;
    const userIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';

    try {
        // Vérifier les credentials
        db.query('SELECT * FROM utilisateurs WHERE email = ?', [email], async (err, results) => {
            if (err) {
                console.error('Erreur recherche utilisateur:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            if (results.length === 0) {
                return res.status(400).json({ success: false, message: 'Email ou mot de passe incorrect' });
            }

            const user = results[0];

            // Vérifier le mot de passe
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(400).json({ success: false, message: 'Email ou mot de passe incorrect' });
            }

            // Générer et sauvegarder le code de vérification
            const verificationCode = generateVerificationCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            // Supprimer les anciens codes pour cet utilisateur
            db.query('DELETE FROM email_verifications WHERE email = ?', [email], (err) => {
                if (err) console.error('Erreur suppression anciens codes:', err);
            });

            // Insérer le nouveau code
            const insertQuery = `
                INSERT INTO email_verifications (email, code, user_id, expires_at, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            db.query(insertQuery, [email, verificationCode, user.id, expiresAt, userIP, userAgent], async (err) => {
                if (err) {
                    console.error('Erreur sauvegarde code:', err);
                    return res.status(500).json({ success: false, message: 'Erreur serveur' });
                }

                // Envoyer l'email
                const emailResult = await sendVerificationEmail(email, verificationCode, user.prenom);
                
                if (emailResult.success) {
                    res.json({
                        success: true,
                        message: 'Code de vérification envoyé par email',
                        email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Email masqué
                        expiresIn: 600 // 10 minutes en secondes
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        message: 'Erreur lors de l\'envoi de l\'email de vérification',
                        error: emailResult.error
                    });
                }
            });
        });
    } catch (error) {
        console.error('Erreur login request:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// POST - Deuxième étape : vérifier le code et connecter
app.post('/auth/verify-code', async (req, res) => {
    const { email, code, rememberMe } = req.body;
    const userIP = req.ip || req.connection.remoteAddress;

    try {
        // Récupérer et vérifier le code
        const verifyQuery = `
            SELECT ev.*, u.* 
            FROM email_verifications ev
            JOIN utilisateurs u ON ev.user_id = u.id
            WHERE ev.email = ? AND ev.code = ? AND ev.expires_at > NOW() AND ev.verified = FALSE
            ORDER BY ev.created_at DESC
            LIMIT 1
        `;

        db.query(verifyQuery, [email, code], (err, results) => {
            if (err) {
                console.error('Erreur vérification code:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            if (results.length === 0) {
                // Incrémenter les tentatives
                db.query(
                    'UPDATE email_verifications SET attempts = attempts + 1 WHERE email = ? AND code = ?',
                    [email, code]
                );
                
                return res.status(400).json({ 
                    success: false, 
                    message: 'Code incorrect ou expiré'
                });
            }

            const verification = results[0];

            // Vérifier le nombre de tentatives (max 3)
            if (verification.attempts >= 3) {
                return res.status(400).json({
                    success: false,
                    message: 'Trop de tentatives. Demandez un nouveau code.',
                    tooManyAttempts: true
                });
            }

            // Marquer comme vérifié
            db.query(
                'UPDATE email_verifications SET verified = TRUE, verified_at = NOW() WHERE id = ?',
                [verification.id],
                (err) => {
                    if (err) {
                        console.error('Erreur mise à jour vérification:', err);
                        return res.status(500).json({ success: false, message: 'Erreur serveur' });
                    }

                    // Mettre à jour la dernière connexion
                    db.query(
                        'UPDATE utilisateurs SET derniere_connexion = CURRENT_TIMESTAMP WHERE id = ?',
                        [verification.user_id]
                    );

                    // Générer le token JWT
                    const tokenExpiry = rememberMe ? '30d' : '7d';
                    const token = jwt.sign(
                        { userId: verification.user_id, email: verification.email },
                        JWT_SECRET,
                        { expiresIn: tokenExpiry }
                    );

                    // Retourner les données utilisateur
                    const { password, code: _, expires_at, created_at, verified_at, ...userWithoutPassword } = verification;

                    res.json({
                        success: true,
                        message: 'Connexion réussie',
                        user: {
                            id: verification.user_id,
                            nom: verification.nom,
                            prenom: verification.prenom,
                            email: verification.email,
                            telephone: verification.telephone,
                            entreprise: verification.entreprise,
                            devise: verification.devise,
                            langue: verification.langue,
                            notifications_email: verification.notifications_email,
                            notifications_retards: verification.notifications_retards,
                            sauvegarde_auto: verification.sauvegarde_auto,
                            taux_tva: verification.taux_tva,
                            frais_gestion: verification.frais_gestion,
                            commission_agence: verification.commission_agence,
                            derniere_connexion: verification.derniere_connexion,
                            gocardless_requisition_id: verification.gocardless_requisition_id
                        },
                        token
                    });
                }
            );
        });
    } catch (error) {
        console.error('Erreur verify code:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// POST - Renvoyer un code de vérification
app.post('/auth/resend-code', async (req, res) => {
    const { email } = req.body;
    const userIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';

    try {
        // Vérifier que l'utilisateur existe
        db.query('SELECT * FROM utilisateurs WHERE email = ?', [email], async (err, results) => {
            if (err || results.length === 0) {
                return res.status(400).json({ success: false, message: 'Utilisateur non trouvé' });
            }

            const user = results[0];

            // Vérifier les limites de renvoi (max 3 codes par heure)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            db.query(
                'SELECT COUNT(*) as count FROM email_verifications WHERE email = ? AND created_at > ?',
                [email, oneHourAgo],
                async (err, countResults) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Erreur serveur' });
                    }

                    if (countResults[0].count >= 3) {
                        return res.status(429).json({
                            success: false,
                            message: 'Trop de demandes. Réessayez dans 1 heure.',
                            rateLimited: true
                        });
                    }

                    // Générer nouveau code
                    const verificationCode = generateVerificationCode();
                    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

                    // Supprimer les anciens codes
                    db.query('DELETE FROM email_verifications WHERE email = ?', [email]);

                    // Insérer le nouveau code
                    const insertQuery = `
                        INSERT INTO email_verifications (email, code, user_id, expires_at, ip_address, user_agent)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;

                    db.query(insertQuery, [email, verificationCode, user.id, expiresAt, userIP, userAgent], async (err) => {
                        if (err) {
                            return res.status(500).json({ success: false, message: 'Erreur serveur' });
                        }

                        // Envoyer l'email
                        const emailResult = await sendVerificationEmail(email, verificationCode, user.prenom);
                        
                        if (emailResult.success) {
                            res.json({
                                success: true,
                                message: 'Nouveau code de vérification envoyé',
                                expiresIn: 600
                            });
                        } else {
                            res.status(500).json({
                                success: false,
                                message: 'Erreur lors de l\'envoi de l\'email'
                            });
                        }
                    });
                }
            );
        });
    } catch (error) {
        console.error('Erreur resend code:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ========================= ROUTE ADMIN 2FA =========================

// GET - Statistiques 2FA (pour admin)
app.get('/admin/2fa-stats', authenticateToken, (req, res) => {
    const statsQuery = `
        SELECT 
            COUNT(*) as total_verifications,
            COUNT(CASE WHEN verified = TRUE THEN 1 END) as successful_verifications,
            COUNT(CASE WHEN verified = FALSE AND expires_at < NOW() THEN 1 END) as expired_verifications,
            AVG(attempts) as avg_attempts,
            DATE(created_at) as date,
            COUNT(DISTINCT email) as unique_users
        FROM email_verifications 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
    `;

    db.query(statsQuery, (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        res.json({ success: true, data: results });
    });
});

// ========================= ROUTES AUTHENTIFICATION =========================

// POST - Inscription
app.post('/auth/register', async (req, res) => {
    const { nom, prenom, email, telephone, entreprise, password } = req.body;

    try {
        // Vérifier si l'email existe déjà
        db.query('SELECT id FROM utilisateurs WHERE email = ?', [email], async (err, results) => {
            if (err) {
                console.error('Erreur vérification email:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            if (results.length > 0) {
                return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé' });
            }

            // Hasher le mot de passe
            const hashedPassword = await bcrypt.hash(password, 10);

            // Créer l'utilisateur
            const query = `
                INSERT INTO utilisateurs (nom, prenom, email, telephone, entreprise, password)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            db.query(query, [nom, prenom, email, telephone || null, entreprise || null, hashedPassword], (err, result) => {
                if (err) {
                    console.error('Erreur création utilisateur:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors de la création du compte' });
                }

                // Générer un token JWT
                const token = jwt.sign(
                    { userId: result.insertId, email },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );

                // Retourner les données utilisateur sans le mot de passe
                const user = {
                    id: result.insertId,
                    nom,
                    prenom,
                    email,
                    telephone,
                    entreprise
                };

                res.json({
                    success: true,
                    message: 'Compte créé avec succès',
                    user,
                    token
                });
            });
        });
    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// POST - Connexion
app.post('/auth/login', async (req, res) => {
    const { email, password, rememberMe } = req.body;

    try {
        db.query('SELECT * FROM utilisateurs WHERE email = ?', [email], async (err, results) => {
            if (err) {
                console.error('Erreur recherche utilisateur:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            if (results.length === 0) {
                return res.status(400).json({ success: false, message: 'Email ou mot de passe incorrect' });
            }

            const user = results[0];

            // Vérifier le mot de passe
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return res.status(400).json({ success: false, message: 'Email ou mot de passe incorrect' });
            }

            // Mettre à jour la dernière connexion
            db.query('UPDATE utilisateurs SET derniere_connexion = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

            // Générer un token JWT
            const tokenExpiry = rememberMe ? '30d' : '7d';
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: tokenExpiry }
            );

            // Retourner les données utilisateur sans le mot de passe
            const { password: _, ...userWithoutPassword } = user;

            res.json({
                success: true,
                message: 'Connexion réussie',
                user: userWithoutPassword,
                token
            });
        });
    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// GET - Vérifier le token
app.get('/auth/verify', authenticateToken, (req, res) => {
    db.query('SELECT * FROM utilisateurs WHERE id = ?', [req.user.userId], (err, results) => {
        if (err) {
            console.error('Erreur vérification utilisateur:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
        }

        const { password, ...userWithoutPassword } = results[0];
        res.json({ success: true, user: userWithoutPassword });
    });
});

// PUT - Mettre à jour le profil
app.put('/auth/profile', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { current_password, new_password, ...updateData } = req.body;

    try {
        // Si changement de mot de passe
        if (current_password && new_password) {
            // Vérifier le mot de passe actuel
            db.query('SELECT password FROM utilisateurs WHERE id = ?', [userId], async (err, results) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Erreur serveur' });
                }

                const isCurrentPasswordValid = await bcrypt.compare(current_password, results[0].password);
                if (!isCurrentPasswordValid) {
                    return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect' });
                }

                // Hasher le nouveau mot de passe
                const hashedNewPassword = await bcrypt.hash(new_password, 10);
                updateData.password = hashedNewPassword;
                
                updateUserProfile(userId, updateData, res);
            });
        } else {
            updateUserProfile(userId, updateData, res);
        }
    } catch (error) {
        console.error('Erreur mise à jour profil:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// Fonction helper pour mettre à jour le profil
const updateUserProfile = (userId, updateData, res) => {
    const fields = [];
    const values = [];

    Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    });

    if (fields.length === 0) {
        return res.status(400).json({ success: false, message: 'Aucune donnée à mettre à jour' });
    }

    values.push(userId);
    const query = `UPDATE utilisateurs SET ${fields.join(', ')} WHERE id = ?`;

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Erreur mise à jour utilisateur:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
        }

        // Récupérer les données utilisateur mises à jour
        db.query('SELECT * FROM utilisateurs WHERE id = ?', [userId], (err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            const { password, ...userWithoutPassword } = results[0];
            res.json({ 
                success: true, 
                message: 'Profil mis à jour avec succès',
                user: userWithoutPassword 
            });
        });
    });
};

// ========================= CONFIGURATION GOCARDLESS =========================
const GOCARDLESS_SECRET_ID = 'bca45e51-55f3-4213-acc8-e698a0e06bf8'; // À récupérer depuis GoCardless portal
const GOCARDLESS_SECRET_KEY = '271e3e36f197655985677eb6b0ca815359ace234425051eeec15a88b1412d53844247081f83c562a058e4ba7e605b9775d55e1b4371a8a4ef80192cc9d96079d'; // À récupérer depuis GoCardless portal
const GOCARDLESS_BASE_URL = 'https://bankaccountdata.gocardless.com/api/v2';

// Fonction pour obtenir le token d'accès GoCardless
const getGoCardlessToken = async () => {
    try {
        const response = await fetch(`${GOCARDLESS_BASE_URL}/token/new/`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                secret_id: GOCARDLESS_SECRET_ID,
                secret_key: GOCARDLESS_SECRET_KEY
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`GoCardless token error: ${data.detail || response.status}`);
        }

        return data.access;
    } catch (error) {
        console.error('Erreur obtention token GoCardless:', error);
        throw error;
    }
};

// ========================= ROUTES GOCARDLESS =========================

const addCacheColumns = `
ALTER TABLE utilisateurs 
ADD COLUMN IF NOT EXISTS gocardless_account_details JSON,
ADD COLUMN IF NOT EXISTS gocardless_account_balances JSON,
ADD COLUMN IF NOT EXISTS gocardless_last_refresh TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS gocardless_accounts_list JSON;
`;

const getCachedAccountData = async (userId, dataType, accountId = null, forceRefresh = false) => {
    try {
        // Convertir db en promisifié pour async/await
        const query = util.promisify(db.query).bind(db);
        
        const cacheQuery = `
            SELECT 
                gocardless_account_details,
                gocardless_account_balances,
                gocardless_accounts_list,
                gocardless_last_refresh,
                gocardless_requisition_id
            FROM utilisateurs 
            WHERE id = ?
        `;
        
        const cacheResult = await query(cacheQuery, [userId]);
        
        if (!cacheResult.length) {
            throw new Error('Utilisateur non trouvé');
        }

        const cachedData = cacheResult[0];
        const lastRefresh = cachedData.gocardless_last_refresh ? new Date(cachedData.gocardless_last_refresh) : null;
        const now = new Date();
        const hoursSinceRefresh = lastRefresh ? (now - lastRefresh) / (1000 * 60 * 60) : 999;

        // Utiliser le cache si récent et pas de force refresh
        const cacheThreshold = 24; // 24h
        
        if (!forceRefresh && hoursSinceRefresh < cacheThreshold) {
            let cachedValue;
            switch (dataType) {
                case 'accounts':
                    cachedValue = cachedData.gocardless_accounts_list ? JSON.parse(cachedData.gocardless_accounts_list) : null;
                    break;
                case 'details':
                    cachedValue = cachedData.gocardless_account_details ? JSON.parse(cachedData.gocardless_account_details) : null;
                    break;
                case 'balances':
                    cachedValue = cachedData.gocardless_account_balances ? JSON.parse(cachedData.gocardless_account_balances) : null;
                    break;
            }

            if (cachedValue) {
                console.log(`📦 Cache hit pour ${dataType} (${Math.round(hoursSinceRefresh)}h)`);
                return {
                    data: cachedValue,
                    fromCache: true,
                    age: Math.round(hoursSinceRefresh * 60), // en minutes
                    lastRefresh: lastRefresh.toLocaleString('fr-FR')
                };
            }
        }

        // Essayer l'API
        console.log(`🌐 Appel API pour ${dataType}...`);
        
        try {
            const accessToken = await getGoCardlessToken();
            let apiData;
            let updateFields = { gocardless_last_refresh: now };

            switch (dataType) {
                case 'accounts':
                    const requisitionResponse = await fetch(`${GOCARDLESS_BASE_URL}/requisitions/${cachedData.gocardless_requisition_id}/`, {
                        method: 'GET',
                        headers: {
                            'accept': 'application/json',
                            'Authorization': `Bearer ${accessToken}`
                        }
                    });
                    
                    if (!requisitionResponse.ok) {
                        const errorData = await requisitionResponse.json();
                        throw new Error(`API Error: ${errorData.detail || requisitionResponse.status}`);
                    }
                    
                    const requisitionData = await requisitionResponse.json();
                    apiData = requisitionData.accounts || [];
                    updateFields.gocardless_accounts_list = JSON.stringify(apiData);
                    break;
                    
                case 'details':
                    const detailsResponse = await fetch(`${GOCARDLESS_BASE_URL}/accounts/${accountId}/details/`, {
                        method: 'GET',
                        headers: {
                            'accept': 'application/json',
                            'Authorization': `Bearer ${accessToken}`
                        }
                    });
                    
                    if (!detailsResponse.ok) {
                        const errorData = await detailsResponse.json();
                        throw new Error(`API Error: ${errorData.detail || detailsResponse.status}`);
                    }
                    
                    apiData = await detailsResponse.json();
                    updateFields.gocardless_account_details = JSON.stringify(apiData);
                    break;
                    
                case 'balances':
                    const balancesResponse = await fetch(`${GOCARDLESS_BASE_URL}/accounts/${accountId}/balances/`, {
                        method: 'GET',
                        headers: {
                            'accept': 'application/json',
                            'Authorization': `Bearer ${accessToken}`
                        }
                    });
                    
                    if (!balancesResponse.ok) {
                        const errorData = await balancesResponse.json();
                        throw new Error(`API Error: ${errorData.detail || balancesResponse.status}`);
                    }
                    
                    apiData = await balancesResponse.json();
                    updateFields.gocardless_account_balances = JSON.stringify(apiData);
                    break;
            }

            // Mettre à jour le cache
            const updateQuery = `UPDATE utilisateurs SET ${Object.keys(updateFields).map(key => `${key} = ?`).join(', ')} WHERE id = ?`;
            const updateValues = [...Object.values(updateFields), userId];
            
            await query(updateQuery, updateValues);
            
            console.log(`💾 Cache mis à jour pour ${dataType}`);
            
            return {
                data: apiData,
                fromCache: false,
                age: 0,
                lastRefresh: now.toLocaleString('fr-FR')
            };

        } catch (error) {
            console.error(`❌ Erreur API pour ${dataType}:`, error.message);
            
            // Fallback vers cache même expiré
            let fallbackData;
            switch (dataType) {
                case 'accounts':
                    fallbackData = cachedData.gocardless_accounts_list ? JSON.parse(cachedData.gocardless_accounts_list) : null;
                    break;
                case 'details':
                    fallbackData = cachedData.gocardless_account_details ? JSON.parse(cachedData.gocardless_account_details) : null;
                    break;
                case 'balances':
                    fallbackData = cachedData.gocardless_account_balances ? JSON.parse(cachedData.gocardless_account_balances) : null;
                    break;
            }

            if (fallbackData) {
                console.log(`📦 Utilisation cache expiré pour ${dataType}`);
                return {
                    data: fallbackData,
                    fromCache: true,
                    stale: true,
                    age: Math.round(hoursSinceRefresh * 60),
                    lastRefresh: lastRefresh ? lastRefresh.toLocaleString('fr-FR') : 'Inconnu',
                    error: error.message.includes('Rate limit') ? 'Limite API atteinte' : 'Erreur API'
                };
            }

            throw error;
        }

    } catch (error) {
        console.error(`❌ Erreur getCachedAccountData:`, error);
        throw error;
    }
};

// GET - Récupérer les institutions bancaires par pays
app.get('/gocardless/institutions/:country', authenticateToken, async (req, res) => {
    const { country } = req.params; // ex: 'FR' pour France
    
    try {
        const accessToken = await getGoCardlessToken();
        
        const response = await fetch(`${GOCARDLESS_BASE_URL}/institutions/?country=${country}`, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            return res.status(500).json({ 
                success: false, 
                message: 'Erreur récupération institutions', 
                error: data 
            });
        }

        res.json({
            success: true,
            data: data
        });
        
    } catch (error) {
        console.error('Erreur institutions GoCardless:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur', 
            error: error.message 
        });
    }
});

// POST - Créer un accord utilisateur final (optionnel)
app.post('/gocardless/agreements', authenticateToken, async (req, res) => {
    const { institution_id, max_historical_days, access_valid_for_days, access_scope } = req.body;
    
    try {
        const accessToken = await getGoCardlessToken();
        
        const agreementData = {
            institution_id: institution_id,
            max_historical_days: max_historical_days || 180,
            access_valid_for_days: access_valid_for_days || 30,
            access_scope: access_scope || ["balances", "details", "transactions"]
        };

        const response = await fetch(`${GOCARDLESS_BASE_URL}/agreements/enduser/`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(agreementData)
        });

        const data = await response.json();
        
        if (!response.ok) {
            return res.status(500).json({ 
                success: false, 
                message: 'Erreur création accord', 
                error: data 
            });
        }

        // Sauvegarder l'accord en base si nécessaire
        const userId = req.user.userId;
        const updateQuery = `
            UPDATE utilisateurs 
            SET gocardless_agreement_id = ?, gocardless_institution_id = ?
            WHERE id = ?
        `;
        
        db.query(updateQuery, [data.id, institution_id, userId], (err) => {
            if (err) {
                console.error('Erreur sauvegarde accord:', err);
            }
        });

        res.json({
            success: true,
            data: data
        });
        
    } catch (error) {
        console.error('Erreur création accord GoCardless:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur', 
            error: error.message 
        });
    }
});

// POST - Créer une réquisition (lien de connexion)
app.post('/gocardless/requisitions', authenticateToken, async (req, res) => {
    const { institution_id, agreement_id, reference, user_language } = req.body;
    const userId = req.user.userId;
    
    try {
        const accessToken = await getGoCardlessToken();
        
        const requisitionData = {
            redirect: `${req.protocol}://${req.get('host')}/gestion-locative/api/gocardless/callback`, // URL de retour
            institution_id: institution_id,
            reference: reference || `user_${userId}_${Date.now()}`,
            agreement: agreement_id, // Optionnel
            user_language: user_language || 'fr' // français par défaut
        };

        const response = await fetch(`${GOCARDLESS_BASE_URL}/requisitions/`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(requisitionData)
        });

        const data = await response.json();
        
        if (!response.ok) {
            return res.status(500).json({ 
                success: false, 
                message: 'Erreur création réquisition', 
                error: data 
            });
        }

        // Sauvegarder la réquisition en base
        const updateQuery = `
            UPDATE utilisateurs 
            SET gocardless_requisition_id = ?, gocardless_link = ?
            WHERE id = ?
        `;
        
        db.query(updateQuery, [data.id, data.link, userId], (err) => {
            if (err) {
                console.error('Erreur sauvegarde réquisition:', err);
            }
        });

        res.json({
            success: true,
            data: {
                requisition_id: data.id,
                link: data.link, // URL vers laquelle rediriger l'utilisateur
                redirect: data.redirect,
                status: data.status
            }
        });
        
    } catch (error) {
        console.error('Erreur création réquisition GoCardless:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur', 
            error: error.message 
        });
    }
});

// GET - Page de callback après authentification bancaire
app.get('/gocardless/callback', async (req, res) => {
    const { ref } = req.query; // référence de la réquisition
    
    try {
        // Rediriger vers le frontend avec le statut
        res.redirect(`/settings?tab=banking&status=success&ref=${ref}`);
        
    } catch (error) {
        console.error('Erreur callback GoCardless:', error);
        res.redirect(`/settings?tab=banking&status=error`);
    }
});

// ROUTE OPTIMISÉE: GET /gocardless/accounts
app.get('/gocardless/accounts', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const forceRefresh = req.query.refresh === 'true';
    
    try {
        // Récupérer les données en cache ou faire appel API
        const result = await getCachedAccountData(userId, 'accounts', null, forceRefresh);
        
        res.json({
            success: true,
            data: {
                accounts: result.data || [],
                metadata: {
                    fromCache: result.fromCache,
                    age: result.age || 0,
                    lastRefresh: result.lastRefresh,
                    stale: result.stale || false,
                    error: result.error || null
                }
            }
        });
        
    } catch (error) {
        console.error('Erreur récupération comptes GoCardless:', error);
        res.status(500).json({
            success: false,
            message: error.message.includes('Rate limit') 
                ? 'Limite de requêtes atteinte. Données mises à jour demain.'
                : 'Erreur lors de la récupération des comptes',
            rateLimitExceeded: error.message.includes('Rate limit')
        });
    }
});

// ROUTE OPTIMISÉE: GET /gocardless/accounts/:id/details  
app.get('/gocardless/accounts/:accountId/details', authenticateToken, async (req, res) => {
    const { accountId } = req.params;
    const userId = req.user.userId;
    const forceRefresh = req.query.refresh === 'true';
    
    try {
        const result = await getCachedAccountData(userId, 'details', accountId, forceRefresh);
        
        res.json({
            success: true,
            data: {
                ...result.data,
                metadata: {
                    fromCache: result.fromCache,
                    age: result.age || 0,
                    lastRefresh: result.lastRefresh,
                    stale: result.stale || false,
                    error: result.error || null
                }
            }
        });
        
    } catch (error) {
        console.error('Erreur détails compte GoCardless:', error);
        res.status(500).json({
            success: false,
            message: error.message.includes('Rate limit') 
                ? 'Limite de requêtes atteinte. Données en cache utilisées.'
                : 'Erreur serveur',
            rateLimitExceeded: error.message.includes('Rate limit')
        });
    }
});

// ROUTE OPTIMISÉE: GET /gocardless/accounts/:id/balances
app.get('/gocardless/accounts/:accountId/balances', authenticateToken, async (req, res) => {
    const { accountId } = req.params;
    const userId = req.user.userId;
    const forceRefresh = req.query.refresh === 'true';
    
    try {
        const result = await getCachedAccountData(userId, 'balances', accountId, forceRefresh);
        
        res.json({
            success: true,
            data: {
                balances: result.data?.balances || [],
                metadata: {
                    fromCache: result.fromCache,
                    age: result.age || 0,
                    lastRefresh: result.lastRefresh,
                    stale: result.stale || false,
                    error: result.error || null
                }
            }
        });
        
    } catch (error) {
        console.error('Erreur soldes compte GoCardless:', error);
        res.status(500).json({
            success: false,
            message: error.message.includes('Rate limit') 
                ? 'Limite de requêtes atteinte pour aujourd\'hui.'
                : 'Erreur serveur',
            rateLimitExceeded: error.message.includes('Rate limit')
        });
    }
});

// GET - Récupérer les transactions d'un compte
app.get('/gocardless/accounts/:accountId/transactions', authenticateToken, async (req, res) => {
    const { accountId } = req.params;
    const { date_from, date_to } = req.query;
    
    try {
        const accessToken = await getGoCardlessToken();
        
        let url = `${GOCARDLESS_BASE_URL}/accounts/${accountId}/transactions/`;
        const params = new URLSearchParams();
        if (date_from) params.append('date_from', date_from);
        if (date_to) params.append('date_to', date_to);
        if (params.toString()) url += `?${params.toString()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            return res.status(500).json({ 
                success: false, 
                message: 'Erreur récupération transactions', 
                error: data 
            });
        }

        res.json({
            success: true,
            data: data
        });
        
    } catch (error) {
        console.error('Erreur transactions GoCardless:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur', 
            error: error.message 
        });
    }
});

// DELETE - Supprimer une réquisition (déconnexion)
app.delete('/gocardless/requisitions/:requisitionId', authenticateToken, async (req, res) => {
    const { requisitionId } = req.params;
    const userId = req.user.userId;
    
    try {
        const accessToken = await getGoCardlessToken();
        
        const response = await fetch(`${GOCARDLESS_BASE_URL}/requisitions/${requisitionId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (response.ok || response.status === 404) {
            // Nettoyer les données GoCardless de l'utilisateur
            const updateQuery = `
                UPDATE utilisateurs 
                SET gocardless_requisition_id = NULL, 
                    gocardless_link = NULL, 
                    gocardless_agreement_id = NULL,
                    gocardless_institution_id = NULL
                WHERE id = ?
            `;
            
            db.query(updateQuery, [userId], (err) => {
                if (err) {
                    console.error('Erreur nettoyage données GoCardless:', err);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Erreur lors du nettoyage' 
                    });
                }
                
                res.json({
                    success: true,
                    message: 'Connexion bancaire supprimée avec succès'
                });
            });
        } else {
            const data = await response.json();
            res.status(500).json({ 
                success: false, 
                message: 'Erreur suppression réquisition', 
                error: data 
            });
        }
        
    } catch (error) {
        console.error('Erreur suppression réquisition GoCardless:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur', 
            error: error.message 
        });
    }
});

// ROUTE POUR FORCER LA SYNCHRONISATION
app.post('/gocardless/force-sync', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    
    try {
        console.log(`🔄 Synchronisation forcée demandée par utilisateur ${userId}`);
        
        // Forcer le refresh de tous les types de données
        const promises = [
            getCachedAccountData(userId, 'accounts', null, true),
        ];
        
        const results = await Promise.allSettled(promises);
        
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        
        if (successCount > 0) {
            res.json({
                success: true,
                message: `Synchronisation réussie (${successCount} types de données)`,
                data: {
                    syncedDataTypes: successCount,
                    timestamp: new Date().toLocaleString('fr-FR')
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Échec de la synchronisation - limite API atteinte',
                rateLimitExceeded: true
            });
        }
        
    } catch (error) {
        console.error('Erreur synchronisation forcée:', error);
        res.status(500).json({
            success: false,
            message: error.message.includes('Rate limit') 
                ? 'Limite de synchronisation atteinte. Réessayez demain.'
                : 'Erreur lors de la synchronisation',
            rateLimitExceeded: error.message.includes('Rate limit')
        });
    }
});

// ========================= AJOUT DE COLONNES GOCARDLESS EN BASE =========================

// Ajouter ces colonnes à la table utilisateurs
setTimeout(() => {
    const goCardlessColumns = [
        `ADD COLUMN IF NOT EXISTS gocardless_requisition_id VARCHAR(255)`,
        `ADD COLUMN IF NOT EXISTS gocardless_link VARCHAR(500)`,
        `ADD COLUMN IF NOT EXISTS gocardless_agreement_id VARCHAR(255)`,
        `ADD COLUMN IF NOT EXISTS gocardless_institution_id VARCHAR(255)`,
        `ADD COLUMN IF NOT EXISTS gocardless_last_sync TIMESTAMP NULL`
    ];

    goCardlessColumns.forEach(columnQuery => {
        db.query(`ALTER TABLE utilisateurs ${columnQuery}`, (err) => {
            if (err && !/Duplicate column/.test(err.message)) {
                console.error('Erreur ajout colonne GoCardless:', err.message);
            }
        });
    });
    console.log('✅ Colonnes GoCardless ajoutées à la table utilisateurs');
}, 4000);

setTimeout(() => {
    db.query(addCacheColumns, (err) => {
        if (err && !/Duplicate column/.test(err.message)) {
            console.error('Erreur ajout colonnes cache GoCardless:', err.message);
        } else {
            console.log('✅ Colonnes de cache GoCardless ajoutées');
        }
    });
}, 5000);


// ========================= ROUTES APPARTEMENTS =========================

// GET - Récupérer tous les appartements de l'utilisateur
app.get('/apartments', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    const query = `
        SELECT 
            a.*,
            l.nom as locataire_nom,
            l.prenom as locataire_prenom,
            loc.date_debut as location_debut,
            loc.date_fin as location_fin
        FROM appartements a
        LEFT JOIN locations loc ON a.id = loc.appartement_id AND loc.statut = 'active'
        LEFT JOIN locataires l ON loc.locataire_id = l.id
        WHERE a.utilisateur_id = ?
        ORDER BY a.date_creation DESC
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des appartements:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        const apartments = results.map(apartment => ({
            ...apartment,
            locataire_actuel: apartment.locataire_nom && apartment.locataire_prenom 
                ? `${apartment.locataire_prenom} ${apartment.locataire_nom}` 
                : null
        }));

        res.json(apartments);
    });
});

// GET - Récupérer un appartement par ID
app.get('/apartments/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const query = `
        SELECT 
            a.*,
            l.nom as locataire_nom,
            l.prenom as locataire_prenom,
            l.email as locataire_email,
            l.telephone as locataire_telephone,
            loc.date_debut as location_debut,
            loc.date_fin as location_fin,
            loc.loyer_mensuel,
            loc.charges_mensuelles
        FROM appartements a
        LEFT JOIN locations loc ON a.id = loc.appartement_id AND loc.statut = 'active'
        LEFT JOIN locataires l ON loc.locataire_id = l.id
        WHERE a.id = ? AND a.utilisateur_id = ?
    `;

    db.query(query, [id, userId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération de l\'appartement:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Appartement non trouvé' });
        }

        const apartment = results[0];
        apartment.locataire_actuel = apartment.locataire_nom && apartment.locataire_prenom 
            ? `${apartment.locataire_prenom} ${apartment.locataire_nom}` 
            : null;

        res.json(apartment);
    });
});

// POST - Créer un nouvel appartement
app.post('/apartments', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const {
        titre, adresse_complete, surface, nb_pieces, nb_chambres,
        prix_loyer, charges, depot_garantie, statut, description
    } = req.body;

    // Extraction du code postal et de la ville depuis l'adresse
    const adresseMatch = adresse_complete.match(/(\d{5})\s+(.+)$/);
    const code_postal = adresseMatch ? adresseMatch[1] : '';
    const ville = adresseMatch ? adresseMatch[2] : '';

    const query = `
        INSERT INTO appartements (
            utilisateur_id, titre, adresse_complete, code_postal, ville, surface, 
            nb_pieces, nb_chambres, prix_loyer, charges, depot_garantie, 
            statut, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [
        userId, titre, adresse_complete, code_postal, ville, surface,
        nb_pieces, nb_chambres, prix_loyer, charges, depot_garantie,
        statut, description
    ], (err, result) => {
        if (err) {
            console.error('Erreur lors de la création de l\'appartement:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        res.json({ 
            success: true, 
            message: 'Appartement créé avec succès',
            id: result.insertId 
        });
    });
});

// PUT - Modifier un appartement
app.put('/apartments/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const {
        titre, adresse_complete, surface, nb_pieces, nb_chambres,
        prix_loyer, charges, depot_garantie, statut, description
    } = req.body;

    const adresseMatch = adresse_complete.match(/(\d{5})\s+(.+)$/);
    const code_postal = adresseMatch ? adresseMatch[1] : '';
    const ville = adresseMatch ? adresseMatch[2] : '';

    const query = `
        UPDATE appartements SET
            titre = ?, adresse_complete = ?, code_postal = ?, ville = ?,
            surface = ?, nb_pieces = ?, nb_chambres = ?, prix_loyer = ?,
            charges = ?, depot_garantie = ?, statut = ?, description = ?
        WHERE id = ? AND utilisateur_id = ?
    `;

    db.query(query, [
        titre, adresse_complete, code_postal, ville, surface,
        nb_pieces, nb_chambres, prix_loyer, charges, depot_garantie,
        statut, description, id, userId
    ], (err, result) => {
        if (err) {
            console.error('Erreur lors de la modification de l\'appartement:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Appartement non trouvé' });
        }

        res.json({ success: true, message: 'Appartement modifié avec succès' });
    });
});

// DELETE - Supprimer un appartement
app.delete('/apartments/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    db.query('DELETE FROM appartements WHERE id = ? AND utilisateur_id = ?', [id, userId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la suppression de l\'appartement:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Appartement non trouvé' });
        }

        res.json({ success: true, message: 'Appartement supprimé avec succès' });
    });
});

// GET - Vérifier la disponibilité d'un appartement
app.get('/apartments/:id/availability', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { date_debut, date_fin } = req.query;
    const userId = req.user.userId;

    // Vérifier ownership
    db.query('SELECT id FROM appartements WHERE id = ? AND utilisateur_id = ?', [id, userId], (err, checkResults) => {
        if (err || checkResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Appartement non trouvé' });
        }

        let availabilityQuery = `
            SELECT COUNT(*) as conflicting_locations
            FROM locations 
            WHERE appartement_id = ? 
            AND statut = 'active'
        `;

        let queryParams = [id];

        // Si des dates sont fournies, vérifier les conflits de dates
        if (date_debut) {
            availabilityQuery += ` AND (
                (date_debut <= ? AND (date_fin IS NULL OR date_fin >= ?))
            )`;
            queryParams.push(date_debut, date_debut);

            if (date_fin) {
                availabilityQuery += ` OR (
                    date_debut <= ? AND (date_fin IS NULL OR date_fin >= ?)
                )`;
                queryParams.push(date_fin, date_fin);
            }
        }

        db.query(availabilityQuery, queryParams, (err2, results) => {
            if (err2) {
                console.error('Erreur vérification disponibilité:', err2);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            const isAvailable = results[0].conflicting_locations === 0;
            res.json({ 
                success: true, 
                data: { 
                    available: isAvailable,
                    conflicting_locations: results[0].conflicting_locations
                }
            });
        });
    });
});

// GET - Récupérer les locataires d'un appartement (CORRIGÉ)
app.get('/apartments/:id/tenants', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log('🔍 Récupération locataires pour appartement:', id, 'utilisateur:', userId);

    // Vérifier que l'appartement appartient à l'utilisateur
    const checkQuery = 'SELECT id FROM appartements WHERE id = ? AND utilisateur_id = ?';
    db.query(checkQuery, [id, userId], (err, checkResults) => {
        if (err || checkResults.length === 0) {
            console.log('❌ Appartement non trouvé ou non autorisé');
            return res.status(404).json([]);
        }

        const query = `
            SELECT 
                l.*,
                loc.id as location_id,
                loc.date_debut,
                loc.date_fin,
                loc.statut as location_statut,
                loc.loyer_mensuel,
                loc.charges_mensuelles,
                loc.depot_garantie
            FROM locataires l
            JOIN locations loc ON l.id = loc.locataire_id
            WHERE loc.appartement_id = ?
            ORDER BY loc.date_debut DESC
        `;

        console.log('🔍 Query locataires:', query);
        console.log('🔍 Params:', [id]);

        db.query(query, [id], (err, results) => {
            if (err) {
                console.error('❌ Erreur lors de la récupération des locataires:', err);
                return res.json([]); // Retourner array vide au lieu d'erreur
            }

            console.log('✅ Locataires trouvés:', results.length);
            console.log('📊 Données locataires:', results);

            // Retourner directement l'array
            res.json(results);
        });
    });
});

// GET - Récupérer les documents d'un appartement (CORRIGÉ)
app.get('/apartments/:id/documents', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log('🔍 Récupération documents pour appartement:', id);

    // Vérifier ownership
    db.query('SELECT id FROM appartements WHERE id = ? AND utilisateur_id = ?', [id, userId], (err, checkResults) => {
        if (err || checkResults.length === 0) {
            console.log('❌ Appartement non trouvé pour documents');
            // Retourner un objet avec success et data vide au lieu d'un array vide
            return res.json({ success: true, data: [] });
        }

        const query = `
            SELECT 
                id,
                nom_document,
                type_document,
                chemin_fichier,
                url,
                description,
                DATE_FORMAT(date_upload, '%Y-%m-%d') AS date_upload
            FROM documents 
            WHERE appartement_id = ? 
            ORDER BY date_upload DESC
        `;

        console.log('🔍 Query documents:', query);

        db.query(query, [id], (err, results) => {
            if (err) {
                console.error('❌ Erreur lors de la récupération des documents:', err);
                // Retourner un objet avec success au lieu d'un array vide
                return res.json({ success: false, data: [], message: 'Erreur serveur' });
            }

            console.log('✅ Documents trouvés:', results.length);

            const documents = results.map(doc => ({
                ...doc,
                url: doc.url || `uploads/${doc.chemin_fichier.split('/').pop()}`
            }));

            console.log('📊 Documents formatés:', documents);
            
            // CORRECTION : Retourner un objet avec success et data
            // au lieu de retourner directement le tableau
            res.json({ 
                success: true, 
                data: documents 
            });
        });
    });
});

// GET - Récupérer les factures d'un appartement
app.get('/apartments/:id/invoices', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log('🔍 Récupération factures pour appartement:', id);

    // Vérifier ownership
    db.query('SELECT id FROM appartements WHERE id = ? AND utilisateur_id = ?', [id, userId], (err, checkResults) => {
        if (err || checkResults.length === 0) {
            console.log('❌ Appartement non trouvé pour factures');
            return res.json([]);
        }

        const query = `
            SELECT 
                id,
                type_facture,
                numero_facture,
                montant,
                DATE_FORMAT(date_facture, '%Y-%m-%d') AS date_facture,
                DATE_FORMAT(date_echeance, '%Y-%m-%d') AS date_echeance,
                statut,
                description,
                DATE_FORMAT(date_creation, '%Y-%m-%d') AS date_creation,
                DATE_FORMAT(date_modification, '%Y-%m-%d') AS date_modification
            FROM factures 
            WHERE appartement_id = ? 
            ORDER BY date_facture DESC
        `;

        console.log('🔍 Query factures:', query);

        db.query(query, [id], (err, results) => {
            if (err) {
                console.error('❌ Erreur lors de la récupération des factures:', err);
                return res.json([]);
            }

            console.log('✅ Factures trouvées:', results.length);
            console.log('📊 Données factures:', results);

            res.json(results);
        });
    });
});

// backend/index.js - PARTIE 3/6 : Routes Médias et Locataires

// ========================= ROUTES MÉDIAS =========================

// POST - Upload de médias pour un appartement
app.post('/apartments/:id/media', authenticateToken, upload.array('media', 10), (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const files = req.files;

    if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: 'Aucun fichier uploadé' });
    }

    // Vérifier que l'appartement appartient à l'utilisateur
    db.query('SELECT id FROM appartements WHERE id = ? AND utilisateur_id = ?', [id, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ success: false, message: 'Appartement non trouvé' });
        }

        const mediaPromises = files.map(file => {
            return new Promise((resolve, reject) => {
                const type_media = file.mimetype.startsWith('image/') ? 'photo' : 'video';
                const query = `
                    INSERT INTO medias (appartement_id, nom_fichier, chemin_fichier, type_media, url)
                    VALUES (?, ?, ?, ?, ?)
                `;

                db.query(query, [id, file.originalname, file.path, type_media, `uploads/${file.filename}`], (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: result.insertId, chemin_fichier: file.path, type_media });
                    }
                });
            });
        });

        Promise.all(mediaPromises)
            .then(insertedMedias => {
                // Vérifier s'il y a déjà une photo_principale
                db.query(
                    'SELECT photo_principale FROM appartements WHERE id = ?',
                    [id],
                    (err, results) => {
                        if (err) {
                            console.error('Erreur lors de la vérification de la photo principale :', err);
                            return res.status(500).json({ success: false, message: 'Erreur serveur' });
                        }

                        const currentPhotoPrincipale = results[0]?.photo_principale;

                        if (!currentPhotoPrincipale) {
                            const firstPhoto = insertedMedias.find(m => m.type_media === 'photo');
                            if (firstPhoto) {
                                db.query(
                                    'UPDATE appartements SET photo_principale = ? WHERE id = ?',
                                    [firstPhoto.chemin_fichier, id],
                                    (err) => {
                                        if (err) {
                                            console.error('Erreur mise à jour photo principale :', err);
                                            return res.status(500).json({ success: false, message: 'Erreur serveur' });
                                        }
                                        return res.json({ success: true, message: 'Médias uploadés et photo principale mise à jour' });
                                    }
                                );
                            } else {
                                return res.json({ success: true, message: 'Médias uploadés (aucune image trouvée pour photo principale)' });
                            }
                        } else {
                            return res.json({ success: true, message: 'Médias uploadés (photo principale déjà définie)' });
                        }
                    }
                );
            })
            .catch(err => {
                console.error('Erreur lors de l\'upload des médias:', err);
                res.status(500).json({ success: false, message: 'Erreur lors de l\'upload' });
            });
    });
});

// GET - Récupérer les médias d'un appartement (CORRIGÉ)
app.get('/apartments/:id/media', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log('🔍 Récupération médias pour appartement:', id);

    // Vérifier que l'appartement appartient à l'utilisateur
    const checkQuery = 'SELECT id FROM appartements WHERE id = ? AND utilisateur_id = ?';
    db.query(checkQuery, [id, userId], (err, checkResults) => {
        if (err || checkResults.length === 0) {
            console.log('❌ Appartement non trouvé pour médias');
            return res.json([]);
        }

        const query = `
            SELECT 
                id,
                nom_fichier,
                chemin_fichier,
                url,
                type_media,
                ordre_affichage,
                DATE_FORMAT(date_upload, '%Y-%m-%d') AS date_upload
            FROM medias 
            WHERE appartement_id = ? 
            ORDER BY ordre_affichage ASC, date_upload ASC
        `;

        console.log('🔍 Query médias:', query);

        db.query(query, [id], (err, results) => {
            if (err) {
                console.error('❌ Erreur lors de la récupération des médias:', err);
                return res.json([]);
            }

            console.log('✅ Médias trouvés:', results.length);

            const medias = results.map(media => ({
                ...media,
                url: media.url || `uploads/${media.chemin_fichier.split('/').pop()}`
            }));

            console.log('📊 Médias formatés:', medias);
            res.json(medias);
        });
    });
});

// DELETE - Supprimer un média
app.delete('/media/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    // Récupérer les infos du média et vérifier l'ownership
    const query = `
        SELECT m.chemin_fichier, m.appartement_id 
        FROM medias m
        JOIN appartements a ON m.appartement_id = a.id
        WHERE m.id = ? AND a.utilisateur_id = ?
    `;

    db.query(query, [id, userId], (err, results) => {
        if (err) {
            console.error('Erreur récupération média:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Média introuvable' });
        }

        const { chemin_fichier, appartement_id } = results[0];

        // Supprimer le fichier physique
        fs.unlink(chemin_fichier, (err) => {
            if (err) console.error('Erreur suppression fichier:', err);
        });

        // Supprimer le média de la BDD
        db.query('DELETE FROM medias WHERE id = ?', [id], (err) => {
            if (err) {
                console.error('Erreur suppression média BDD:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            // Vérifier s'il reste d'autres images pour le même appartement
            db.query('SELECT COUNT(*) AS count FROM medias WHERE appartement_id = ?', [appartement_id], (err, results) => {
                if (err) {
                    console.error('Erreur vérification restantes images:', err);
                    return res.status(500).json({ success: false, message: 'Erreur serveur' });
                }

                const remainingImages = results[0].count;

                if (remainingImages === 0) {
                    // Mettre à NULL la photo principale si plus d'image pour cet appartement
                    db.query('UPDATE appartements SET photo_principale = NULL WHERE id = ?', [appartement_id], (err) => {
                        if (err) {
                            console.error('Erreur mise à jour appartement:', err);
                            return res.status(500).json({ success: false, message: 'Erreur serveur' });
                        }

                        return res.json({ success: true, message: 'Média supprimé, photo principale réinitialisée' });
                    });
                } else {
                    return res.json({ success: true, message: 'Média supprimé avec succès' });
                }
            });
        });
    });
});

// ========================= ROUTES LOCATAIRES =========================

// GET - Récupérer tous les locataires de l'utilisateur
app.get('/tenants', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    const query = `
        SELECT 
            id,
            nom,
            prenom,
            email,
            telephone,
            date_naissance,
            profession,
            salaire,
            DATE_FORMAT(date_creation, '%Y-%m-%d') AS date_creation,
            DATE_FORMAT(date_modification, '%Y-%m-%d') AS date_modification
        FROM locataires 
        WHERE utilisateur_id = ?
        ORDER BY nom, prenom
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des locataires:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        res.json(results);
    });
});

// GET - Récupérer un locataire par ID
app.get('/tenants/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    const query = `SELECT * FROM locataires WHERE id = ? AND utilisateur_id = ?`;

    db.query(query, [id, userId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération du locataire:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Locataire non trouvé' });
        }
        
        res.json({ success: true, data: results[0] });
    });
});

// POST - Créer un nouveau locataire
app.post('/tenants', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const {
        nom, prenom, email, telephone, date_naissance, 
        profession, salaire
    } = req.body;

    console.log('=== DONNÉES REÇUES POUR LOCATAIRE ===');
    console.log('Body complet:', req.body);

    // Gérer la date de naissance vide
    const dateNaissance = date_naissance && date_naissance.trim() !== '' ? date_naissance : null;
    
    console.log('Date naissance traitée:', dateNaissance);

    const query = `
        INSERT INTO locataires (utilisateur_id, nom, prenom, email, telephone, date_naissance, profession, salaire)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        userId,
        nom, 
        prenom, 
        email || null, 
        telephone || null, 
        dateNaissance, 
        profession || null, 
        parseFloat(salaire) || null
    ];

    console.log('Query:', query);
    console.log('Values:', values);

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Erreur lors de la création du locataire:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Erreur serveur: ' + err.message 
            });
        }

        console.log('Locataire créé avec succès, ID:', result.insertId);

        res.json({ 
            success: true, 
            message: 'Locataire créé avec succès',
            id: result.insertId 
        });
    });
});

// PUT - Modifier un locataire
app.put('/tenants/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const {
        nom, prenom, email, telephone, date_naissance, 
        profession, salaire
    } = req.body;

    const query = `
        UPDATE locataires SET
            nom = ?, prenom = ?, email = ?, telephone = ?,
            date_naissance = ?, profession = ?, salaire = ?
        WHERE id = ? AND utilisateur_id = ?
    `;

    db.query(query, [
        nom, prenom, email, telephone, date_naissance, 
        profession, salaire, id, userId
    ], (err, result) => {
        if (err) {
            console.error('Erreur lors de la modification du locataire:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Locataire non trouvé' });
        }

        res.json({ success: true, message: 'Locataire modifié avec succès' });
    });
});

// DELETE - Supprimer un locataire
app.delete('/tenants/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    db.query('DELETE FROM locataires WHERE id = ? AND utilisateur_id = ?', [id, userId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la suppression du locataire:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Locataire non trouvé' });
        }

        res.json({ success: true, message: 'Locataire supprimé avec succès' });
    });
});

// GET - Récupérer toutes les locations d'un locataire
app.get('/tenants/:id/locations', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    // Vérifier que le locataire appartient à l'utilisateur
    const checkQuery = 'SELECT id FROM locataires WHERE id = ? AND utilisateur_id = ?';
    db.query(checkQuery, [id, userId], (err, checkResults) => {
        if (err || checkResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Locataire non trouvé' });
        }

        const query = `
            SELECT 
                loc.*,
                DATE_FORMAT(loc.date_debut, '%Y-%m-%d') as date_debut,
                DATE_FORMAT(loc.date_fin, '%Y-%m-%d') as date_fin,
                a.titre as appartement_titre,
                a.adresse_complete as appartement_adresse
            FROM locations loc
            JOIN appartements a ON loc.appartement_id = a.id
            WHERE loc.locataire_id = ?
            ORDER BY loc.date_debut DESC
        `;

        db.query(query, [id], (err, results) => {
            if (err) {
                console.error('Erreur récupération locations:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }
            //console.log('🔍 Récupération des locations pour locataire:', results);
            res.json({ success: true, data: results });
        });
        
    });
});

// GET - Récupérer la location actuelle d'un locataire
app.get('/tenants/:id/current-rental', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    const query = `
        SELECT 
            loc.*,
            a.titre as appartement_titre,
            a.adresse_complete as appartement_adresse
        FROM locations loc
        JOIN appartements a ON loc.appartement_id = a.id
        JOIN locataires l ON loc.locataire_id = l.id
        WHERE loc.locataire_id = ? AND loc.statut = 'active' AND l.utilisateur_id = ?
        ORDER BY loc.date_debut DESC
        LIMIT 1
    `;

    db.query(query, [id, userId], (err, results) => {
        if (err) {
            console.error('Erreur récupération location actuelle:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        const currentRental = results.length > 0 ? results[0] : null;
        res.json({ success: true, data: currentRental });
    });
});

// GET - Récupérer l'historique des locations d'un locataire
app.get('/tenants/:id/rental-history', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    const query = `
        SELECT 
            loc.*,
            a.titre as appartement_titre,
            a.adresse_complete as appartement_adresse
        FROM locations loc
        JOIN appartements a ON loc.appartement_id = a.id
        JOIN locataires l ON loc.locataire_id = l.id
        WHERE loc.locataire_id = ? AND loc.statut != 'active' AND l.utilisateur_id = ?
        ORDER BY loc.date_debut DESC
    `;

    db.query(query, [id, userId], (err, results) => {
        if (err) {
            console.error('Erreur récupération historique:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        res.json({ success: true, data: results });
    });
});

// GET - Récupérer les documents d'un locataire (CORRIGÉ)
app.get('/tenants/:id/documents', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    // Vérifier ownership
    db.query('SELECT id FROM locataires WHERE id = ? AND utilisateur_id = ?', [id, userId], (err, checkResults) => {
        if (err || checkResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Locataire non trouvé' });
        }

        const query = `
            SELECT *, DATE_FORMAT(date_upload, '%Y-%m-%d') AS date_upload, DATE_FORMAT(date_modification, '%Y-%m-%d') AS date_modification FROM documents 
            WHERE locataire_id = ? 
            ORDER BY date_upload DESC
        `;

        db.query(query, [id], (err, results) => {
            if (err) {
                console.error('Erreur lors de la récupération des documents:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            const documents = results.map(doc => ({
                ...doc,
                url: doc.url || `/${doc.chemin_fichier}`
            }));

            // CORRECTION : Retourner un objet avec success et data
            res.json({ success: true, data: documents });
        });
    });
});

// GET - Récupérer les paiements d'un locataire
app.get('/tenants/:id/payments', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    // Vérifier ownership
    db.query('SELECT id FROM locataires WHERE id = ? AND utilisateur_id = ?', [id, userId], (err, checkResults) => {
        if (err || checkResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Locataire non trouvé' });
        }

        const query = `
            SELECT * FROM paiements 
            WHERE locataire_id = ? 
            ORDER BY date_paiement DESC
        `;

        db.query(query, [id], (err, results) => {
            if (err) {
                console.error('Erreur lors de la récupération des paiements:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            res.json({ success: true, data: results });
        });
    });
});
// backend/index.js - PARTIE 4/6 : Routes Locations (Nouvelles fonctionnalités)

// ========================= ROUTES LOCATIONS =========================

// GET - Récupérer une location par ID
app.get('/locations/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    const query = `
        SELECT 
            loc.*,
            a.titre as appartement_titre,
            a.adresse_complete as appartement_adresse,
            l.nom as locataire_nom,
            l.prenom as locataire_prenom
        FROM locations loc
        JOIN appartements a ON loc.appartement_id = a.id
        JOIN locataires l ON loc.locataire_id = l.id
        WHERE loc.id = ? AND a.utilisateur_id = ?
    `;

    db.query(query, [id, userId], (err, results) => {
        if (err) {
            console.error('Erreur récupération location:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Location non trouvée' });
        }

        res.json({ success: true, data: results[0] });
    });
});

// POST - Créer une nouvelle location
app.post('/locations', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const {
        appartement_id, locataire_id, date_debut, date_fin,
        loyer_mensuel, charges_mensuelles, depot_garantie, statut
    } = req.body;

    console.log('=== CRÉATION LOCATION ===');
    console.log('Body reçu:', req.body);

    // Validation des données requises
    if (!appartement_id || !locataire_id || !date_debut) {
        console.log('ERREUR: Données manquantes');
        return res.status(400).json({
            success: false,
            message: 'Appartement, locataire et date de début sont obligatoires'
        });
    }

    // Vérifier que l'appartement et le locataire appartiennent à l'utilisateur
    const checkQuery = `
        SELECT a.id as apt_id, l.id as loc_id 
        FROM appartements a, locataires l 
        WHERE a.id = ? AND l.id = ? AND a.utilisateur_id = ? AND l.utilisateur_id = ?
    `;
    
    db.query(checkQuery, [appartement_id, locataire_id, userId, userId], (err, checkResults) => {
        if (err || checkResults.length === 0) {
            console.log('ERREUR: Appartement ou locataire non trouvé');
            return res.status(404).json({
                success: false,
                message: 'Appartement ou locataire non trouvé'
            });
        }

        // Vérifier s'il y a déjà une location active pour cet appartement
        const activeLocationQuery = `
            SELECT id FROM locations 
            WHERE appartement_id = ? AND statut = 'active'
        `;

        db.query(activeLocationQuery, [appartement_id], (err2, activeResults) => {
            if (err2) {
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            // Si il y a déjà une location active et qu'on essaie de créer une nouvelle location active
            if (activeResults.length > 0 && (!statut || statut === 'active')) {
                console.log('ERREUR: Location active existante');
                return res.status(400).json({
                    success: false,
                    message: 'Cet appartement a déjà une location active. Terminez-la d\'abord ou créez cette location avec un statut différent.'
                });
            }

            const insertQuery = `
                INSERT INTO locations (
                    appartement_id, locataire_id, date_debut, date_fin,
                    loyer_mensuel, charges_mensuelles, depot_garantie, statut
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                appartement_id,
                locataire_id,
                date_debut,
                date_fin || null,
                parseFloat(loyer_mensuel) || null,
                parseFloat(charges_mensuelles) || null,
                parseFloat(depot_garantie) || null,
                statut || 'active'
            ];

            console.log('Query:', insertQuery);
            console.log('Values:', values);

            db.query(insertQuery, values, (err3, result) => {
                if (err3) {
                    console.error('Erreur lors de la création de la location:', err3);
                    return res.status(500).json({
                        success: false,
                        message: 'Erreur serveur: ' + err3.message
                    });
                }

                console.log('Location créée avec succès, ID:', result.insertId);

                // Mettre à jour le statut de l'appartement selon le statut de la location
                const newApartmentStatus = (statut === 'active' || !statut) ? 'occupé' : 'libre';
                db.query('UPDATE appartements SET statut = ? WHERE id = ?', [newApartmentStatus, appartement_id], (err4) => {
                    if (err4) {
                        console.error('Erreur lors de la mise à jour du statut:', err4);
                    } else {
                        console.log('Statut appartement mis à jour en:', newApartmentStatus);
                    }
                });

                res.json({
                    success: true,
                    message: 'Location créée avec succès',
                    id: result.insertId
                });
            });
        });
    });
});

// PUT - Modifier une location
app.put('/locations/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const {
        appartement_id, locataire_id, date_debut, date_fin,
        loyer_mensuel, charges_mensuelles, depot_garantie, statut
    } = req.body;

    // Vérifier que la location appartient à l'utilisateur
    const checkQuery = `
        SELECT loc.id, loc.appartement_id as old_appartement_id, loc.statut as old_statut
        FROM locations loc
        JOIN appartements a ON loc.appartement_id = a.id
        WHERE loc.id = ? AND a.utilisateur_id = ?
    `;

    db.query(checkQuery, [id, userId], (err, checkResults) => {
        if (err || checkResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Location non trouvée' });
        }

        const oldAppartementId = checkResults[0].old_appartement_id;
        const oldStatut = checkResults[0].old_statut;

        // Vérifier que le nouvel appartement et locataire appartiennent à l'utilisateur
        const ownershipQuery = `
            SELECT a.id as apt_id, l.id as loc_id 
            FROM appartements a, locataires l 
            WHERE a.id = ? AND l.id = ? AND a.utilisateur_id = ? AND l.utilisateur_id = ?
        `;

        db.query(ownershipQuery, [appartement_id, locataire_id, userId, userId], (err2, ownershipResults) => {
            if (err2 || ownershipResults.length === 0) {
                return res.status(404).json({ success: false, message: 'Appartement ou locataire non trouvé' });
            }

            // Déterminer le nouveau statut en fonction des dates
            let newStatut = statut || 'active';
            const today = new Date().toISOString().split('T')[0];
            
            if (date_fin && date_fin < today) {
                newStatut = 'terminee';
            } else if (date_debut > today || date_fin > today) {
                newStatut = 'active'; // Location future mais on la garde active
            }

            const updateQuery = `
                UPDATE locations SET
                    appartement_id = ?,
                    locataire_id = ?,
                    date_debut = ?,
                    date_fin = ?,
                    loyer_mensuel = ?,
                    charges_mensuelles = ?,
                    depot_garantie = ?,
                    statut = ?
                WHERE id = ?
            `;

            const values = [
                appartement_id,
                locataire_id,
                date_debut,
                date_fin || null,
                parseFloat(loyer_mensuel) || null,
                parseFloat(charges_mensuelles) || null,
                parseFloat(depot_garantie) || null,
                newStatut,
                id
            ];

            db.query(updateQuery, values, (err3, result) => {
                if (err3) {
                    console.error('Erreur modification location:', err3);
                    return res.status(500).json({ success: false, message: 'Erreur serveur' });
                }

                // Fonction pour mettre à jour le statut d'un appartement
                const updateApartmentStatus = (apartmentId) => {
                    const statusQuery = `
                        UPDATE appartements 
                        SET statut = CASE 
                            WHEN EXISTS (
                                SELECT 1 FROM locations 
                                WHERE appartement_id = ? AND statut = 'active'
                            ) THEN 'occupé'
                            WHEN statut = 'en_travaux' THEN 'en_travaux'
                            ELSE 'libre'
                        END
                        WHERE id = ?
                    `;
                    
                    db.query(statusQuery, [apartmentId, apartmentId], (err) => {
                        if (err) {
                            console.error(`Erreur mise à jour statut appartement ${apartmentId}:`, err);
                        }
                    });
                };

                // Mettre à jour les statuts des appartements
                updateApartmentStatus(appartement_id);
                if (oldAppartementId !== appartement_id) {
                    updateApartmentStatus(oldAppartementId);
                }

                res.json({ success: true, message: 'Location modifiée avec succès' });
            });
        });
    });
});

// DELETE - Supprimer une location
app.delete('/locations/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    // Récupérer les infos de la location avant suppression
    const getLocationQuery = `
        SELECT loc.appartement_id, loc.statut
        FROM locations loc
        JOIN appartements a ON loc.appartement_id = a.id
        WHERE loc.id = ? AND a.utilisateur_id = ?
    `;

    db.query(getLocationQuery, [id, userId], (err, locationResults) => {
        if (err || locationResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Location non trouvée' });
        }

        const { appartement_id, statut } = locationResults[0];

        // Supprimer la location
        db.query('DELETE FROM locations WHERE id = ?', [id], (err2, result) => {
            if (err2) {
                console.error('Erreur suppression location:', err2);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            // Si c'était la location active, remettre l'appartement en libre
            if (statut === 'active') {
                // Vérifier s'il y a d'autres locations actives pour cet appartement
                db.query(
                    'SELECT COUNT(*) as count FROM locations WHERE appartement_id = ? AND statut = "active"',
                    [appartement_id],
                    (err3, countResults) => {
                        if (!err3 && countResults[0].count === 0) {
                            // Aucune location active restante, mettre l'appartement en libre
                            db.query('UPDATE appartements SET statut = "libre" WHERE id = ?', [appartement_id], (err4) => {
                                if (err4) {
                                    console.error('Erreur mise à jour statut appartement:', err4);
                                }
                            });
                        }
                    }
                );
            }

            res.json({ success: true, message: 'Location supprimée avec succès' });
        });
    });
});

// PUT - Terminer une location
app.put('/locations/:id/terminate', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const { date_fin, statut } = req.body;

    // Vérifier que la location appartient à l'utilisateur
    const checkQuery = `
        SELECT loc.appartement_id
        FROM locations loc
        JOIN appartements a ON loc.appartement_id = a.id
        WHERE loc.id = ? AND a.utilisateur_id = ?
    `;

    db.query(checkQuery, [id, userId], (err, checkResults) => {
        if (err || checkResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Location non trouvée' });
        }

        const appartement_id = checkResults[0].appartement_id;

        const updateQuery = `
            UPDATE locations SET
                date_fin = ?,
                statut = ?
            WHERE id = ?
        `;

        db.query(updateQuery, [date_fin, statut || 'terminee', id], (err2, result) => {
            if (err2) {
                console.error('Erreur fin location:', err2);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            // Mettre l'appartement en libre
            db.query('UPDATE appartements SET statut = "libre" WHERE id = ?', [appartement_id], (err3) => {
                if (err3) {
                    console.error('Erreur mise à jour statut appartement:', err3);
                }
            });

            res.json({ success: true, message: 'Location terminée avec succès' });
        });
    });
});

// GET - Récupérer toutes les locations (vue globale)
app.get('/locations', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { statut, appartement_id, locataire_id } = req.query;

    let query = `
        SELECT 
            loc.*,
            a.titre as appartement_titre,
            a.adresse_complete as appartement_adresse,
            l.nom as locataire_nom,
            l.prenom as locataire_prenom,
            l.email as locataire_email,
            l.telephone as locataire_telephone
        FROM locations loc
        JOIN appartements a ON loc.appartement_id = a.id
        JOIN locataires l ON loc.locataire_id = l.id
        WHERE a.utilisateur_id = ?
    `;

    const queryParams = [userId];

    // Filtres optionnels
    if (statut) {
        query += ' AND loc.statut = ?';
        queryParams.push(statut);
    }

    if (appartement_id) {
        query += ' AND loc.appartement_id = ?';
        queryParams.push(appartement_id);
    }

    if (locataire_id) {
        query += ' AND loc.locataire_id = ?';
        queryParams.push(locataire_id);
    }

    query += ' ORDER BY loc.date_debut DESC';

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Erreur récupération locations:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        res.json({ success: true, data: results });
    });
});

// GET - Statistiques globales des locations
app.get('/locations/stats', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    const statsQuery = `
        SELECT 
            COUNT(*) as total_locations,
            COUNT(CASE WHEN loc.statut = 'active' THEN 1 END) as locations_actives,
            COUNT(CASE WHEN loc.statut = 'terminee' THEN 1 END) as locations_terminees,
            COUNT(CASE WHEN loc.statut = 'resiliee' THEN 1 END) as locations_resiliees,
            AVG(loc.loyer_mensuel) as loyer_moyen,
            SUM(CASE WHEN loc.statut = 'active' THEN loc.loyer_mensuel ELSE 0 END) as revenus_mensuels_totaux,
            COUNT(DISTINCT loc.appartement_id) as appartements_avec_locations,
            COUNT(DISTINCT loc.locataire_id) as locataires_uniques
        FROM locations loc
        JOIN appartements a ON loc.appartement_id = a.id
        WHERE a.utilisateur_id = ?
    `;

    db.query(statsQuery, [userId], (err, results) => {
        if (err) {
            console.error('Erreur récupération statistiques globales:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        res.json({ success: true, data: results[0] });
    });
});
// backend/index.js - PARTIE 5/6 : Routes Documents, Paiements et Factures

// ========================= ROUTES DOCUMENTS =========================

// POST - Upload de documents
app.post('/documents', authenticateToken, upload.single('document'), (req, res) => {
    const userId = req.user.userId;
    const { appartement_id, locataire_id, location_id, nom_document, type_document, description } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier uploadé' });
    }

    // Vérifier l'ownership si appartement_id ou locataire_id est fourni
    let ownershipCheck = Promise.resolve(true);
    
    if (appartement_id) {
        ownershipCheck = new Promise((resolve) => {
            db.query('SELECT id FROM appartements WHERE id = ? AND utilisateur_id = ?', [appartement_id, userId], (err, results) => {
                resolve(!err && results.length > 0);
            });
        });
    } else if (locataire_id) {
        ownershipCheck = new Promise((resolve) => {
            db.query('SELECT id FROM locataires WHERE id = ? AND utilisateur_id = ?', [locataire_id, userId], (err, results) => {
                resolve(!err && results.length > 0);
            });
        });
    }

    ownershipCheck.then(isOwner => {
        if (!isOwner) {
            return res.status(404).json({ success: false, message: 'Ressource non trouvée' });
        }

        const query = `
            INSERT INTO documents (
                appartement_id, locataire_id, location_id, nom_document, 
                type_document, chemin_fichier, url, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(query, [
            appartement_id || null, locataire_id || null, location_id || null,
            nom_document, type_document, file.path, `uploads/${file.filename}`, description
        ], (err, result) => {
            if (err) {
                console.error('Erreur lors de l\'upload du document:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            res.json({ 
                success: true, 
                message: 'Document uploadé avec succès',
                id: result.insertId 
            });
        });
    });
});

// PUT - Renommer un document
app.put('/documents/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const { nom_document } = req.body;

    if (!nom_document || nom_document.trim() === '') {
        return res.status(400).json({ 
            success: false, 
            message: 'Le nom du document ne peut pas être vide' 
        });
    }

    // Vérifier ownership via les tables liées
    const checkQuery = `
        SELECT d.id, d.nom_document
        FROM documents d
        LEFT JOIN appartements a ON d.appartement_id = a.id
        LEFT JOIN locataires l ON d.locataire_id = l.id
        WHERE d.id = ? AND (a.utilisateur_id = ? OR l.utilisateur_id = ?)
    `;

    db.query(checkQuery, [id, userId, userId], (err, results) => {
        if (err) {
            console.error('Erreur vérification document:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (results.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Document non trouvé' 
            });
        }

        // Mettre à jour le nom du document
        const updateQuery = 'UPDATE documents SET nom_document = ? WHERE id = ?';
        
        db.query(updateQuery, [nom_document.trim(), id], (err, result) => {
            if (err) {
                console.error('Erreur renommage document:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Erreur lors du renommage' 
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Document non trouvé' 
                });
            }

            console.log(`✅ Document ${id} renommé: "${results[0].nom_document}" → "${nom_document}"`);

            res.json({ 
                success: true, 
                message: 'Document renommé avec succès',
                data: {
                    id: parseInt(id),
                    old_name: results[0].nom_document,
                    new_name: nom_document
                }
            });
        });
    });
});

// PUT - Déplacer un document
app.put('/documents/:id/move', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const { appartement_id, locataire_id } = req.body;

    // Validation : il faut au moins une destination
    if (!appartement_id && !locataire_id) {
        return res.status(400).json({ 
            success: false, 
            message: 'Il faut spécifier un appartement ou un locataire de destination' 
        });
    }

    // Validation : pas les deux à la fois
    if (appartement_id && locataire_id) {
        return res.status(400).json({ 
            success: false, 
            message: 'Un document ne peut pas être lié à la fois à un appartement et un locataire' 
        });
    }

    // Vérifier que le document appartient à l'utilisateur
    const checkDocQuery = `
        SELECT d.id, d.nom_document, d.appartement_id, d.locataire_id
        FROM documents d
        LEFT JOIN appartements a ON d.appartement_id = a.id
        LEFT JOIN locataires l ON d.locataire_id = l.id
        WHERE d.id = ? AND (a.utilisateur_id = ? OR l.utilisateur_id = ?)
    `;

    db.query(checkDocQuery, [id, userId, userId], (err, docResults) => {
        if (err) {
            console.error('Erreur vérification document:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (docResults.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Document non trouvé' 
            });
        }

        const document = docResults[0];

        // Fonction pour vérifier et déplacer
        const moveDocument = (destApartmentId, destTenantId) => {
            let checkDestQuery;
            let checkParams;
            
            if (destApartmentId) {
                checkDestQuery = 'SELECT id FROM appartements WHERE id = ? AND utilisateur_id = ?';
                checkParams = [destApartmentId, userId];
            } else {
                checkDestQuery = 'SELECT id FROM locataires WHERE id = ? AND utilisateur_id = ?';
                checkParams = [destTenantId, userId];
            }

            // Vérifier que la destination appartient à l'utilisateur
            db.query(checkDestQuery, checkParams, (err2, destResults) => {
                if (err2 || destResults.length === 0) {
                    return res.status(404).json({ 
                        success: false, 
                        message: 'Destination non trouvée ou non autorisée' 
                    });
                }

                // Effectuer le déplacement
                const updateQuery = `
                    UPDATE documents 
                    SET appartement_id = ?, locataire_id = ?, location_id = NULL 
                    WHERE id = ?
                `;

                db.query(updateQuery, [destApartmentId || null, destTenantId || null, id], (err3, result) => {
                    if (err3) {
                        console.error('Erreur déplacement document:', err3);
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Erreur lors du déplacement' 
                        });
                    }

                    if (result.affectedRows === 0) {
                        return res.status(404).json({ 
                            success: false, 
                            message: 'Document non trouvé' 
                        });
                    }

                    const sourceInfo = document.appartement_id 
                        ? `appartement ${document.appartement_id}` 
                        : `locataire ${document.locataire_id}`;
                    
                    const destInfo = destApartmentId 
                        ? `appartement ${destApartmentId}` 
                        : `locataire ${destTenantId}`;

                    console.log(`✅ Document ${id} "${document.nom_document}" déplacé de ${sourceInfo} vers ${destInfo}`);

                    res.json({ 
                        success: true, 
                        message: 'Document déplacé avec succès',
                        data: {
                            id: parseInt(id),
                            document_name: document.nom_document,
                            new_appartement_id: destApartmentId,
                            new_locataire_id: destTenantId
                        }
                    });
                });
            });
        };

        // Exécuter le déplacement
        moveDocument(appartement_id, locataire_id);
    });
});

// DELETE - Supprimer un document
app.delete('/documents/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    // Vérifier ownership via les tables liées
    const checkQuery = `
        SELECT d.chemin_fichier 
        FROM documents d
        LEFT JOIN appartements a ON d.appartement_id = a.id
        LEFT JOIN locataires l ON d.locataire_id = l.id
        WHERE d.id = ? AND (a.utilisateur_id = ? OR l.utilisateur_id = ?)
    `;

    db.query(checkQuery, [id, userId, userId], (err, results) => {
        if (err) {
            console.error('Erreur récupération document:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Document non trouvé' });
        }

        const filePath = results[0].chemin_fichier;
        
        // Supprimer le fichier physique
        fs.unlink(filePath, (err) => {
            if (err) console.error('Erreur suppression fichier:', err);
        });

        // Supprimer de la base de données
        db.query('DELETE FROM documents WHERE id = ?', [id], (err, result) => {
            if (err) {
                console.error('Erreur suppression document BDD:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            res.json({ success: true, message: 'Document supprimé avec succès' });
        });
    });
});

// ========================= ROUTES PAIEMENTS =========================

// POST - Créer un nouveau paiement
app.post('/payments', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const {
        locataire_id, appartement_id, location_id, type_paiement,
        montant, date_paiement, methode_paiement, description
    } = req.body;

    // Vérifier ownership du locataire
    db.query('SELECT id FROM locataires WHERE id = ? AND utilisateur_id = ?', [locataire_id, userId], (err, checkResults) => {
        if (err || checkResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Locataire non trouvé' });
        }

        const query = `
            INSERT INTO paiements (
                locataire_id, appartement_id, location_id, type_paiement,
                montant, date_paiement, methode_paiement, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(query, [
            locataire_id, appartement_id || null, location_id || null,
            type_paiement, montant, date_paiement, methode_paiement, description
        ], (err, result) => {
            if (err) {
                console.error('Erreur lors de la création du paiement:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            res.json({ 
                success: true, 
                message: 'Paiement enregistré avec succès',
                id: result.insertId 
            });
        });
    });
});

// ========================= ROUTES FACTURES =========================

// POST - Créer une nouvelle facture
app.post('/invoices', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const {
        appartement_id, location_id, type_facture, numero_facture,
        montant, date_facture, date_echeance, statut, description
    } = req.body;

    // Vérifier ownership de l'appartement
    db.query('SELECT id FROM appartements WHERE id = ? AND utilisateur_id = ?', [appartement_id, userId], (err, checkResults) => {
        if (err || checkResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Appartement non trouvé' });
        }

        const query = `
            INSERT INTO factures (
                appartement_id, location_id, type_facture, numero_facture,
                montant, date_facture, date_echeance, statut, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(query, [
            appartement_id, location_id, type_facture, numero_facture,
            montant, date_facture, date_echeance, statut, description
        ], (err, result) => {
            if (err) {
                console.error('Erreur lors de la création de la facture:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            res.json({ 
                success: true, 
                message: 'Facture créée avec succès',
                id: result.insertId 
            });
        });
    });
});

// ========================= ROUTES EXPORT =========================

// GET - Exporter toutes les données de l'utilisateur
app.get('/export/data', authenticateToken, async (req, res) => {
    const userId = req.user.userId;

    try {
        const exportData = {};

        // Récupérer toutes les données de l'utilisateur
        const queries = {
            utilisateur: 'SELECT * FROM utilisateurs WHERE id = ?',
            appartements: 'SELECT * FROM appartements WHERE utilisateur_id = ?',
            locataires: 'SELECT * FROM locataires WHERE utilisateur_id = ?',
            locations: `
                SELECT loc.* FROM locations loc
                JOIN appartements a ON loc.appartement_id = a.id
                WHERE a.utilisateur_id = ?
            `,
            documents: `
                SELECT d.* FROM documents d
                LEFT JOIN appartements a ON d.appartement_id = a.id
                LEFT JOIN locataires l ON d.locataire_id = l.id
                WHERE a.utilisateur_id = ? OR l.utilisateur_id = ?
            `,
            medias: `
                SELECT m.* FROM medias m
                JOIN appartements a ON m.appartement_id = a.id
                WHERE a.utilisateur_id = ?
            `,
            paiements: `
                SELECT p.* FROM paiements p
                JOIN locataires l ON p.locataire_id = l.id
                WHERE l.utilisateur_id = ?
            `,
            factures: `
                SELECT f.* FROM factures f
                JOIN appartements a ON f.appartement_id = a.id
                WHERE a.utilisateur_id = ?
            `
        };

        const promises = Object.entries(queries).map(([key, query]) => {
            return new Promise((resolve, reject) => {
                const params = key === 'documents' ? [userId, userId] : [userId];
                db.query(query, params, (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        exportData[key] = results;
                        resolve();
                    }
                });
            });
        });

        await Promise.all(promises);

        // Supprimer les mots de passe et informations sensibles
        if (exportData.utilisateur && exportData.utilisateur[0]) {
            delete exportData.utilisateur[0].password;
        }

        // Ajouter metadata
        exportData.metadata = {
            export_date: new Date().toISOString(),
            version: '2.0',
            user_id: userId
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="gestion-locative-export-${userId}-${new Date().toISOString().split('T')[0]}.json"`);
        res.json(exportData);

    } catch (error) {
        console.error('Erreur export données:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'export' });
    }
});

// ========================= ROUTE DEBUG POUR TESTER =========================

// GET - Route de debug pour voir toutes les données d'un appartement
app.get('/debug/apartments/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log('🐛 DEBUG - Appartement:', id, 'User:', userId);

    const debugData = {};

    // Vérifier l'appartement
    db.query('SELECT * FROM appartements WHERE id = ? AND utilisateur_id = ?', [id, userId], (err, apartment) => {
        if (err || apartment.length === 0) {
            return res.json({ error: 'Appartement non trouvé', apartment_exists: false });
        }

        debugData.apartment = apartment[0];

        // Vérifier les locataires
        const locatairesQuery = `
            SELECT l.*, loc.* FROM locataires l
            JOIN locations loc ON l.id = loc.locataire_id
            WHERE loc.appartement_id = ?
        `;

        db.query(locatairesQuery, [id], (err2, locataires) => {
            debugData.locataires = {
                count: locataires ? locataires.length : 0,
                data: locataires || [],
                error: err2 ? err2.message : null
            };

            // Vérifier les médias
            db.query('SELECT * FROM medias WHERE appartement_id = ?', [id], (err3, medias) => {
                debugData.medias = {
                    count: medias ? medias.length : 0,
                    data: medias || [],
                    error: err3 ? err3.message : null
                };

                // Vérifier les documents
                db.query('SELECT * FROM documents WHERE appartement_id = ?', [id], (err4, documents) => {
                    debugData.documents = {
                        count: documents ? documents.length : 0,
                        data: documents || [],
                        error: err4 ? err4.message : null
                    };

                    // Vérifier les factures
                    db.query('SELECT * FROM factures WHERE appartement_id = ?', [id], (err5, factures) => {
                        debugData.factures = {
                            count: factures ? factures.length : 0,
                            data: factures || [],
                            error: err5 ? err5.message : null
                        };

                        console.log('🐛 DEBUG COMPLET:', JSON.stringify(debugData, null, 2));
                        res.json(debugData);
                    });
                });
            });
        });
    });
});

// ========================= VÉRIFICATION DES TABLES =========================

// GET - Vérifier la structure des tables (debug)
app.get('/debug/tables', authenticateToken, (req, res) => {
    const tables = ['appartements', 'locataires', 'locations', 'medias', 'documents', 'factures'];
    const results = {};

    let completed = 0;
    
    tables.forEach(table => {
        db.query(`DESCRIBE ${table}`, (err, columns) => {
            results[table] = {
                exists: !err,
                columns: columns || [],
                error: err ? err.message : null
            };

            db.query(`SELECT COUNT(*) as count FROM ${table}`, (err2, count) => {
                results[table].count = err2 ? 0 : count[0].count;
                
                completed++;
                if (completed === tables.length) {
                    res.json(results);
                }
            });
        });
    });
});

// ========================= NOUVELLE ROUTE POUR LES STATISTIQUES DASHBOARD =========================

// GET - Statistiques complètes pour le dashboard
app.get('/dashboard/stats', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    const statsQuery = `
        SELECT 
            -- Statistiques appartements
            COUNT(DISTINCT a.id) as total_apartments,
            COUNT(DISTINCT CASE WHEN a.statut = 'occupé' THEN a.id END) as occupied_apartments,
            COUNT(DISTINCT CASE WHEN a.statut = 'libre' THEN a.id END) as vacant_apartments,
            COUNT(DISTINCT CASE WHEN a.statut = 'en_travaux' THEN a.id END) as under_work_apartments,
            
            -- Revenus
            COALESCE(SUM(CASE WHEN loc.statut = 'active' THEN loc.loyer_mensuel ELSE 0 END), 0) as monthly_revenue,
            COALESCE(AVG(CASE WHEN a.prix_loyer > 0 THEN a.prix_loyer END), 0) as average_rent,
            
            -- Locataires
            COUNT(DISTINCT l.id) as total_tenants,
            COUNT(DISTINCT CASE WHEN loc.statut = 'active' THEN l.id END) as active_tenants,
            
            -- Taux d'occupation
            CASE 
                WHEN COUNT(DISTINCT a.id) > 0 
                THEN (COUNT(DISTINCT CASE WHEN a.statut = 'occupé' THEN a.id END) * 100.0 / COUNT(DISTINCT a.id))
                ELSE 0 
            END as occupancy_rate
            
        FROM appartements a
        LEFT JOIN locations loc ON a.id = loc.appartement_id AND loc.statut = 'active'
        LEFT JOIN locataires l ON loc.locataire_id = l.id
        WHERE a.utilisateur_id = ?
    `;
    
    db.query(statsQuery, [userId], (err, results) => {
        if (err) {
            console.error('Erreur récupération statistiques:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
        
        const stats = results[0] || {};
        
        // Calculs additionnels
        stats.annual_revenue = stats.monthly_revenue * 12;
        stats.occupancy_rate = Math.round(stats.occupancy_rate * 100) / 100; // Arrondir à 2 décimales
        
        res.json({ 
            success: true, 
            data: stats 
        });
    });
});

// GET - Données pour le graphique des revenus (12 derniers mois)
app.get('/dashboard/revenue-chart', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    // Générer les 12 derniers mois
    const months = [];
    for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        months.push({
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            label: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        });
    }
    
    // Pour cet exemple, on simule les données car il faudrait un système de tracking des revenus historiques
    // En production, vous pourriez avoir une table `revenus_mensuels` ou calculer à partir des paiements
    const revenueQuery = `
        SELECT 
            COALESCE(SUM(CASE WHEN loc.statut = 'active' THEN loc.loyer_mensuel ELSE 0 END), 0) as current_revenue
        FROM appartements a
        LEFT JOIN locations loc ON a.id = loc.appartement_id AND loc.statut = 'active'
        WHERE a.utilisateur_id = ?
    `;
    
    db.query(revenueQuery, [userId], (err, results) => {
        if (err) {
            console.error('Erreur récupération revenus:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
        
        const currentRevenue = results[0]?.current_revenue || 0;
        
        // Simuler les données historiques (en production, utiliser de vraies données)
        const revenueData = months.map((month, index) => {
            const isCurrentOrPast = index <= 11; // Tous les mois jusqu'à maintenant
            const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
            const revenue = isCurrentOrPast ? Math.max(0, currentRevenue * (1 + variation)) : 0;
            
            return {
                month: month.label,
                revenue: Math.round(revenue),
                target: Math.round(currentRevenue)
            };
        });
        
        res.json({ 
            success: true, 
            data: revenueData 
        });
    });
});

// ========================= NOUVELLE ROUTE POUR FORCER LA SYNCHRONISATION =========================

// GET - Synchroniser manuellement les statuts (pour debug/admin)
app.get('/admin/sync-statuses', authenticateToken, (req, res) => {
    console.log('🔄 Synchronisation manuelle demandée par utilisateur:', req.user.userId);
    
    try {
        // Lancer la synchronisation
        synchronizeAllStatuses();
        
        res.json({ 
            success: true, 
            message: 'Synchronisation des statuts lancée avec succès' 
        });
        
        console.log('✅ Synchronisation manuelle lancée avec succès');
    } catch (error) {
        console.error('❌ Erreur synchronisation manuelle:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la synchronisation: ' + error.message 
        });
    }
});

// ========================= ROUTES STATIQUES =========================

// Servir les fichiers statiques
app.use('/gestion-locative', express.static(path.join(__dirname)));

// Route par défaut pour servir le frontend
app.get('/gestion-locative/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
// backend/index.js - PARTIE 6/6 : Création des Tables et Démarrage du Serveur

// ========================= TABLE ET FONCTIONS POUR RESET PASSWORD =========================

// Créer la table pour les tokens de réinitialisation
const createPasswordResetTable = () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS password_resets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            token VARCHAR(255) NOT NULL UNIQUE,
            user_id INT,
            expires_at TIMESTAMP NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP NULL,
            INDEX idx_email_token (email, token),
            INDEX idx_token (token),
            INDEX idx_expires_at (expires_at),
            FOREIGN KEY (user_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
        )
    `;

    db.query(createTableQuery, (err) => {
        if (err) {
            console.error('Erreur création table password_resets:', err);
        } else {
            console.log('✅ Table password_resets créée/vérifiée');
        }
    });
};

// Créer la table au démarrage (ajouter après createVerificationTable)
setTimeout(createPasswordResetTable, 6500);

// Nettoyer les tokens expirés (tous les 30 minutes)
setInterval(() => {
    db.query('DELETE FROM password_resets WHERE expires_at < NOW() OR used = TRUE', (err, result) => {
        if (err) {
            console.error('Erreur nettoyage tokens expirés:', err);
        } else if (result.affectedRows > 0) {
            console.log(`🧹 ${result.affectedRows} token(s) de réinitialisation expirés supprimés`);
        }
    });
}, 30 * 60 * 1000);

// ========================= SCRIPT DE CRÉATION DES TABLES =========================

function createOrUpdateTables() {
    const tables = {
        utilisateurs: {
            create: `
                CREATE TABLE utilisateurs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nom VARCHAR(100) NOT NULL,
                    prenom VARCHAR(100) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    telephone VARCHAR(20),
                    entreprise VARCHAR(255),
                    devise VARCHAR(3) DEFAULT 'EUR',
                    langue VARCHAR(2) DEFAULT 'fr',
                    notifications_email BOOLEAN DEFAULT TRUE,
                    notifications_retards BOOLEAN DEFAULT TRUE,
                    sauvegarde_auto BOOLEAN DEFAULT TRUE,
                    taux_tva DECIMAL(5,2) DEFAULT 20.00,
                    frais_gestion DECIMAL(5,2) DEFAULT 8.00,
                    commission_agence DECIMAL(5,2) DEFAULT 0.00,
                    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    derniere_connexion TIMESTAMP NULL,
                    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `,
            alters: [
                `ADD COLUMN IF NOT EXISTS telephone VARCHAR(20)`,
                `ADD COLUMN IF NOT EXISTS entreprise VARCHAR(255)`,
                `ADD COLUMN IF NOT EXISTS devise VARCHAR(3) DEFAULT 'EUR'`,
                `ADD COLUMN IF NOT EXISTS langue VARCHAR(2) DEFAULT 'fr'`,
                `ADD COLUMN IF NOT EXISTS notifications_email BOOLEAN DEFAULT TRUE`,
                `ADD COLUMN IF NOT EXISTS notifications_retards BOOLEAN DEFAULT TRUE`,
                `ADD COLUMN IF NOT EXISTS sauvegarde_auto BOOLEAN DEFAULT TRUE`,
                `ADD COLUMN IF NOT EXISTS taux_tva DECIMAL(5,2) DEFAULT 20.00`,
                `ADD COLUMN IF NOT EXISTS frais_gestion DECIMAL(5,2) DEFAULT 8.00`,
                `ADD COLUMN IF NOT EXISTS commission_agence DECIMAL(5,2) DEFAULT 0.00`,
                `ADD COLUMN IF NOT EXISTS derniere_connexion TIMESTAMP NULL`
            ]
        },
        appartements: {
            create: `
                CREATE TABLE appartements (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    utilisateur_id INT NOT NULL,
                    titre VARCHAR(255) NOT NULL,
                    adresse_complete TEXT NOT NULL,
                    code_postal VARCHAR(10),
                    ville VARCHAR(100),
                    surface DECIMAL(10,2),
                    nb_pieces INT,
                    nb_chambres INT,
                    prix_loyer DECIMAL(10,2),
                    charges DECIMAL(10,2),
                    depot_garantie DECIMAL(10,2),
                    statut ENUM('libre', 'occupé', 'en_travaux') DEFAULT 'libre',
                    description TEXT,
                    photo_principale VARCHAR(500),
                    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
                )
            `,
            alters: [
                `ADD COLUMN IF NOT EXISTS utilisateur_id INT`,
                `ADD COLUMN IF NOT EXISTS code_postal VARCHAR(10)`,
                `ADD COLUMN IF NOT EXISTS ville VARCHAR(100)`,
                `ADD COLUMN IF NOT EXISTS surface DECIMAL(10,2)`,
                `ADD COLUMN IF NOT EXISTS nb_pieces INT`,
                `ADD COLUMN IF NOT EXISTS nb_chambres INT`,
                `ADD COLUMN IF NOT EXISTS prix_loyer DECIMAL(10,2)`,
                `ADD COLUMN IF NOT EXISTS charges DECIMAL(10,2)`,
                `ADD COLUMN IF NOT EXISTS depot_garantie DECIMAL(10,2)`,
                `ADD COLUMN IF NOT EXISTS statut ENUM('libre','occupé','en_travaux') DEFAULT 'libre'`,
                `ADD COLUMN IF NOT EXISTS description TEXT`,
                `ADD COLUMN IF NOT EXISTS photo_principale VARCHAR(500)`
            ]
        },
        locataires: {
            create: `
                CREATE TABLE locataires (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    utilisateur_id INT NOT NULL,
                    nom VARCHAR(100) NOT NULL,
                    prenom VARCHAR(100) NOT NULL,
                    email VARCHAR(255),
                    telephone VARCHAR(20),
                    date_naissance DATE,
                    profession VARCHAR(255),
                    salaire DECIMAL(10,2),
                    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
                )
            `,
            alters: [
                `ADD COLUMN IF NOT EXISTS utilisateur_id INT`,
                `ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
                `ADD COLUMN IF NOT EXISTS telephone VARCHAR(20)`,
                `ADD COLUMN IF NOT EXISTS date_naissance DATE`,
                `ADD COLUMN IF NOT EXISTS profession VARCHAR(255)`,
                `ADD COLUMN IF NOT EXISTS salaire DECIMAL(10,2)`
            ]
        },
        locations: {
            create: `
                CREATE TABLE locations (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    appartement_id INT NOT NULL,
                    locataire_id INT NOT NULL,
                    date_debut DATE NOT NULL,
                    date_fin DATE,
                    loyer_mensuel DECIMAL(10,2) NOT NULL,
                    charges_mensuelles DECIMAL(10,2),
                    depot_garantie DECIMAL(10,2),
                    statut ENUM('active','terminee','resiliee') DEFAULT 'active',
                    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (appartement_id) REFERENCES appartements(id) ON DELETE CASCADE,
                    FOREIGN KEY (locataire_id) REFERENCES locataires(id) ON DELETE CASCADE
                )
            `,
            alters: [
                `ADD COLUMN IF NOT EXISTS charges_mensuelles DECIMAL(10,2)`,
                `ADD COLUMN IF NOT EXISTS depot_garantie DECIMAL(10,2)`,
                `ADD COLUMN IF NOT EXISTS statut ENUM('active','terminee','resiliee') DEFAULT 'active'`,
                `ADD COLUMN IF NOT EXISTS date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
            ]
        },
        medias: {
            create: `
                CREATE TABLE medias (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    appartement_id INT NOT NULL,
                    nom_fichier VARCHAR(255) NOT NULL,
                    chemin_fichier TEXT NOT NULL,
                    url VARCHAR(500),
                    type_media ENUM('photo','video') NOT NULL,
                    ordre_affichage INT DEFAULT 0,
                    date_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (appartement_id) REFERENCES appartements(id) ON DELETE CASCADE
                )
            `,
            alters: [
                `ADD COLUMN IF NOT EXISTS ordre_affichage INT DEFAULT 0`,
                `ADD COLUMN IF NOT EXISTS url VARCHAR(500)`
            ]
        },
        documents: {
            create: `
                CREATE TABLE documents (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    appartement_id INT,
                    locataire_id INT,
                    location_id INT,
                    nom_document VARCHAR(255) NOT NULL,
                    type_document ENUM(
                      'piece_identite','bulletin_salaire','justificatif_domicile',
                      'document_garant','contrat_travail','avis_imposition',
                      'bail','etat_lieux','assurance','facture','quittance','autre'
                    ) NOT NULL,
                    chemin_fichier TEXT NOT NULL,
                    url VARCHAR(500),
                    description TEXT,
                    date_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (appartement_id) REFERENCES appartements(id) ON DELETE CASCADE,
                    FOREIGN KEY (locataire_id) REFERENCES locataires(id) ON DELETE CASCADE,
                    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
                )
            `,
            alters: [
                `ADD COLUMN IF NOT EXISTS description TEXT`,
                `ADD COLUMN IF NOT EXISTS url VARCHAR(500)`
            ]
        },
        paiements: {
            create: `
                CREATE TABLE paiements (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    locataire_id INT NOT NULL,
                    appartement_id INT,
                    location_id INT,
                    type_paiement ENUM('loyer','charges','depot_garantie','autre') NOT NULL,
                    montant DECIMAL(10,2) NOT NULL,
                    date_paiement DATE NOT NULL,
                    methode_paiement ENUM('virement','cheque','especes','carte') NOT NULL,
                    description TEXT,
                    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (locataire_id) REFERENCES locataires(id) ON DELETE CASCADE,
                    FOREIGN KEY (appartement_id) REFERENCES appartements(id) ON DELETE SET NULL,
                    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
                )
            `,
            alters: [
                `ADD COLUMN IF NOT EXISTS description TEXT`
            ]
        },
        factures: {
            create: `
                CREATE TABLE factures (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    appartement_id INT,
                    location_id INT,
                    type_facture ENUM('loyer','charges','travaux','assurance','autre') NOT NULL,
                    numero_facture VARCHAR(100),
                    montant DECIMAL(10,2) NOT NULL,
                    date_facture DATE NOT NULL,
                    date_echeance DATE,
                    statut ENUM('en_attente','payée','en_retard','annulée') DEFAULT 'en_attente',
                    description TEXT,
                    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (appartement_id) REFERENCES appartements(id) ON DELETE CASCADE,
                    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
                )
            `,
            alters: [
                `ADD COLUMN IF NOT EXISTS numero_facture VARCHAR(100)`,
                `ADD COLUMN IF NOT EXISTS date_echeance DATE`,
                `ADD COLUMN IF NOT EXISTS statut ENUM('en_attente','payée','en_retard','annulée') DEFAULT 'en_attente'`,
                `ADD COLUMN IF NOT EXISTS description TEXT`
            ]
        }
    };

    Object.entries(tables).forEach(([tableName, config]) => {
        db.query(`SHOW TABLES LIKE '${tableName}'`, (err, result) => {
            if (err) {
                console.error(`Erreur vérification table ${tableName}:`, err);
                return;
            }

            if (result.length === 0) {
                // Création table
                db.query(config.create, (err2) => {
                    if (err2) {
                        console.error(`Erreur création ${tableName}:`, err2);
                    } else {
                        console.log(`✅ Table ${tableName} créée.`);
                    }
                });
            } else {
                // Table existante : apply ALTERs
                config.alters.forEach(alter => {
                    const query = `ALTER TABLE ${tableName} ${alter}`;
                    db.query(query, (err3) => {
                        if (err3 && !/Duplicate column/.test(err3.message)) {
                            console.error(`Erreur ALTER ${tableName}:`, err3);
                        }
                    });
                });
                console.log(`✅ Table ${tableName} mise à jour.`);
            }
        });
    });

    // Ajouter les contraintes de clé étrangère si nécessaire
    setTimeout(() => {
        const foreignKeys = [
            {
                table: 'appartements',
                constraint: 'fk_appartements_utilisateur',
                sql: `ALTER TABLE appartements ADD CONSTRAINT fk_appartements_utilisateur 
                      FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE`
            },
            {
                table: 'locataires',
                constraint: 'fk_locataires_utilisateur',
                sql: `ALTER TABLE locataires ADD CONSTRAINT fk_locataires_utilisateur 
                      FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE`
            }
        ];

        foreignKeys.forEach(fk => {
            db.query(fk.sql, (err) => {
                if (err && !err.message.includes('already exists')) {
                    console.error(`Erreur ajout contrainte ${fk.constraint}:`, err.message);
                } else if (!err) {
                    console.log(`✅ Contrainte ${fk.constraint} ajoutée.`);
                }
            });
        });
    }, 2000);

    // Ajouter les index pour améliorer les performances
    setTimeout(() => {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_locations_statut ON locations(statut)',
            'CREATE INDEX IF NOT EXISTS idx_locations_appartement_statut ON locations(appartement_id, statut)',
            'CREATE INDEX IF NOT EXISTS idx_locations_locataire_statut ON locations(locataire_id, statut)',
            'CREATE INDEX IF NOT EXISTS idx_locations_dates ON locations(date_debut, date_fin)',
            'CREATE INDEX IF NOT EXISTS idx_appartements_statut ON appartements(statut)',
            'CREATE INDEX IF NOT EXISTS idx_appartements_utilisateur ON appartements(utilisateur_id)',
            'CREATE INDEX IF NOT EXISTS idx_locataires_utilisateur ON locataires(utilisateur_id)',
            'CREATE INDEX IF NOT EXISTS idx_paiements_locataire ON paiements(locataire_id)',
            'CREATE INDEX IF NOT EXISTS idx_documents_appartement ON documents(appartement_id)',
            'CREATE INDEX IF NOT EXISTS idx_documents_locataire ON documents(locataire_id)'
        ];

        indexes.forEach(indexQuery => {
            db.query(indexQuery, (err) => {
                if (err && !err.message.includes('already exists')) {
                    console.error('Erreur création index:', err.message);
                }
            });
        });
        console.log('✅ Index de performance créés.');
    }, 3000);

    // Mettre à jour les données existantes pour s'assurer de la cohérence
    setTimeout(() => {
        // Mettre à jour les statuts des locations existantes
        db.query(`
            UPDATE locations 
            SET statut = 'active' 
            WHERE statut IS NULL AND (date_fin IS NULL OR date_fin > CURDATE())
        `);

        db.query(`
            UPDATE locations 
            SET statut = 'terminee' 
            WHERE statut IS NULL AND date_fin IS NOT NULL AND date_fin <= CURDATE()
        `);

        // Synchroniser les statuts des appartements avec les locations
        db.query(`
            UPDATE appartements a
            SET statut = CASE 
                WHEN EXISTS (
                    SELECT 1 FROM locations l 
                    WHERE l.appartement_id = a.id AND l.statut = 'active'
                ) THEN 'occupé'
                ELSE 'libre'
            END
        `);

        console.log('✅ Données existantes mises à jour pour cohérence.');
    }, 4000);
}

// ========================= MIDDLEWARE D'ERREURS =========================

// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('Erreur:', err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Erreur interne du serveur' 
    });
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route non trouvée'
    });
});

// ========================= DÉMARRAGE DU SERVEUR =========================

// Créer les tables au démarrage
setTimeout(() => {
    createOrUpdateTables();
}, 1000);

// ========================= GESTION AUTOMATIQUE DES STATUTS =========================

// Fonction pour mettre à jour les statuts des locations expirées
const updateExpiredLocations = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Mettre à jour les locations expirées (date_fin < aujourd'hui et statut = 'active')
    const updateLocationQuery = `
        UPDATE locations 
        SET statut = 'terminee' 
        WHERE date_fin < ? AND statut = 'active'
    `;
    
    db.query(updateLocationQuery, [today], (err, result) => {
        if (err) {
            console.error('Erreur mise à jour locations expirées:', err);
            return;
        }
        
        if (result.affectedRows > 0) {
            console.log(`✅ ${result.affectedRows} location(s) expirée(s) mise(s) à jour`);
            
            // Mettre à jour les statuts des appartements correspondants
            const updateApartmentQuery = `
                UPDATE appartements a
                SET statut = CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM locations l 
                        WHERE l.appartement_id = a.id AND l.statut = 'active'
                    ) THEN 'occupé'
                    ELSE 'libre'
                END
                WHERE a.id IN (
                    SELECT DISTINCT appartement_id 
                    FROM locations 
                    WHERE date_fin < ? AND statut = 'terminee'
                )
            `;
            
            db.query(updateApartmentQuery, [today], (err2, result2) => {
                if (err2) {
                    console.error('Erreur mise à jour statuts appartements:', err2);
                } else {
                    console.log(`✅ ${result2.affectedRows} appartement(s) mis à jour suite aux locations expirées`);
                }
            });
        }
    });
};

// Fonction pour synchroniser tous les statuts
const synchronizeAllStatuses = () => {
    console.log('🔄 Synchronisation des statuts en cours...');
    
    // 1. Mettre à jour les locations expirées
    updateExpiredLocations();
    
    // 2. Synchroniser tous les statuts des appartements
    const syncApartmentQuery = `
        UPDATE appartements a
        SET statut = CASE 
            WHEN EXISTS (
                SELECT 1 FROM locations l 
                WHERE l.appartement_id = a.id AND l.statut = 'active'
            ) THEN 'occupé'
            WHEN a.statut = 'en_travaux' THEN 'en_travaux'
            ELSE 'libre'
        END
    `;
    
    db.query(syncApartmentQuery, (err, result) => {
        if (err) {
            console.error('Erreur synchronisation appartements:', err);
        } else {
            console.log(`✅ Synchronisation terminée - ${result.affectedRows} appartement(s) mis à jour`);
        }
    });
};

const autoSyncBankData = async () => {
    console.log('🔄 Synchronisation bancaire automatique lancée...');
    
    try {
        const query = util.promisify(db.query).bind(db);
        
        // Récupérer utilisateurs avec connexion bancaire qui ont besoin de sync
        const usersQuery = `
            SELECT id, gocardless_requisition_id, gocardless_last_refresh 
            FROM utilisateurs 
            WHERE gocardless_requisition_id IS NOT NULL
            AND (
                gocardless_last_refresh IS NULL 
                OR gocardless_last_refresh < DATE_SUB(NOW(), INTERVAL 20 HOUR)
            )
            LIMIT 10
        `;
        
        const users = await query(usersQuery);
        
        console.log(`🔄 ${users.length} utilisateur(s) à synchroniser`);
        
        for (const user of users) {
            try {
                console.log(`🔄 Sync utilisateur ${user.id}`);
                
                // Synchroniser les comptes
                await getCachedAccountData(user.id, 'accounts', null, true);
                
                // Attendre 2 secondes entre chaque utilisateur
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                console.log(`✅ Sync réussie pour utilisateur ${user.id}`);
                
            } catch (error) {
                console.log(`❌ Échec sync utilisateur ${user.id}:`, error.message);
                
                // Si rate limit atteint, arrêter les syncs
                if (error.message.includes('Rate limit')) {
                    console.log('🚫 Rate limit atteint, arrêt des synchronisations');
                    break;
                }
            }
        }
        
        console.log('🔄 Synchronisation automatique terminée');
        
    } catch (error) {
        console.error('❌ Erreur synchronisation automatique:', error);
    }
};

// Programmer la synchronisation automatique tous les jours à 3h du matin
cron.schedule('0 3 * * *', autoSyncBankData);

// Exécuter la synchronisation toutes les heures
setInterval(synchronizeAllStatuses, 60 * 60 * 1000); // 1 heure

// Exécuter la synchronisation au démarrage
setTimeout(() => {
    console.log('🚀 Première synchronisation des statuts...');
    synchronizeAllStatuses();
}, 5000); // Attendre 5s après le démarrage


app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📊 Base de données: gestion-locative`);
    console.log(`📁 Fichiers uploadés dans: ./uploads/`);
    console.log(`🌐 Interface web: http://localhost:${PORT}/gestion-locative`);
    console.log(`🔐 Authentification activée avec JWT`);
    console.log(`✨ Nouvelles fonctionnalités de gestion des locations activées`);
    console.log('');
    console.log('🏠 Nouvelles routes locations disponibles:');
    console.log('   GET    /tenants/:id/locations - Toutes les locations d\'un locataire');
    console.log('   GET    /locations/:id - Détails d\'une location');
    console.log('   PUT    /locations/:id - Modifier une location');
    console.log('   DELETE /locations/:id - Supprimer une location');
    console.log('   PUT    /locations/:id/terminate - Terminer une location');
    console.log('   GET    /locations/stats - Statistiques des locations');
    console.log('   GET    /apartments/:id/availability - Vérifier disponibilité');
});

// Gestion propre de l'arrêt du serveur
process.on('SIGINT', () => {
    console.log('\n⏹️  Arrêt du serveur...');
    db.end(() => {
        console.log('🔌 Connexion à la base de données fermée');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n⏹️  Arrêt du serveur...');
    db.end(() => {
        console.log('🔌 Connexion à la base de données fermée');
        process.exit(0);
    });
});

module.exports = app;