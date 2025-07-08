// server.js
const express = require('express');
const webpush = require('web-push');
const cors = require('cors');

// Initialisation
const app = express();
app.use(cors());
app.use(express.json());

// 1. Configurez vos clés VAPID (à générer une seule fois)
const vapidKeys = {
  publicKey: "BAJaEyB-JB257cR3KxQWaDHtcN19Qxlr-uWRFQD4WkJS4i3hDyGlnewr6U71A_hyMrU0R4AsiacN1gzXWBpJGCI",
  privateKey: "JI6W0LMMuPYceUsGu9PDsuUk6hgY_ZddC0vJDzymTz4"
};

webpush.setVapidDetails(
  'mailto:contact@votresite.com', // Identifiant de contact
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// 2. Endpoint pour envoyer des notifications
app.post('/send-notification', async (req, res) => {
  const { subscription, payload } = req.body;

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Échec de l\'envoi' });
  }
});

// 3. Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur en écoute sur http://localhost:${PORT}`);
});