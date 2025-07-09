// Import the functions you need from the SDKs you need
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
        import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
        import { firebaseConfig } from './firebase-init.js';

        // 2. INITIALISATION FIREBASE
        let db;
        let auth;
        let currentUser = null;
        let categories = [];

        function initializeFirebase() {
          firebase.initializeApp(firebaseConfig);
          db = firebase.firestore();
          auth = firebase.auth();
          
          auth.onAuthStateChanged(user => {
            if (user) {
              currentUser = user;
              console.log("Utilisateur connecté:", user.email);
              loadQuestions();
            } else {
              console.log("Non connecté, redirection...");
              window.location.href = "login.html";
            }
          });
        }

        // async function sendPushNotification(questionId, questionText) {
        //   // 1. Récupérer tous les tokens d'abonnement depuis Firestore
        //   const subscriptions = await db.collection('subscriptions').get();
          
        //   // 2. Envoyer à chaque abonné (simplifié avec fetch)
        //   subscriptions.forEach(async (sub) => {
        //     const response = await fetch('https://votre-backend.com/send-notification', {
        //       method: 'POST',
        //       headers: { 'Content-Type': 'application/json' },
        //       body: JSON.stringify({
        //         subscription: sub.data(),
        //         payload: {
        //           title: "Nouvelle réponse disponible",
        //           body: questionText.slice(0, 50) + '...',
        //           data: { questionId }
        //         }
        //       })
        //     });
        //     console.log(await response.json());
        //   });
        // }

        async function loadCategories() {
            const response = await fetch('question-cat-list.json');
            categories = await response.json();
            populateCategorySelects();
        }

        // 3. CHARGEMENT DES QUESTIONS
        let isLoading = false;
        // Variables globales pour la pagination
        let currentPage = 1;
        const questionsPerPage = 10;

        async function loadQuestions() {
          if (isLoading) return;

          const container = document.getElementById('questions-container');
          showLoading(container);
          
          isLoading = true;

          try {
            const statusFilter = document.getElementById('filter-status').value;
            const categoryFilter = document.getElementById('filter-category').value;
            const searchText = document.getElementById('search').value.toLowerCase();

            let query = db.collection("questions");

            if (statusFilter !== "all" && categoryFilter === "all") {
              query = query.where("status", "==", statusFilter)
                         .orderBy("createdAt", "desc");
            } 
            else if (categoryFilter !== "all" && statusFilter === "all") {
              query = query.where("category", "==", categoryFilter)
                         .orderBy("createdAt", "desc");
            }
            else {
              query = query.orderBy("createdAt", "desc");
            }

            const snapshot = await query.get();
            container.innerHTML = '';

            // Filtrage côté client
            const allQuestions = [];
            snapshot.forEach(doc => {
              const data = doc.data();
              const matchesStatus = statusFilter === "all" || data.status === statusFilter;
              const matchesCategory = categoryFilter === "all" || data.category === categoryFilter;
              const matchesSearch = !searchText || data.text.toLowerCase().includes(searchText);

              if (matchesStatus && matchesCategory && matchesSearch) {
                allQuestions.push({ id: doc.id, ...data });
              }
            });

            if (allQuestions.length === 0) {
              container.innerHTML = `<div class="empty-state">Aucune question trouvée</div>`;
              return;
            }

            // Pagination
            const startIndex = (currentPage - 1) * questionsPerPage;
            const endIndex = startIndex + questionsPerPage;
            const paginatedQuestions = allQuestions.slice(startIndex, endIndex);

            // Affichage
            paginatedQuestions.forEach(item => renderQuestion(item.id, item));

            // Ajout de la pagination
            renderPagination(allQuestions.length);

          } catch (error) {
            showError(container, error);
          } finally {
            isLoading = false;
          }
        }

        function renderPagination(totalQuestions) {
            const totalPages = Math.ceil(totalQuestions / questionsPerPage);
            if (totalPages <= 1) return;

            const pagination = document.createElement('div');
            pagination.className = 'pagination';
            pagination.style.marginTop = '20px';
            pagination.style.display = 'flex';
            pagination.style.justifyContent = 'center';
            pagination.style.gap = '10px';

            // Bouton Précédent
            if (currentPage > 1) {
                const prevBtn = document.createElement('button');
                prevBtn.textContent = '← Précédent';
                prevBtn.onclick = () => {
                    currentPage--;
                    loadQuestions();
                };
                pagination.appendChild(prevBtn);
            }

            // Pages
            for (let i = 1; i <= totalPages; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.textContent = i;
                if (i === currentPage) {
                    pageBtn.style.fontWeight = 'bold';
                    pageBtn.style.backgroundColor = '#4a6fa5';
                    pageBtn.style.color = 'white';
                }
                pageBtn.onclick = () => {
                    currentPage = i;
                    loadQuestions();
                };
                pagination.appendChild(pageBtn);
            }

            // Bouton Suivant
            if (currentPage < totalPages) {
                const nextBtn = document.createElement('button');
                nextBtn.textContent = 'Suivant →';
                nextBtn.onclick = () => {
                    currentPage++;
                    loadQuestions();
                };
                pagination.appendChild(nextBtn);
            }

            const container = document.getElementById('questions-container');
            container.appendChild(pagination);
        }

        // Fonctions utilitaires
        function showLoading(container) {
          container.innerHTML = `
            <div class="loading-state active">
              <div class="loading-spinner"></div>
              <p>Chargement des questions...</p>
            </div>
          `;
        }

        function showError(container, error) {
          container.innerHTML = `
            <div class="error-state">
              ❌ Erreur : ${error.message}
              <button onclick="loadQuestions()">Réessayer</button>
            </div>
          `;
        }

        // 4. AFFICHAGE D'UNE QUESTION

        function ensureAbsoluteUrl(url) {
            // Si l'URL ne commence pas par http:// ou https://
            if (!/^https?:\/\//i.test(url)) {
                return 'https://' + url; // Force en HTTPS
            }
            return url;
        }
        function renderQuestion(id, data) {
          const container = document.getElementById('questions-container');
          const questionElement = document.createElement('div');
          
          questionElement.className = `question-card ${data.status}`;
          questionElement.dataset.id = id;
          
          questionElement.innerHTML = `
              <div class="question-header">
                <span class="question-category">${getCategoryName(data.category)}</span>
                <span class="status-badge status-${data.status}">${getStatusName(data.status)}</span>
              </div>
              <div class="question-text">${data.text}</div>
              <div class="question-meta">
                <strong>${data.author || "Anonyme"}</strong> • 
                ${formatDate(data.createdAt?.toDate())} • 
                ${data.votes || 0} votes
              </div>
              <div class="question-actions">
                ${data.status !== 'answered' ? `
                  <button class="btn btn-primary btn-view">Détails</button>
                ` : ''}
                
                ${data.status === 'new' ? `
                  <button class="btn btn-warning btn-select">Sélectionner</button>
                ` : ''}
                
                ${data.status === 'selected' ? `
                  <div class="response-inputs">
                    ${(data.responses || []).map((res, i) => `
                      <div class="response-input-group">
                        <input type="text" class="response-title" placeholder="Titre partie ${i+1}" value="${res.title || ''}">
                        <input type="text" class="video-link" placeholder="Lien YouTube..." value="${res.videoUrl || ''}">
                      </div>
                    `).join('')}
                    <div class="response-input-group">
                      <input type="text" class="response-title" placeholder="Nouveau titre">
                      <input type="text" class="video-link" placeholder="Nouveau lien YouTube...">
                    </div>
                  </div>
                  <button class="btn btn-success btn-answer">Enregistrer les réponses</button>
                  <button class="btn btn-warning btn-unselect">Désélectionner</button>
                ` : ''}
                
                ${data.status === 'answered' ? `
                  <div class="responses">
                    ${(data.responses || []).map((res, i) => `
                      <div class="response">
                        <a href="${ensureAbsoluteUrl(res.videoUrl)}" target="_blank" class="btn btn-primary">
                          Voir partie ${i + 1}: ${res.title}
                        </a>
                        <button class="btn btn-warning btn-edit-response" data-index="${i}">Modifier</button>
                      </div>
                    `).join('')}
                    ${data.videoLink ? `
                      <a href="${ensureAbsoluteUrl(data.videoLink)}" target="_blank" class="btn btn-primary">Voir la réponse</a>
                      <button class="btn btn-warning btn-edit-link">Modifier le lien</button>
                    ` : ''}
                  </div>
                  <button class="btn btn-warning btn-reopen">Rouvrir la question</button>
                ` : ''}
              </div>
            `;

          container.appendChild(questionElement);

          // bouton Détails :
          const detailsBtn = questionElement.querySelector('.btn-view');
          if (detailsBtn) {
            setupDetailsButton(detailsBtn, id, data);
          }
        }

        // 5. GESTION DES ACTIONS ADMIN
        document.addEventListener('click', async (e) => {
          if (!currentUser) return;
          
          const questionCard = e.target.closest('.question-card');
          if (!questionCard) return;
          
          const questionId = questionCard.dataset.id;
          const questionRef = db.collection("questions").doc(questionId);
          
          try {
            // Sélectionner une question
            if (e.target.classList.contains('btn-select')) {
              await questionRef.update({ status: 'selected' });
              showToast("Question sélectionnée");
              loadQuestions();
            }

            // Désélectionner une question
            if (e.target.classList.contains('btn-unselect')) {
              await questionRef.update({ status: 'new', responses: [] });
              showToast("Question désélectionnée");
              loadQuestions();
            }
            
            // Marquer comme répondue
            // else if (e.target.classList.contains('btn-answer')) {
            //   const videoLink = questionCard.querySelector('.video-link').value.trim();
              
            //   if (!videoLink) {
            //     showToast("Veuillez entrer un lien vidéo", "error");
            //     return;
            //   }
              
            //   await questionRef.update({
            //     status: 'answered',
            //     videoLink: videoLink
            //   });
              
            //   showToast("Réponse enregistrée");
            //   loadQuestions();
            // }

            // Enregistrer plusieurs réponses
            else if (e.target.classList.contains('btn-answer')) {
              const responseGroups = questionCard.querySelectorAll('.response-input-group');
              const responses = [];
              
              responseGroups.forEach(group => {
                const titleInput = group.querySelector('.response-title');
                const linkInput = group.querySelector('.video-link');
                
                if (titleInput.value && linkInput.value) {
                  responses.push({
                    title: titleInput.value,
                    videoUrl: linkInput.value
                  });
                }
              });
              
              if (responses.length === 0) {
                showToast("Veuillez entrer au moins une réponse valide", "error");
                return;
              }
              
              await questionRef.update({
                status: 'answered',
                responses: responses,
                videoLink: null // On efface l'ancien lien unique
              });

              await db.collection("questions").doc(questionId).update({
              status: 'answered',
              responses: responses,
              videoLink: null,
              answeredAt: firebase.firestore.FieldValue.serverTimestamp()
              });
              //sendPushNotification(questionId, questionText);
              
              showToast("Réponses enregistrées");
              loadQuestions();
            }
            
            // Modifier un lien existant
            else if (e.target.classList.contains('btn-edit-link')) {
              const newLink = prompt("Modifier le lien vidéo:", data.videoLink);
              if (newLink && newLink !== data.videoLink) {
                await questionRef.update({ videoLink: newLink });
                showToast("Lien mis à jour");
                loadQuestions();
              }
            }
            
            // Modifier une réponse existante
            else if (e.target.classList.contains('btn-edit-response')) {
              const index = e.target.dataset.index;
              const questionId = questionCard.dataset.id;
              
              // Récupérer les données actuelles de Firestore
              const questionDoc = await db.collection("questions").doc(questionId).get();
              if (!questionDoc.exists) return;
              
              const questionData = questionDoc.data();
              const responses = questionData.responses || [];
              
              if (index >= responses.length) return;
              
              const response = responses[index];
              
              const newTitle = prompt("Modifier le titre:", response.title);
              const newUrl = prompt("Modifier l'URL:", response.videoUrl);
              
              if (newTitle !== null && newUrl !== null) {
                const updatedResponses = [...responses];
                updatedResponses[index] = {
                  title: newTitle,
                  videoUrl: newUrl
                };
                
                await db.collection("questions").doc(questionId).update({ 
                  responses: updatedResponses 
                });
                showToast("Réponse mise à jour");
                loadQuestions();
              }
            }
            
            // Rouvrir une question
            else if (e.target.classList.contains('btn-reopen')) {
              await questionRef.update({ status: 'new' });
              showToast("Question rouverte");
              loadQuestions();
            }
            
          } catch (error) {
            console.error("Erreur:", error);
            showToast("Erreur de mise à jour", "error");
          }
        });

        // 6. FONCTIONS UTILITAIRES
        function getCategoryName(categoryId) {
            const category = categories.find(cat => cat.id === categoryId);
            return category ? category.name : categoryId;
        }

        function populateCategorySelects() {
            // Pour le filtre catégorie
            const filterSelect = document.getElementById('filter-category');
            filterSelect.innerHTML = '<option value="all">Toutes catégories</option>' +
                categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
        }

        function getStatusName(status) {
          return {
            new: "Nouvelle",
            selected: "Sélectionnée",
            answered: "Répondu"
          }[status] || status;
        }

        function formatDate(date) {
          if (!date) return "";
          return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }

        function showToast(message, type = "success") {
          const toast = document.createElement('div');
          toast.className = `toast ${type === "error" ? "toast-error" : ""}`;
          toast.textContent = message;
          document.body.appendChild(toast);
          
          setTimeout(() => toast.remove(), 3000);
        }

        // 7. DÉCONNEXION
        document.getElementById('logout-btn').addEventListener('click', () => {
          auth.signOut().then(() => {
            window.location.href = "login.html";
          });
        });

        // 8. FILTRES
        document.getElementById('filter-status').addEventListener('change', () => {
            currentPage = 1; // Réinitialiser à la première page
            loadQuestions();
        });
        document.getElementById('filter-category').addEventListener('change', () => {
            currentPage = 1; // Réinitialiser à la première page
            loadQuestions();
        });

        let searchTimer;
        document.getElementById('search').addEventListener('input', () => {
            currentPage = 1; // Réinitialiser à la première page
            clearTimeout(searchTimer);
            searchTimer = setTimeout(loadQuestions, 500);
        });

        // 9. BOUTON 'DETAILS'
        function setupDetailsButton(button, questionId, questionData) {
          button.addEventListener('click', () => {
            // Crée une modal avec les détails complets
            const modal = document.createElement('div');
            modal.className = 'question-modal';
            
            modal.innerHTML = `
              <div class="modal-content">
                <h3>Détails de la question</h3>
                
                <div class="meta-section">
                  <p><strong>Auteur :</strong> ${questionData.author || "Anonyme"}</p>
                  <p><strong>Date :</strong> ${new Date(questionData.createdAt?.toDate()).toLocaleString('fr-FR')}</p>
                  <p><strong>Catégorie :</strong> ${getCategoryName(questionData.category)}</p>
                  <p><strong>Votes :</strong> ${questionData.votes || 0}</p>
                </div>
                
                <div class="question-text-detail">
                  ${formatQuestionText(questionData.text)}
                </div>
                
                <div class="action-buttons">
                  <button class="btn-edit">✏️ Modifier</button>
                  <button class="btn-delete">🗑️ Supprimer</button>
                  <button class="btn-close">Fermer</button>
                </div>
              </div>
            `;

            document.body.appendChild(modal);
            
            // Gestion des actions
            modal.querySelector('.btn-close').addEventListener('click', () => modal.remove());
            
            modal.querySelector('.btn-edit').addEventListener('click', () => {
              // Ouvrir un éditeur de texte
              const newText = prompt("Modifier la question:", questionData.text);
              if (newText && newText !== questionData.text) {
                updateQuestion(questionId, { text: newText });
              }
            });
            
            modal.querySelector('.btn-delete').addEventListener('click', () => {
              if (confirm("Supprimer définitivement cette question ?")) {
                deleteQuestion(questionId);
                modal.remove();
              }
            });
          });
        }

        // Fonctions utilitaires
        function formatQuestionText(text) {
          return text.replace(/\n/g, '<br>')
                    .replace(/https?:\/\/\S+/g, url => `<a href="${url}" target="_blank">${url}</a>`);
        }

        async function updateQuestion(id, updates) {
          try {
            await db.collection("questions").doc(id).update(updates);
            showToast("Question mise à jour");
            loadQuestions();
          } catch (error) {
            showToast("Erreur de mise à jour", "error");
          }
        }

        async function deleteQuestion(id) {
          try {
            await db.collection("questions").doc(id).delete();
            showToast("Question supprimée");
            loadQuestions();
          } catch (error) {
            showToast("Erreur de suppression", "error");
          }
        }

        // 10. INITIALISATION
        document.addEventListener('DOMContentLoaded', () => {
            initializeFirebase();
            loadCategories();
        });


        // Gestion des réponses multiples
        let currentEditingQuestion = null;

        // Ouvrir la modal de gestion
        function openResponseModal(questionId) {
          currentEditingQuestion = questionId;
          const modal = document.getElementById('response-management-modal');
          modal.classList.add('active');
          loadResponses(questionId);
        }

        // Fermer la modal
        function closeResponseModal() {
          const modal = document.getElementById('response-management-modal');
          modal.classList.remove('active');
        }

        // Charger les réponses
        async function loadResponses(questionId) {
          const docRef = doc(db, "questions", questionId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const responses = docSnap.data().responses || [];
            renderResponseList(responses);
          }
        }

        // Afficher la liste des réponses
        function renderResponseList(responses) {
          const container = document.getElementById('response-list');
          container.innerHTML = responses.map((res, index) => `
            <div class="response-item" data-index="${index}">
              <div>
                <strong>${res.title}</strong><br>
                <a href="${res.videoUrl}" target="_blank">${res.videoUrl}</a>
              </div>
              <div class="response-actions">
                <button class="btn btn-warning edit-response">✏️</button>
                <button class="btn btn-danger delete-response">🗑️</button>
              </div>
            </div>
          `).join('');
        }

        // Ajouter une réponse
        async function addResponse() {
          const title = document.getElementById('response-title').value;
          const url = document.getElementById('response-url').value;
          
          if (!title || !url) {
            alert("Veuillez remplir tous les champs");
            return;
          }

          const questionRef = doc(db, "questions", currentEditingQuestion);
          await updateDoc(questionRef, {
            responses: arrayUnion({
              videoUrl: url,
              title: title,
              createdAt: serverTimestamp()
            }),
            status: "answered"
          });

          // Recharger et réinitialiser
          loadResponses(currentEditingQuestion);
          document.getElementById('response-title').value = '';
          document.getElementById('response-url').value = '';
        }

        // Supprimer une réponse
        async function deleteResponse(index) {
          const questionRef = doc(db, "questions", currentEditingQuestion);
          const questionSnap = await getDoc(questionRef);
          const responses = [...questionSnap.data().responses];
          
          responses.splice(index, 1);
          
          await updateDoc(questionRef, {
            responses: responses
          });
          
          loadResponses(currentEditingQuestion);
        }

        // Écouteurs d'événements
        document.addEventListener('click', (e) => {
          // Ouvrir la modal quand on clique sur "Détails"
          if (e.target.classList.contains('btn-view')) {
            const questionId = e.target.closest('.question-card').dataset.id;
            openResponseModal(questionId);
          }

          // Fermer la modal
          if (e.target.classList.contains('btn-close')) {
            closeResponseModal();
          }

          // Ajouter une réponse
          if (e.target.id === 'add-response-btn') {
            addResponse();
          }

          // Supprimer une réponse
          if (e.target.classList.contains('delete-response')) {
            const index = e.target.closest('.response-item').dataset.index;
            if (confirm("Supprimer cette réponse ?")) {
              deleteResponse(index);
            }
          }
        });