// backend/security-enhancements.js - Fonctionnalités avancées de sécurité 2FA

// ========================= DÉTECTION D'ACTIVITÉ SUSPECTE =========================

const geoip = require('geoip-lite'); // npm install geoip-lite
const UAParser = require('ua-parser-js'); // npm install ua-parser-js

// Fonction pour détecter une activité suspecte
const detectSuspiciousActivity = (req, user) => {
    const currentIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    const geo = geoip.lookup(currentIP);
    
    const suspiciousFactors = {
        newLocation: false,
        newDevice: false,
        rapidRequests: false,
        unusualTime: false,
        score: 0
    };

    // Vérifier si c'est une nouvelle localisation
    if (user.last_login_ip && user.last_login_ip !== currentIP) {
        const lastGeo = geoip.lookup(user.last_login_ip);
        if (lastGeo && geo && lastGeo.country !== geo.country) {
            suspiciousFactors.newLocation = true;
            suspiciousFactors.score += 30;
        }
    }

    // Vérifier si c'est un nouvel appareil
    const parser = new UAParser(userAgent);
    const currentDevice = `${parser.getBrowser().name}_${parser.getOS().name}`;
    if (user.last_device && user.last_device !== currentDevice) {
        suspiciousFactors.newDevice = true;
        suspiciousFactors.score += 20;
    }

    // Vérifier les heures inhabituelles (entre 2h et 6h du matin)
    const currentHour = new Date().getHours();
    if (currentHour >= 2 && currentHour <= 6) {
        suspiciousFactors.unusualTime = true;
        suspiciousFactors.score += 10;
    }

    return suspiciousFactors;
};

// Envoyer une alerte de sécurité
const sendSecurityAlert = async (email, alertData, userFirstName) => {
    const alertTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Alerte de Sécurité - Gestion Locative</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 40px;">
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                    <span style="color: white; font-size: 24px;">⚠️</span>
                </div>
                <h1 style="color: #1f2937; margin: 0; font-size: 28px;">Alerte de Sécurité</h1>
            </div>
            
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
                <h2 style="color: #dc2626; margin: 0 0 15px 0; font-size: 22px;">Bonjour ${userFirstName || ''},</h2>
                <p style="color: #7f1d1d; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                    Nous avons détecté une tentative de connexion inhabituelle sur votre compte :
                </p>
                
                <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #dc2626; margin: 0 0 15px 0; font-size: 18px;">Détails de la connexion :</h3>
                    <div style="color: #374151; font-size: 14px; line-height: 1.6;">
                        <p><strong>📅 Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
                        <p><strong>🌍 Localisation :</strong> ${alertData.location || 'Inconnue'}</p>
                        <p><strong>💻 Appareil :</strong> ${alertData.device || 'Inconnu'}</p>
                        <p><strong>🌐 Adresse IP :</strong> ${alertData.ip}</p>
                        <p><strong>⚡ Score de risque :</strong> <span style="color: ${alertData.score > 50 ? '#dc2626' : '#f59e0b'};">${alertData.score}/100</span></p>
                    </div>
                </div>
                
                ${alertData.score > 50 ? `
                <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: bold;">
                        🔒 Recommandation : Changez immédiatement votre mot de passe si cette connexion ne vient pas de vous.
                    </p>
                </div>
                ` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://gestion-locative.fr'}/settings?tab=security" 
                   style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    Vérifier la Sécurité de mon Compte
                </a>
            </div>
            
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <h4 style="color: #374151; margin: 0 0 10px 0;">Actions de sécurité recommandées :</h4>
                <ul style="color: #6b7280; font-size: 14px; margin: 0; padding-left: 20px;">
                    <li>Vérifiez l'historique de vos connexions</li>
                    <li>Changez votre mot de passe si nécessaire</li>
                    <li>Activez les notifications de sécurité</li>
                    <li>Déconnectez les sessions suspectes</li>
                </ul>
            </div>
            
            <div style="text-align: center; color: #6b7280; font-size: 12px; line-height: 1.5; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <p>Gestion Locative - Votre sécurité est notre priorité</p>
                <p>© ${new Date().getFullYear()} - Si vous n'avez pas tenté de vous connecter, contactez immédiatement notre support.</p>
            </div>
        </div>
    </body>
    </html>`;

    const mailOptions = {
        from: {
            name: 'Sécurité Gestion Locative',
            address: process.env.SMTP_USER
        },
        to: email,
        subject: `🚨 Alerte de Sécurité - Connexion suspecte détectée`,
        html: alertTemplate,
        text: `
Alerte de Sécurité - Gestion Locative

Bonjour ${userFirstName || ''},

Nous avons détecté une tentative de connexion inhabituelle sur votre compte.

Détails :
- Date : ${new Date().toLocaleString('fr-FR')}
- Localisation : ${alertData.location || 'Inconnue'}
- Appareil : ${alertData.device || 'Inconnu'}
- IP : ${alertData.ip}
- Score de risque : ${alertData.score}/100

Si cette connexion ne vient pas de vous, changez immédiatement votre mot de passe.

Gestion Locative - Équipe Sécurité
        `
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log('🚨 Alerte de sécurité envoyée à:', email);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Erreur envoi alerte sécurité:', error);
        return { success: false, error: error.message };
    }
};

// ========================= HISTORIQUE DES CONNEXIONS =========================

// Créer la table d'historique des connexions
const createLoginHistoryTable = () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS login_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            email VARCHAR(255) NOT NULL,
            ip_address VARCHAR(45),
            user_agent TEXT,
            location_country VARCHAR(3),
            location_city VARCHAR(100),
            device_info VARCHAR(255),
            browser_info VARCHAR(255),
            success BOOLEAN DEFAULT TRUE,
            suspicious_score INT DEFAULT 0,
            two_fa_used BOOLEAN DEFAULT TRUE,
            session_duration INT,
            logout_reason ENUM('manual', 'timeout', 'forced', 'error') DEFAULT 'manual',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            session_ended_at TIMESTAMP NULL,
            INDEX idx_user_id (user_id),
            INDEX idx_created_at (created_at),
            INDEX idx_ip_address (ip_address),
            FOREIGN KEY (user_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
        )
    `;

    db.query(createTableQuery, (err) => {
        if (err) {
            console.error('Erreur création table login_history:', err);
        } else {
            console.log('✅ Table login_history créée/vérifiée');
        }
    });
};

// Enregistrer une connexion dans l'historique
const logLoginAttempt = async (user, req, success = true, suspiciousScore = 0) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    const geo = geoip.lookup(ip);
    const parser = new UAParser(userAgent);

    const loginData = {
        user_id: user.id,
        email: user.email,
        ip_address: ip,
        user_agent: userAgent,
        location_country: geo?.country || null,
        location_city: geo?.city || null,
        device_info: `${parser.getOS().name} ${parser.getOS().version}`,
        browser_info: `${parser.getBrowser().name} ${parser.getBrowser().version}`,
        success: success,
        suspicious_score: suspiciousScore,
        two_fa_used: true
    };

    const insertQuery = `
        INSERT INTO login_history (
            user_id, email, ip_address, user_agent, location_country, 
            location_city, device_info, browser_info, success, 
            suspicious_score, two_fa_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = Object.values(loginData);

    db.query(insertQuery, values, (err, result) => {
        if (err) {
            console.error('Erreur enregistrement historique connexion:', err);
        } else {
            console.log(`📊 Connexion ${success ? 'réussie' : 'échouée'} enregistrée pour ${user.email}`);
        }
    });

    // Mettre à jour les informations de dernière connexion de l'utilisateur
    if (success) {
        const updateUserQuery = `
            UPDATE utilisateurs 
            SET last_login_ip = ?, last_device = ?, derniere_connexion = NOW()
            WHERE id = ?
        `;
        
        const deviceInfo = `${parser.getBrowser().name}_${parser.getOS().name}`;
        db.query(updateUserQuery, [ip, deviceInfo, user.id]);
    }
};

// ========================= ROUTES AVANCÉES =========================

// POST - Connexion avec détection de fraude améliorée
app.post('/auth/login-request-advanced', async (req, res) => {
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
                // Log tentative avec email inexistant
                await logLoginAttempt({ id: null, email }, req, false, 100);
                return res.status(400).json({ success: false, message: 'Email ou mot de passe incorrect' });
            }

            const user = results[0];

            // Vérifier le mot de passe
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                await logLoginAttempt(user, req, false, 80);
                return res.status(400).json({ success: false, message: 'Email ou mot de passe incorrect' });
            }

            // Analyser l'activité suspecte
            const suspiciousActivity = detectSuspiciousActivity(req, user);
            
            // Si score de suspicion élevé, envoyer une alerte
            if (suspiciousActivity.score >= 30) {
                const geo = geoip.lookup(userIP);
                const parser = new UAParser(userAgent);
                
                const alertData = {
                    ip: userIP,
                    location: geo ? `${geo.city}, ${geo.country}` : 'Inconnue',
                    device: `${parser.getBrowser().name} sur ${parser.getOS().name}`,
                    score: suspiciousActivity.score
                };

                // Envoyer l'alerte en arrière-plan
                sendSecurityAlert(email, alertData, user.prenom)
                    .catch(err => console.error('Erreur envoi alerte:', err));
            }

            // Générer et sauvegarder le code de vérification
            const verificationCode = generateVerificationCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            // Supprimer les anciens codes
            db.query('DELETE FROM email_verifications WHERE email = ?', [email]);

            // Insérer le nouveau code avec score de suspicion
            const insertQuery = `
                INSERT INTO email_verifications (
                    email, code, user_id, expires_at, ip_address, user_agent, suspicious_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            const insertValues = [email, verificationCode, user.id, expiresAt, userIP, userAgent, suspiciousActivity.score];

            // Ajouter la colonne suspicious_score si elle n'existe pas
            db.query('ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS suspicious_score INT DEFAULT 0', () => {
                db.query(insertQuery, insertValues, async (err) => {
                    if (err) {
                        console.error('Erreur sauvegarde code:', err);
                        return res.status(500).json({ success: false, message: 'Erreur serveur' });
                    }

                    // Adapter le template email selon le niveau de suspicion
                    const isHighRisk = suspiciousActivity.score >= 50;
                    const emailTemplate = isHighRisk ? 'high-risk' : 'normal';
                    
                    const emailResult = await sendVerificationEmail(email, verificationCode, user.prenom, emailTemplate, suspiciousActivity);
                    
                    if (emailResult.success) {
                        res.json({
                            success: true,
                            message: 'Code de vérification envoyé par email',
                            email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
                            expiresIn: 600,
                            securityLevel: isHighRisk ? 'high' : 'normal',
                            suspiciousFactors: suspiciousActivity
                        });
                    } else {
                        res.status(500).json({
                            success: false,
                            message: 'Erreur lors de l\'envoi de l\'email de vérification'
                        });
                    }
                });
            });
        });
    } catch (error) {
        console.error('Erreur login request avancé:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// POST - Vérification avec logging avancé
app.post('/auth/verify-code-advanced', async (req, res) => {
    const { email, code, rememberMe } = req.body;
    const userIP = req.ip || req.connection.remoteAddress;

    try {
        const verifyQuery = `
            SELECT ev.*, u.* 
            FROM email_verifications ev
            JOIN utilisateurs u ON ev.user_id = u.id
            WHERE ev.email = ? AND ev.code = ? AND ev.expires_at > NOW() AND ev.verified = FALSE
            ORDER BY ev.created_at DESC
            LIMIT 1
        `;

        db.query(verifyQuery, [email, code], async (err, results) => {
            if (err) {
                console.error('Erreur vérification code:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            if (results.length === 0) {
                // Log tentative avec code incorrect
                db.query('SELECT * FROM utilisateurs WHERE email = ?', [email], (err2, userResults) => {
                    if (!err2 && userResults.length > 0) {
                        logLoginAttempt(userResults[0], req, false, 60);
                    }
                });

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

            if (verification.attempts >= 3) {
                await logLoginAttempt(verification, req, false, 90);
                return res.status(400).json({
                    success: false,
                    message: 'Trop de tentatives. Demandez un nouveau code.',
                    tooManyAttempts: true
                });
            }

            // Marquer comme vérifié et enregistrer la connexion réussie
            db.query(
                'UPDATE email_verifications SET verified = TRUE, verified_at = NOW() WHERE id = ?',
                [verification.id],
                async (err) => {
                    if (err) {
                        console.error('Erreur mise à jour vérification:', err);
                        return res.status(500).json({ success: false, message: 'Erreur serveur' });
                    }

                    // Log connexion réussie
                    await logLoginAttempt(verification, req, true, verification.suspicious_score || 0);

                    // Générer le token JWT
                    const tokenExpiry = rememberMe ? '30d' : '7d';
                    const token = jwt.sign(
                        { 
                            userId: verification.user_id, 
                            email: verification.email,
                            loginTime: Date.now(),
                            securityLevel: verification.suspicious_score > 50 ? 'high' : 'normal'
                        },
                        JWT_SECRET,
                        { expiresIn: tokenExpiry }
                    );

                    // Nettoyer les données sensibles
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
                        token,
                        securityInfo: {
                            securityLevel: verification.suspicious_score > 50 ? 'high' : 'normal',
                            loginLocation: geoip.lookup(userIP)?.city || 'Inconnue',
                            deviceTrusted: verification.suspicious_score < 20
                        }
                    });
                }
            );
        });
    } catch (error) {
        console.error('Erreur verify code avancé:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// GET - Historique des connexions utilisateur
app.get('/auth/login-history', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { limit = 20, offset = 0 } = req.query;

    const query = `
        SELECT 
            ip_address,
            location_country,
            location_city,
            device_info,
            browser_info,
            success,
            suspicious_score,
            created_at,
            session_ended_at,
            logout_reason
        FROM login_history 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    `;

    db.query(query, [userId, parseInt(limit), parseInt(offset)], (err, results) => {
        if (err) {
            console.error('Erreur récupération historique:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        // Formater les résultats
        const history = results.map(item => ({
            ...item,
            location: item.location_city && item.location_country 
                ? `${item.location_city}, ${item.location_country}`
                : 'Localisation inconnue',
            trustLevel: item.suspicious_score < 20 ? 'Confiance' : 
                        item.suspicious_score < 50 ? 'Moyen' : 'Suspect',
            isCurrentSession: !item.session_ended_at
        }));

        res.json({ success: true, data: history });
    });
});

// POST - Déconnecter toutes les autres sessions
app.post('/auth/logout-other-sessions', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const currentLoginTime = req.user.loginTime;

    // Cette route nécessiterait un système de gestion de sessions plus avancé
    // Pour l'instant, on peut marquer les sessions comme fermées dans l'historique
    
    const query = `
        UPDATE login_history 
        SET session_ended_at = NOW(), logout_reason = 'forced'
        WHERE user_id = ? AND session_ended_at IS NULL AND created_at < FROM_UNIXTIME(?)
    `;

    db.query(query, [userId, currentLoginTime / 1000], (err, result) => {
        if (err) {
            console.error('Erreur fermeture sessions:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        res.json({ 
            success: true, 
            message: `${result.affectedRows} session(s) fermée(s)`,
            closedSessions: result.affectedRows
        });
    });
});

// ========================= INITIALISATION =========================

// Créer les tables au démarrage
setTimeout(() => {
    createLoginHistoryTable();
}, 7000);

// Nettoyage avancé de l'historique (garder seulement 90 jours)
setInterval(() => {
    const query = 'DELETE FROM login_history WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)';
    db.query(query, (err, result) => {
        if (err) {
            console.error('Erreur nettoyage historique:', err);
        } else if (result.affectedRows > 0) {
            console.log(`🧹 ${result.affectedRows} entrée(s) d'historique anciennes supprimées`);
        }
    });
}, 24 * 60 * 60 * 1000); // Une fois par jour

console.log('✅ Fonctionnalités avancées de sécurité 2FA activées');
console.log('🔍 Détection de fraude : Géolocalisation, appareil, horaires');
console.log('📊 Historique des connexions : 90 jours de rétention');
console.log('🚨 Alertes de sécurité : Activité suspecte automatiquement signalée');

module.exports = {
    detectSuspiciousActivity,
    sendSecurityAlert,
    logLoginAttempt,
    createLoginHistoryTable
};