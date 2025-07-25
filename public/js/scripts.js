// Gestion explicite de l'installation
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Crée un bouton d'installation visible
      const installBtn = document.createElement('button');
      installBtn.textContent = 'Installer l\'app';
      installBtn.className = 'install-button';
      installBtn.onclick = installApp;
      document.body.appendChild(installBtn);
    });

    async function installApp() {
      if (!deferredPrompt) return;
      
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('Installation acceptée');
        document.querySelector('.install-button')?.remove();
      }
      deferredPrompt = null;
    }

    // Style minimal pour le bouton
    const style = document.createElement('style');
    style.textContent = `
      .install-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        background: #4a6fa5;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        z-index: 9999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      }
    `;
    document.head.appendChild(style);

    // Détection iOS + Statut d'installation
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      // Vérifie si l'app n'est PAS en mode standalone (donc pas encore installée)
      if (!window.navigator.standalone) {
        const iosBanner = document.createElement('div');
        iosBanner.id = 'ios-install-banner';
        iosBanner.innerHTML = `
          <div style="
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #4a6fa5;
            color: white;
            padding: 15px;
            text-align: center;
            z-index: 9999;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.2);
            animation: slideUp 0.5s ease-out;
          ">
            📲 Installer l'application :<br>
            <small>Appuyez sur <img src="share-icon.png" style="height:18px;vertical-align:middle"> puis "Sur l'écran d'accueil"</small>
            <button id="close-ios-banner" style="
              position: absolute;
              top: 5px;
              right: 10px;
              background: transparent;
              border: none;
              color: white;
              font-size: 18px;
            ">×</button>
          </div>
          <style>
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          </style>
        `;

        document.body.appendChild(iosBanner);
        
        // Bouton de fermeture
        document.getElementById('close-ios-banner').onclick = () => {
          iosBanner.style.transform = 'translateY(100%)';
          setTimeout(() => iosBanner.remove(), 500);
        };
        
        // Fermeture automatique après 30s
        setTimeout(() => {
          if (iosBanner.parentNode) {
            iosBanner.style.transform = 'translateY(100%)';
            setTimeout(() => iosBanner.remove(), 500);
          }
        }, 5000);
      }
    }