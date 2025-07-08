/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendQuestionAnsweredNotification = functions.firestore
  .document('questions/{questionId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Vérifier si le statut est passé à "answered"
    if (before.status !== 'answered' && after.status === 'answered') {
      const questionId = context.params.questionId;
      const questionText = after.text.length > 50 
        ? after.text.substring(0, 50) + '...' 
        : after.text;

      // Préparer la notification
      const payload = {
        notification: {
          title: "Nouvelle réponse disponible",
          body: `Pasteur D. a répondu à votre question: "${questionText}"`,
          icon: '/images/icon-192x192.png',
          click_action: `https://votredomaine.com/index.html?question=${questionId}`
        },
        data: {
          questionId: questionId,
          url: `/index.html?question=${questionId}`
        }
      };

      // Envoyer à tous les utilisateurs abonnés au topic
      return admin.messaging().sendToTopic('allUsers', payload);
    }
    return null;
  });