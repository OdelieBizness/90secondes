// Charger les questions depuis Firestore
// function loadQuestions() {
//   db.collection("questions")
//     .orderBy("createdAt", "desc")
//     .limit(10)
//     .get()
//     .then((querySnapshot) => {
//       const questionsList = document.getElementById("questions-list");
//       questionsList.innerHTML = "";
      
//       querySnapshot.forEach((doc) => {
//         const data = doc.data();
//         const questionElement = document.createElement("div");
//         questionElement.className = `question ${data.status === "answered" ? "answered" : ""}`;
//         questionElement.dataset.id = doc.id;
        
//         questionElement.innerHTML = `
//           <h3>${data.text}</h3>
//           <div class="meta">Catégorie: ${getCategoryName(data.category)} • 
//             Posée par: ${data.author || "Anonyme"} • 
//             ${data.votes || 0} vote${data.votes !== 1 ? "s" : ""}</div>
//           ${data.status === "answered" ? 
//             `<a href="${data.videoLink || "#"}" target="_blank">Voir la réponse en vidéo</a>` : 
//             `<button class="vote-btn">👍 Soutenir cette question</button>`}
//         `;
        
//         questionsList.appendChild(questionElement);
//       });
//     })
//     .catch((error) => {
//       console.error("Error loading questions: ", error);
//     });
// }

// Helper pour les noms de catégories
function getCategoryName(categoryId) {
  const categories = {
    "vie-spirituelle": "Vie spirituelle",
    "relations": "Relations & Amour",
    "famille": "Famille",
    "finances": "Finances",
    "bible": "Bible & Doctrine",
    "ministere": "Appel & Ministère",
    "epreuves": "Doutes & Épreuves"
  };
  return categories[categoryId] || categoryId;
}

// Envoyer une nouvelle question
document.getElementById("question-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const author = document.getElementById("author").value || "Anonyme";
  const category = document.getElementById("category").value;
  const questionText = document.getElementById("question").value;
  
  try {
    await db.collection("questions").add({
      author: author,
      category: category,
      text: questionText,
      votes: 0,
      status: "new",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    document.getElementById("question-form").reset();
    alert("Merci pour votre question ! Pasteur D y répondra peut-être dans une prochaine vidéo.");
    loadQuestions(); // Recharger la liste
  } catch (error) {
    console.error("Error adding question: ", error);
    alert("Une erreur s'est produite. Veuillez réessayer.");
  }
});

// Gérer les votes
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("vote-btn")) {
    const questionId = e.target.closest(".question").dataset.id;
    
    try {
      const questionRef = db.collection("questions").doc(questionId);
      await questionRef.update({
        votes: firebase.firestore.FieldValue.increment(1)
      });
      
      e.target.textContent = "👍 Merci pour votre vote !";
      e.target.disabled = true;
      loadQuestions(); // Recharger pour voir le nouveau nombre de votes
    } catch (error) {
      console.error("Error updating vote: ", error);
    }
  }
});

// Charger les questions au démarrage
window.addEventListener("DOMContentLoaded", loadQuestions);