// Import des fonctions nécessaires
    import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
    import { 
      getFirestore, 
      collection, 
      query, 
      orderBy, 
      limit, 
      getDocs,
      addDoc,
      doc,
      updateDoc,
      serverTimestamp,
      increment
    } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
    import { firebaseConfig } from './firebase-init.js';

    // Initialisation PRINCIPALE (à faire une seule fois)
      // if (!firebase.apps.length) {
      //   firebase.initializeApp(firebaseConfig);
      // }

    // Initialisation
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    let categories = [];

    // Référence à la collection
    const questionsRef = collection(db, "questions");

    // Gestion du formulaire
    const form = document.getElementById('question-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const questionData = {
            author: document.getElementById('author').value || "Anonyme",
            category: document.getElementById('category').value,
            text: document.getElementById('question').value,
            votes: 0,
            status: "new",
            responses: [],
            createdAt: serverTimestamp()
        };

        try {
            await addDoc(questionsRef, questionData);
            document.getElementById('question-form').reset();
            showToast("📨 Question transmise au pasteur. Vous la verrez apparaître une fois répondue.");
            loadQuestions().then(setupVoteButtons);
        } catch (error) {
            console.error("Erreur:", error);
            showToast("Erreur lors de l'envoi", "error");
        }
    });

    // Demander la permission et s'abonner
    // async function subscribeToNotifications() {
    //   if (!('serviceWorker' in navigator)) return;

    //   const sw = await navigator.serviceWorker.register('/sw.js');
    //   const subscription = await sw.pushManager.subscribe({
    //     userVisibleOnly: true,
    //     applicationServerKey: 'BAJaEyB-JB257cR3KxQWaDHtcN19Qxlr-uWRFQD4WkJS4i3hDyGlnewr6U71A_hyMrU0R4AsiacN1gzXWBpJGCI' // À générer
    //   });

    //   // Enregistrer l'abonnement dans Firestore
    //   await db.collection('subscriptions').add(subscription.toJSON());
    // }

    // // Bouton pour déclencher l'abonnement
    // document.getElementById('enable-notifs').addEventListener('click', subscribeToNotifications);

    // Variables globales
    let currentPage = 1;
    const questionsPerPage = 10;
    let searchTerm = '';
    let categoryFilter = 'all';

    // Écouteurs pour les filtres
    document.getElementById('filter-category').addEventListener('change', (e) => {
        categoryFilter = e.target.value;
        loadQuestions();
    });

    document.getElementById('search-questions').addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        loadQuestions();
    });

    function populateCategorySelects() {
        // Pour le formulaire principal
        const categorySelect = document.getElementById('category');
        categorySelect.innerHTML = '<option value="">-- Choisissez une catégorie --</option>' +
            categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');

        // Pour le filtre
        const filterSelect = document.getElementById('filter-category');
        filterSelect.innerHTML = '<option value="all">Toutes catégories</option>' +
            categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    }

    // Appeler loadCategories au chargement
    //document.addEventListener('DOMContentLoaded', loadCategories);
    document.addEventListener('DOMContentLoaded', () => {
        loadCategories();
        loadQuestions().then(() => {
            setupAdminToggle();
            setupVoteButtons();
        });
    });


    // Modifiez la fonction loadQuestions pour gérer la pagination

    async function loadQuestions(page = 1) {
        currentPage = page;
        const questionsList = document.getElementById('questions-list');
        questionsList.innerHTML = '<div class="loading">Chargement...</div>';
        
        try {
            const q = query(
                collection(db, "questions"),
               // where("status", "==", "answered"), // ← FILTRE IMPORTANT
                orderBy("createdAt", "desc")
            );

            const querySnapshot = await getDocs(q);
            questionsList.innerHTML = '';

            if (querySnapshot.empty) {
                questionsList.innerHTML = '<p>Aucune question pour le moment.</p>';
                return;
            }
            
            // Filtrage côté client
            const allQuestions = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const matchesCategory = categoryFilter === 'all' || data.category === categoryFilter;
                const matchesSearch = !searchTerm || 
                                    data.text.toLowerCase().includes(searchTerm) || 
                                    (data.author && data.author.toLowerCase().includes(searchTerm));
                
                if (matchesCategory && matchesSearch) {
                    allQuestions.push({ id: doc.id, ...data });
                }
            });

            // Pagination
            const startIndex = (page - 1) * questionsPerPage;
            const endIndex = startIndex + questionsPerPage;
            const paginatedQuestions = allQuestions.slice(startIndex, endIndex);

            // Affichage
            function ensureAbsoluteUrl(url) {
                // Si l'URL ne commence pas par http:// ou https://
                if (!/^https?:\/\//i.test(url)) {
                    return 'https://' + url; // Force en HTTPS
                }
                return url;
            }

            await renderQuestionsWithThumbnails(paginatedQuestions);

            // paginatedQuestions.forEach((data) => {
            //     const questionElement = document.createElement('div');
            //     questionElement.className = `question ${data.status === "answered" ? "answered" : ""}`;
            //     questionElement.dataset.id = data.id;
                
            //     questionElement.innerHTML = `
            //         <h3>${data.text}</h3>
            //         <div class="meta">
            //             Catégorie: ${getCategoryName(data.category)} • 
            //             Posée par: ${data.author || "Anonyme"} • 
            //             <span class="vote-count">${data.votes || 0}</span> votes •
            //             ${formatDate(data.createdAt?.toDate())}
            //         </div>
            //         ${data.status === "answered" ? 
            //             data.responses && data.responses.length > 0 ?
            //                 data.responses.map((res, i) => `
            //                     <div class="response">
            //                         <a href="${ensureAbsoluteUrl(res.videoUrl)}" target="_blank" rel="noopener noreferrer">
            //                             Voir réponse ${i+1}: ${res.title || 'Sans titre'}
            //                         </a>
            //                     </div>
            //                 `).join('')
            //             : `<a href="${ensureAbsoluteUrl(data.videoLink || "#")}" target="_blank" rel="noopener noreferrer" class="video-link">Voir la réponse</a>`
            //         : `<button class="vote-btn" data-id="${data.id}">👍 Soutenir</button>`}
            //     `;
                
            //     questionsList.appendChild(questionElement);
            // });

            // paginatedQuestions.forEach((data) => {
            //     const questionElement = document.createElement('div');
            //     questionElement.className = `question ${data.status === "answered" ? "answered" : ""}`;
            //     questionElement.dataset.id = data.id;

            //     // MASQUER les questions sans réponse
            //     if (data.status !== 'answered') {
            //         questionElement.style.display = 'none';
            //         questionElement.classList.add('pending-question');
            //     }
                
            //     questionElement.innerHTML = `
            //         <h3>${data.text}</h3>
            //         <div class="meta">
            //             Catégorie: ${getCategoryName(data.category)} • 
            //             Posée par: ${data.author || "Anonyme"} •
            //             ${formatDate(data.createdAt?.toDate())}
            //         </div>
            //         ${data.status === "answered" ? 
            //             data.responses && data.responses.length > 0 ?
            //                 `<div class="youtube-responses">
            //                     ${data.responses.map((res, i) => 
            //                         createYouTubeThumbnail(res.videoUrl, res.title, i)
            //                     ).join('')}
            //                 </div>`
            //             : `<a href="${ensureAbsoluteUrl(data.videoLink || "#")}" target="_blank" class="video-link">Voir la réponse</a>`
            //         : ``}
            //     `;
                
            //     questionsList.appendChild(questionElement);
            // });

            // paginatedQuestions.forEach((data) => {
            //     const questionElement = document.createElement('div');
            //     questionElement.className = `question ${data.status === "answered" ? "answered" : ""}`;
            //     questionElement.dataset.id = data.id;

            //     // MASQUER les questions sans réponse
            //     if (data.status !== 'answered') {
            //         questionElement.style.display = 'none';
            //         questionElement.classList.add('pending-question');
            //     }

            //     questionElement.innerHTML = `
            //         <h3>${data.text}</h3>
            //         <div class="meta">
            //             Catégorie: ${getCategoryName(data.category)} • 
            //             Posée par: ${data.author || "Anonyme"} •
            //             ${formatDate(data.createdAt?.toDate())}
            //         </div>
            //         ${data.status === "answered" ? 
            //             data.responses && data.responses.length > 0 ?
            //                 data.responses.map((res, i) => `
            //                     <div class="response">
            //                         <a href="${ensureAbsoluteUrl(res.videoUrl)}" target="_blank" rel="noopener noreferrer">
            //                             Voir réponse ${i+1}: ${res.title || 'Sans titre'}
            //                         </a>
            //                     </div>
            //                 `).join('')
            //             : `<a href="${ensureAbsoluteUrl(data.videoLink || "#")}" target="_blank" rel="noopener noreferrer" class="video-link">Voir la réponse</a>`
            //         : `<span class="pending-badge">⏳ En attente de réponse</span>`}
            //     `;
                
            //     questionsList.appendChild(questionElement);
            // });
                
            //     questionElement.innerHTML = `
            //         <h3>${data.text}</h3>
            //         <div class="meta">
            //             Catégorie: ${getCategoryName(data.category)} • 
            //             Posée par: ${data.author || "Anonyme"} •
            //             ${formatDate(data.createdAt?.toDate())}
            //         </div>
            //         ${data.status === "answered" ? 
            //             data.responses && data.responses.length > 0 ?
            //                 data.responses.map((res, i) => `
            //                     <div class="response">
            //                         <a href="${ensureAbsoluteUrl(res.videoUrl)}" target="_blank" rel="noopener noreferrer">
            //                             Voir réponse ${i+1}: ${res.title || 'Sans titre'}
            //                         </a>
            //                     </div>
            //                 `).join('')
            //             : `<a href="${ensureAbsoluteUrl(data.videoLink || "#")}" target="_blank" rel="noopener noreferrer" class="video-link">Voir la réponse</a>`
            //         : ``}
            //     `;
                
            //     questionsList.appendChild(questionElement);
            // });

            // Ajout de la pagination
            renderPagination(allQuestions.length);
            
        } catch (error) {
            console.error("Erreur de chargement:", error);
            questionsList.innerHTML = '<p>Erreur lors du chargement des questions</p>';
        }
    }

    // Fonction pour basculer l'affichage des questions en attente
    function setupAdminToggle() {
        const adminView = document.createElement('div');
        adminView.className = 'admin-view';
        adminView.innerHTML = `
            <button id="toggle-pending" class="btn btn-secondary">
                👁️ Voir les questions en attente
            </button>
        `;
        
        const questionsList = document.getElementById('questions-list');
        questionsList.parentNode.insertBefore(adminView, questionsList);
        
        // Gestion du clic
        document.getElementById('toggle-pending').addEventListener('click', () => {
            const pendingQuestions = document.querySelectorAll('.pending-question');
            const button = document.getElementById('toggle-pending');
            
            pendingQuestions.forEach(question => {
                if (question.style.display === 'none') {
                    question.style.display = 'block';
                    button.textContent = '👁️ Masquer les questions en attente';
                } else {
                    question.style.display = 'none';
                    button.textContent = '👁️ Voir les questions en attente';
                }
            });
        });
    }

    // Fonction pour afficher la pagination
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
            prevBtn.onclick = () => loadQuestions(currentPage - 1);
            pagination.appendChild(prevBtn);
        }

        // Pages
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            if (i === currentPage) {
                pageBtn.style.fontWeight = 'bold';
                pageBtn.style.backgroundColor = '#006C67';
                pageBtn.style.color = 'white';
            }
            pageBtn.onclick = () => loadQuestions(i);
            pagination.appendChild(pageBtn);
        }

        // Bouton Suivant
        if (currentPage < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.textContent = 'Suivant →';
            nextBtn.onclick = () => loadQuestions(currentPage + 1);
            pagination.appendChild(nextBtn);
        }

        const questionsList = document.getElementById('questions-list');
        questionsList.appendChild(pagination);
    }

    // Formatage date
    function formatDate(date) {
        if (!date) return "";
        
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return `à l'instant`;
        }
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
        }
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
        }
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return `il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
        }
        
        const diffInWeeks = Math.floor(diffInDays / 7);
        if (diffInWeeks < 4) {
            return `il y a ${diffInWeeks} semaine${diffInWeeks > 1 ? 's' : ''}`;
        }
        
        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) {
            return `il y a ${diffInMonths} mois`;
        }
        
        const diffInYears = Math.floor(diffInMonths / 12);
        return `il y a ${diffInYears} an${diffInYears > 1 ? 's' : ''}`;
    }

    // Gestion des votes (délégation d'événements)
    async function handleVote(questionId) {
      try {
        const questionRef = doc(db, "questions", questionId);
        await updateDoc(questionRef, {
          votes: increment(1)
        });
        console.log("Vote enregistré");
        return true;
      } catch (error) {
        console.error("Erreur de vote:", error);
        return false;
      }
    }

    async function setupVoteButtons() {
      document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('vote-btn')) {
          const questionId = e.target.dataset.id;
          try {
            // Utilisez FieldValue.increment() pour des updates atomiques
            await updateDoc(doc(db, "questions", questionId), {
              votes: firebase.firestore.FieldValue.increment(1)
            });
            
            // Mise à jour visuelle immédiate
            const voteCount = e.target.closest('.question').querySelector('.vote-count');
            if (voteCount) {
              voteCount.textContent = parseInt(voteCount.textContent) + 1;
            }
            e.target.disabled = true;
            
          } catch (error) {
            console.error("Erreur de vote:", error);
            showToast("Échec du vote", "error");
          }
        }
      });
    }

    // Gestion du clic optimisée
    document.addEventListener('click', async (e) => {
      if (e.target.classList.contains('vote-btn')) {
        const questionId = e.target.dataset.id;
        const questionElement = e.target.closest('.question');
        
        // Mise à jour optimiste UI
        const voteCountElement = questionElement.querySelector('.vote-count');
        const originalCount = parseInt(voteCountElement.textContent);
        voteCountElement.textContent = originalCount + 1;
        e.target.disabled = true;
        e.target.textContent = "👍 En cours...";
        
        // Envoi au serveur
        const success = await handleVote(questionId);
        
        // Gestion du résultat
        if (success) {
          e.target.textContent = "👍 Merci !";
        } else {
          voteCountElement.textContent = originalCount; // Rollback
          e.target.disabled = false;
          e.target.textContent = "👍 Soutenir";
          alert("Impossible d'enregistrer votre vote. Rechargez la page et réessayez.");
        }
      }
    });

    // Fonctions utilitaires
    // Charger les catégories au démarrage
    async function loadCategories() {
        const response = await fetch('question-cat-list.json');
        categories = await response.json();
        populateCategorySelects();
    }

    function getCategoryName(categoryId) {
        const category = categories.find(cat => cat.id === categoryId);
        return category ? category.name : categoryId;
    }

    function showToast(message, type = "success") {
        const toast = document.createElement('div');
        toast.className = `toast ${type === "error" ? "toast-error" : ""}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Fonction pour extraire l'ID YouTube depuis une URL
    function getYouTubeId(url) {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    // Fonction pour générer l'embed YouTube
    // Fonction améliorée avec récupération du titre
    async function createYouTubeThumbnail(videoUrl, title, index) {
        const videoId = getYouTubeId(videoUrl);
        if (!videoId) {
            return `<a href="${videoUrl}" target="_blank" class="video-link">Voir réponse ${index + 1}</a>`;
        }

        // Si un titre personnalisé est fourni par l'admin, on l'utilise
        const displayTitle = title && title !== 'Sans titre' ? title : await getYouTubeTitle(videoId);

        return `
            <div class="youtube-thumbnail" onclick="openYouTubeVideo('${videoId}')">
                <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" 
                     alt="Miniature ${displayTitle}" 
                     class="thumbnail-image"
                     loading="lazy">
                <div class="play-button">▶</div>
                <div class="video-info">
                    <span class="video-title">${displayTitle}</span>
                    <!-- <span class="video-title">${displayTitle} - Partie ${index + 1}</span> -->
                    <span class="watch-text">Regarder sur YouTube</span>
                </div>
            </div>
        `;
    }

    // Fonction pour récupérer le titre YouTube via l'API
    // async function getYouTubeTitle(videoId) {
    //     try {
    //         // Version sans clé API (limité)
    //         const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    //         const data = await response.json();
    //         return data.title || 'Titre non disponible';
    //     } catch (error) {
    //         console.error('Erreur récupération titre YouTube:', error);
    //         return 'Titre non disponible';
    //     }
    // }

    // Cache pour les titres YouTube
    const youtubeTitleCache = new Map();

    async function getYouTubeTitle(videoId) {
        // Vérifier le cache d'abord
        if (youtubeTitleCache.has(videoId)) {
            return youtubeTitleCache.get(videoId);
        }

        try {
            const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
            const data = await response.json();
            
            const title = data.title || 'Titre non disponible';
            
            // Mettre en cache
            youtubeTitleCache.set(videoId, title);
            
            return title;
        } catch (error) {
            console.error('Erreur récupération titre:', error);
            return 'Titre non disponible';
        }
    }

    // Fonction pour ouvrir la vidéo (à ajouter)
    // function openYouTubeVideo(videoId) {
    //     window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
    // }
    window.openYouTubeVideo = function(videoId) {
        window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
    };

    // Nouvelle fonction d'affichage asynchrone
    async function renderQuestionsWithThumbnails(questions) {
        const questionsList = document.getElementById('questions-list');
        questionsList.innerHTML = '';

        for (const data of questions) {
            const questionElement = document.createElement('div');
            questionElement.className = `question ${data.status === "answered" ? "answered" : ""}`;
            questionElement.dataset.id = data.id;

            //MASQUER les questions sans réponse
                if (data.status !== 'answered') {
                    questionElement.style.display = 'none';
                    questionElement.classList.add('pending-question');
                }
            
            let responsesHTML = '';
            
            if (data.status === "answered" && data.responses && data.responses.length > 0) {
                // Générer les miniatures pour chaque réponse
                const thumbnails = [];
                for (let i = 0; i < data.responses.length; i++) {
                    const res = data.responses[i];
                    const thumbnail = await createYouTubeThumbnail(res.videoUrl, res.title, i);
                    thumbnails.push(thumbnail);
                }
                responsesHTML = `<div class="youtube-responses">${thumbnails.join('')}</div>`;
            }
            
            questionElement.innerHTML = `
                <h3>${data.text}</h3>
                <div class="meta">
                    Catégorie: ${getCategoryName(data.category)} • 
                    Posée par: ${data.author || "Anonyme"}
                </div>
                <!-- <div class="meta">
                    Catégorie: ${getCategoryName(data.category)} • 
                    Posée par: ${data.author || "Anonyme"} •
                    ${formatDate(data.createdAt?.toDate())}
                </div> -->
                ${responsesHTML}
            `;
            
            questionsList.appendChild(questionElement);
        }
    }

    // Chargement initial
   // loadQuestions();